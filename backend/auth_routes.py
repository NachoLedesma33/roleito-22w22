"""Auth routes — Multi-DM PIN-based authentication."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

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
    invalidate_all_dm_sessions,
    is_any_dm_set,
    kill_session,
    record_failed_attempt,
    require_dm,
    verify_dm_pin,
)
from database import async_session as get_db
from sqlalchemy import func, select
from models import AuthSession as AuthSessionRow, Campaign, DM
from rate_limit import client_key

router = APIRouter(prefix="/auth", tags=["auth"])


class DMCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    pin: str = Field(..., min_length=4, max_length=8, pattern=r"^\d+$")


class PinLoginRequest(BaseModel):
    """Login por nombre de perfil + PIN. `dm_id` queda aceptado por
    compatibilidad (lo usan el fixture de e2e y el flujo viejo), pero la UI
    manda `name`: el id es interno y no tiene por qué viajar a la pantalla."""

    name: str | None = None
    dm_id: str | None = None
    pin: str = Field(..., min_length=4, max_length=8, pattern=r"^\d+$")


class PinChangeRequest(BaseModel):
    current_pin: str | None = None
    new_pin: str = Field(..., min_length=4, max_length=8, pattern=r"^\d+$")


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


class DeleteDmRequest(BaseModel):
    confirmation: Literal["DELETE"]


@router.get("/status")
async def auth_status():
    has_dms = await is_any_dm_set()
    return {"dms_registered": has_dms}


@router.post("/register", response_model=LoginResponse)
async def register_dm(body: DMCreateRequest, request: Request):
    """Register a new DM with name + PIN. Creates session."""
    ip, _ = client_key(request.headers, request.client.host if request.client else None)
    if check_lockout(ip):
        raise HTTPException(status_code=429, detail="Too many attempts. Try later.")

    async with get_db() as db:
        existing = (await db.execute(select(DM).where(DM.name == body.name))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Ya existe un perfil con ese nombre. Ingresá con tu PIN.")

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
    """Login con nombre de perfil + PIN. Devuelve el token de sesión.

    Nombre inexistente y PIN incorrecto devuelven el mismo 401: distinguirlos
    ("DM not found" vs "Invalid PIN") le sirve a un atacante para enumerar qué
    perfiles existen en la máquina.
    """
    ip, _ = client_key(request.headers, request.client.host if request.client else None)
    if check_lockout(ip):
        raise HTTPException(status_code=429, detail="Too many attempts. Try later.")

    if not body.name and not body.dm_id:
        raise HTTPException(status_code=422, detail="Falta el nombre del perfil.")

    async with get_db() as db:
        if body.name:
            result = await db.execute(
                select(DM).where(func.lower(DM.name) == body.name.strip().lower())
            )
            matches = result.scalars().all()
            if len(matches) > 1:
                # No debería pasar (register rechaza duplicados), pero si hay
                # datos viejos no adivinamos cuál es.
                raise HTTPException(
                    status_code=409, detail="Hay más de un perfil con ese nombre."
                )
            dm = matches[0] if matches else None
        else:
            dm = (await db.execute(select(DM).where(DM.id == body.dm_id))).scalar_one_or_none()

    if not dm or not await verify_dm_pin(dm.id, body.pin):
        if dm:
            record_failed_attempt(ip)
        raise HTTPException(status_code=401, detail="Nombre o PIN incorrectos.")

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


@router.get("/me/export")
async def export_my_data(session: AuthSession = Depends(require_dm)):
    """Exporta perfil, sesiones y campañas en un único JSON."""
    dm = await get_dm_by_id(session.dm_id)
    if not dm:
        raise HTTPException(status_code=404, detail="DM not found")

    from routes import export_campaign

    async with get_db() as db:
        session_rows = (
            await db.execute(
                select(AuthSessionRow).where(AuthSessionRow.dm_id == dm.id)
            )
        ).scalars().all()
        campaign_rows = (
            await db.execute(select(Campaign).order_by(Campaign.created_at))
        ).scalars().all()
        campaigns = [await export_campaign(c.id, db) for c in campaign_rows]

    return {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "dm": {
            "id": dm.id,
            "name": dm.name,
            "created_at": dm.created_at.isoformat(),
        },
        "sessions": [
            {
                "id": s.id,
                "role": s.role,
                "campaign_id": s.campaign_id,
                "created_at": s.created_at.isoformat(),
                "last_seen": s.last_seen.isoformat(),
            }
            for s in session_rows
        ],
        "campaigns": [c.model_dump(mode="json") for c in campaigns],
    }


@router.delete("/me")
async def delete_my_data(
    body: DeleteDmRequest, session: AuthSession = Depends(require_dm)
):
    """Borra el perfil y sus sesiones; las campañas compartidas siguen."""
    async with get_db() as db:
        sessions = await db.scalar(
            select(func.count())
            .select_from(AuthSessionRow)
            .where(AuthSessionRow.dm_id == session.dm_id)
        )
    if not await delete_dm(session.dm_id):
        raise HTTPException(status_code=404, detail="DM not found")
    return {
        "ok": True,
        "deleted_dm": session.dm_id,
        "sessions": sessions or 0,
        "campaigns": 0,
    }


@router.post("/logout")
async def logout(session: AuthSession = Depends(get_current_session)):
    """Logout — invalidate session."""
    await delete_session(session.token)
    return {"ok": True}


@router.get("/sessions")
async def list_sessions(_session: AuthSession = Depends(require_dm)):
    """List active sessions."""
    return await get_active_sessions()


@router.delete("/sessions")
async def kill_all_sessions(session: AuthSession = Depends(require_dm)):
    """Cierra todas las sesiones de este DM, incluida la actual."""
    killed = await invalidate_all_dm_sessions(session.dm_id)
    return {"ok": True, "killed": killed}


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
