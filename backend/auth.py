"""Auth module — Multi-DM PIN-based sessions backed by SQLite."""

from __future__ import annotations

import secrets
import time
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from fastapi import Depends, Header, HTTPException, Request
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
import bcrypt

from database import async_session
from models import DM, AuthSession

SESSION_TTL = 86400  # 24 hours
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_SECONDS = 300  # 5 minutes

_failed_attempts: dict[str, int] = {}
_locked_until: dict[str, float] = {}


def hash_pin(pin: str) -> str:
    return bcrypt.hashpw(pin.encode(), bcrypt.gensalt()).decode()


def verify_pin(pin: str, hashed: str) -> bool:
    return bcrypt.checkpw(pin.encode(), hashed.encode())


def check_lockout(ip: str) -> bool:
    now = time.time()
    locked = _locked_until.get(ip, 0.0)
    if locked > now:
        return True
    if locked > 0 and locked <= now:
        _locked_until.pop(ip, None)
        _failed_attempts.pop(ip, None)
    return False


def record_failed_attempt(ip: str):
    _failed_attempts[ip] = _failed_attempts.get(ip, 0) + 1
    if _failed_attempts[ip] >= MAX_FAILED_ATTEMPTS:
        _locked_until[ip] = time.time() + LOCKOUT_SECONDS
        _failed_attempts.pop(ip, None)


def clear_failed_attempts(ip: str):
    _failed_attempts.pop(ip, None)


async def is_any_dm_set() -> bool:
    async with async_session() as db:
        result = await db.execute(select(DM).limit(1))
        return result.scalar_one_or_none() is not None


async def get_dm_by_id(dm_id: str) -> Optional[DM]:
    async with async_session() as db:
        result = await db.execute(select(DM).where(DM.id == dm_id))
        return result.scalar_one_or_none()


async def create_dm(name: str, pin: str) -> DM:
    async with async_session() as db:
        dm = DM(name=name, pin_hash=hash_pin(pin))
        db.add(dm)
        await db.commit()
        await db.refresh(dm)
        return dm


async def list_dms() -> list[DM]:
    async with async_session() as db:
        result = await db.execute(select(DM).order_by(DM.created_at))
        return list(result.scalars().all())


async def change_dm_pin(dm_id: str, new_pin: str) -> bool:
    async with async_session() as db:
        result = await db.execute(select(DM).where(DM.id == dm_id))
        dm = result.scalar_one_or_none()
        if not dm:
            return False
        dm.pin_hash = hash_pin(new_pin)
        await db.execute(delete(AuthSession).where(AuthSession.dm_id == dm_id))
        await db.commit()
        return True


async def delete_dm(dm_id: str) -> bool:
    async with async_session() as db:
        result = await db.execute(select(DM).where(DM.id == dm_id))
        dm = result.scalar_one_or_none()
        if not dm:
            return False
        await db.execute(delete(AuthSession).where(AuthSession.dm_id == dm_id))
        await db.delete(dm)
        await db.commit()
        return True


async def verify_dm_pin(dm_id: str, pin: str) -> bool:
    dm = await get_dm_by_id(dm_id)
    if not dm:
        return False
    return verify_pin(pin, dm.pin_hash)


async def create_session(dm_id: str, role: str = "dm", campaign_id: Optional[str] = None) -> AuthSession:
    token = secrets.token_urlsafe(32)
    now = datetime.utcnow()
    async with async_session() as db:
        session = AuthSession(
            token=token,
            dm_id=dm_id,
            role=role,
            created_at=now,
            last_seen=now,
            campaign_id=campaign_id,
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
        return session


async def get_session(token: str) -> Optional[AuthSession]:
    async with async_session() as db:
        result = await db.execute(
            select(AuthSession).where(AuthSession.token == token)
        )
        session = result.scalar_one_or_none()
        if not session:
            return None
        if datetime.utcnow() - session.created_at > timedelta(seconds=SESSION_TTL):
            await db.delete(session)
            await db.commit()
            return None
        session.last_seen = datetime.utcnow()
        await db.commit()
        return session


async def delete_session(token: str):
    async with async_session() as db:
        await db.execute(delete(AuthSession).where(AuthSession.token == token))
        await db.commit()


async def invalidate_all_dm_sessions(dm_id: str):
    async with async_session() as db:
        await db.execute(delete(AuthSession).where(AuthSession.dm_id == dm_id))
        await db.commit()


async def get_active_sessions() -> list[dict]:
    async with async_session() as db:
        result = await db.execute(select(AuthSession))
        sessions = result.scalars().all()
        now = datetime.utcnow()
        active = []
        for s in sessions:
            if now - s.created_at <= timedelta(seconds=SESSION_TTL):
                dm_result = await db.execute(select(DM).where(DM.id == s.dm_id))
                dm = dm_result.scalar_one_or_none()
                active.append({
                    "id": s.id,
                    "token": s.token[:8] + "...",
                    "dm_id": s.dm_id,
                    "dm_name": dm.name if dm else "Unknown",
                    "role": s.role,
                    "created_at": s.created_at.isoformat(),
                    "last_seen": s.last_seen.isoformat(),
                })
            else:
                await db.delete(s)
        await db.commit()
        return active


async def kill_session(session_id: str) -> bool:
    async with async_session() as db:
        result = await db.execute(select(AuthSession).where(AuthSession.id == session_id))
        session = result.scalar_one_or_none()
        if not session:
            return False
        await db.delete(session)
        await db.commit()
        return True


def extract_token(authorization: Optional[str] = Header(None)) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None


async def get_current_session(token: Optional[str] = Depends(extract_token)) -> AuthSession:
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session = await get_session(token)
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return session


async def require_dm(session: AuthSession = Depends(get_current_session)) -> AuthSession:
    if session.role != "dm":
        raise HTTPException(status_code=403, detail="DM access required")
    return session
