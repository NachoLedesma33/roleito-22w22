"""Auth routes — Multi-DM PIN-based authentication."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from auth import (
    AuthSession,
    check_lockout,
    clear_failed_attempts,
    create_dm,
    create_session,
    delete_dm,
    delete_session,
    get_active_sessions,
    get_current_session,
    get_dm_by_id,
    is_any_dm_set,
    kill_session,
    list_dms,
    record_failed_attempt,
    require_dm,
    verify_dm_pin,
)
from database import async_session as get_db
from sqlalchemy import select
from models import DM

router = APIRouter(prefix="/auth", tags=["auth"])


class DMCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    pin: str = Field(..., min_length=4, max_length=8, pattern=r"^\d+$")


class PinLoginRequest(BaseModel):
    dm_id: str
    pin: str = Field(..., min_length=4, max_length=8, pattern=r"^\d+$")


class PinChangeRequest(BaseModel):
    current_pin: str | None = None
    new_pin: str = Field(..., min_length=4, max_length=8, pattern=r"^\d+$")


class DMBrief(BaseModel):
    id: str
    name: str
    created_at: str


class SessionInfo(BaseModel):
    token: str
    role: str
    created_at: float
    last_seen: float
    campaign_id: str | None = None
    dm_id: str
    dm_name: str


class LoginResponse(BaseModel):
    token: str
    role: str
    dm_id: str
    dm_name: str


@router.get("/status")
async def auth_status():
    has_dms = await is_any_dm_set()
    return {"dms_registered": has_dms}


@router.get("/dms")
async def get_dms():
    dms = await list_dms()
    return [DMBrief(id=d.id, name=d.name, created_at=d.created_at.isoformat()) for d in dms]


@router.post("/register", response_model=LoginResponse)
async def register_dm(body: DMCreateRequest, request: Request):
    """Register a new DM with name + PIN. Creates session."""
    ip = request.client.host if request.client else "unknown"
    if check_lockout(ip):
        raise HTTPException(status_code=429, detail="Too many attempts. Try later.")

    dm = await create_dm(body.name, body.pin)
    clear_failed_attempts(ip)
    session = await create_session(dm.id)

    return LoginResponse(
        token=session.token,
        role=session.role,
        dm_id=dm.id,
        dm_name=dm.name,
    )


@router.post("/login", response_model=LoginResponse)
async def login(body: PinLoginRequest, request: Request):
    """Login with DM id + PIN. Returns session token."""
    ip = request.client.host if request.client else "unknown"
    if check_lockout(ip):
        raise HTTPException(status_code=429, detail="Too many attempts. Try later.")

    dm = await get_dm_by_id(body.dm_id)
    if not dm:
        raise HTTPException(status_code=404, detail="DM not found.")

    if not await verify_dm_pin(body.dm_id, body.pin):
        record_failed_attempt(ip)
        raise HTTPException(status_code=401, detail="Invalid PIN.")

    clear_failed_attempts(ip)
    session = await create_session(dm.id)

    return LoginResponse(
        token=session.token,
        role=session.role,
        dm_id=dm.id,
        dm_name=dm.name,
    )


@router.post("/change-pin", response_model=LoginResponse)
async def change_pin(body: PinChangeRequest, session: AuthSession = Depends(require_dm)):
    """Change PIN for current DM. Invalidates all sessions for this DM."""
    dm = await get_dm_by_id(session.dm_id)
    if not dm:
        raise HTTPException(status_code=404, detail="DM not found.")

    if body.current_pin is not None:
        if not await verify_dm_pin(session.dm_id, body.current_pin):
            raise HTTPException(status_code=401, detail="Invalid current PIN.")

    from auth import change_dm_pin
    await change_dm_pin(session.dm_id, body.new_pin)

    new_session = await create_session(dm.id)

    return LoginResponse(
        token=new_session.token,
        role=new_session.role,
        dm_id=dm.id,
        dm_name=dm.name,
    )


@router.get("/me", response_model=SessionInfo)
async def get_me(session: AuthSession = Depends(get_current_session)):
    """Get current session info."""
    dm = await get_dm_by_id(session.dm_id)
    return SessionInfo(
        token=session.token,
        role=session.role,
        created_at=session.created_at.timestamp(),
        last_seen=session.last_seen.timestamp(),
        campaign_id=session.campaign_id,
        dm_id=session.dm_id,
        dm_name=dm.name if dm else "Unknown",
    )


@router.post("/logout")
async def logout(session: AuthSession = Depends(get_current_session)):
    """Logout — invalidate session."""
    await delete_session(session.token)
    return {"ok": True}


@router.get("/sessions")
async def list_sessions(_session: AuthSession = Depends(require_dm)):
    """List active sessions."""
    return await get_active_sessions()


@router.delete("/sessions/{session_id}")
async def kill_user_session(session_id: str, _session: AuthSession = Depends(require_dm)):
    """Kill a specific session."""
    if not await kill_session(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    return {"ok": True}


@router.delete("/dms/{dm_id}")
async def remove_dm(dm_id: str, _session: AuthSession = Depends(require_dm)):
    """Delete a DM and all their sessions."""
    if not await delete_dm(dm_id):
        raise HTTPException(status_code=404, detail="DM not found")
    return {"ok": True}
