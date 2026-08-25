"""Auth routes — PIN-based DM authentication."""

from __future__ import annotations

import time
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from auth import (
    check_lockout,
    clear_failed_attempts,
    create_session,
    delete_session,
    get_current_session,
    get_pin_hash,
    hash_pin,
    is_pin_set,
    record_failed_attempt,
    require_dm,
    save_pin_hash,
    verify_pin,
    Session,
)

router = APIRouter(prefix="/auth", tags=["auth"])


class PinSetRequest(BaseModel):
    pin: str = Field(..., min_length=4, max_length=8, pattern=r"^\d+$")


class PinLoginRequest(BaseModel):
    pin: str = Field(..., min_length=4, max_length=8, pattern=r"^\d+$")


class SessionInfo(BaseModel):
    token: str
    role: str
    created_at: float
    last_seen: float
    campaign_id: str | None = None
    pin_set: bool


class LoginResponse(BaseModel):
    token: str
    role: str
    pin_set: bool


@router.get("/status")
async def auth_status():
    return {"pin_set": is_pin_set()}


@router.post("/setup", response_model=LoginResponse)
async def setup_pin(body: PinSetRequest, request: Request):
    """First-time PIN setup. Creates DM session."""
    if is_pin_set():
        raise HTTPException(status_code=400, detail="PIN already set. Use /auth/login.")

    ip = request.client.host if request.client else "unknown"
    if check_lockout(ip):
        raise HTTPException(status_code=429, detail="Too many attempts. Try later.")

    hashed = hash_pin(body.pin)
    save_pin_hash(hashed)
    session = create_session(role="dm")
    clear_failed_attempts(ip)

    return LoginResponse(
        token=session.token,
        role=session.role,
        pin_set=True,
    )


@router.post("/login", response_model=LoginResponse)
async def login(body: PinLoginRequest, request: Request):
    """Login with PIN. Returns session token."""
    ip = request.client.host if request.client else "unknown"

    if check_lockout(ip):
        raise HTTPException(status_code=429, detail="Too many attempts. Try later.")

    stored_hash = get_pin_hash()
    if not stored_hash:
        raise HTTPException(status_code=400, detail="No PIN set. Use /auth/setup.")

    if not verify_pin(body.pin, stored_hash):
        record_failed_attempt(ip)
        raise HTTPException(status_code=401, detail="Invalid PIN.")

    clear_failed_attempts(ip)
    session = create_session(role="dm")

    return LoginResponse(
        token=session.token,
        role=session.role,
        pin_set=True,
    )


@router.get("/me", response_model=SessionInfo)
async def get_me(session: Session = Depends(get_current_session)):
    """Get current session info."""
    return SessionInfo(
        token=session.token,
        role=session.role,
        created_at=session.created_at,
        last_seen=session.last_seen,
        campaign_id=session.campaign_id,
        pin_set=is_pin_set(),
    )


@router.post("/logout")
async def logout(session: Session = Depends(get_current_session)):
    """Logout — invalidate session."""
    delete_session(session.token)
    return {"ok": True}
