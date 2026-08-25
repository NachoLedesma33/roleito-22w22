"""Auth module — PIN-based session management + DM role enforcement."""

from __future__ import annotations

import secrets
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from fastapi import Depends, Header, HTTPException, Request
import bcrypt

PIN_HASH_PATH = Path(__file__).parent.parent / "data" / "pin_hash.txt"
SESSION_TTL = 86400  # 24 hours
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_SECONDS = 300  # 5 minutes


@dataclass
class Session:
    token: str
    role: str
    created_at: float
    last_seen: float
    campaign_id: Optional[str] = None
    failed_attempts: int = 0
    locked_until: float = 0.0


_store: dict[str, Session] = {}
_failed_attempts: dict[str, int] = {}
_locked_until: dict[str, float] = {}


def hash_pin(pin: str) -> str:
    return bcrypt.hashpw(pin.encode(), bcrypt.gensalt()).decode()


def verify_pin(pin: str, hashed: str) -> bool:
    return bcrypt.checkpw(pin.encode(), hashed.encode())


def get_pin_hash() -> Optional[str]:
    if PIN_HASH_PATH.exists():
        return PIN_HASH_PATH.read_text().strip()
    return None


def save_pin_hash(hashed: str):
    PIN_HASH_PATH.parent.mkdir(parents=True, exist_ok=True)
    PIN_HASH_PATH.write_text(hashed)


def is_pin_set() -> bool:
    return get_pin_hash() is not None


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


def create_session(role: str = "dm", campaign_id: Optional[str] = None) -> Session:
    token = secrets.token_urlsafe(32)
    now = time.time()
    session = Session(
        token=token,
        role=role,
        created_at=now,
        last_seen=now,
        campaign_id=campaign_id,
    )
    _store[token] = session
    return session


def get_session(token: str) -> Optional[Session]:
    session = _store.get(token)
    if not session:
        return None
    if time.time() - session.created_at > SESSION_TTL:
        _store.pop(token, None)
        return None
    session.last_seen = time.time()
    return session


def delete_session(token: str):
    _store.pop(token, None)


def extract_token(authorization: Optional[str] = Header(None)) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None


def get_current_session(token: Optional[str] = Depends(extract_token)) -> Session:
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session = get_session(token)
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return session


def require_dm(session: Session = Depends(get_current_session)) -> Session:
    if session.role != "dm":
        raise HTTPException(status_code=403, detail="DM access required")
    return session
