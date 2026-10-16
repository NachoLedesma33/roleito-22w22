from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import os
from database import get_session
from models import Character, NPC
from services.assets import save_campaign_file
from services.vida import apply_npc_vida_response, apply_vida_response

router = APIRouter(tags=["uploads"])


async def _get_character(db: AsyncSession, campaign_id: str, character_id: str) -> Character:
    result = await db.execute(
        select(Character).where(
            Character.id == character_id,
            Character.campaign_id == campaign_id,
        )
    )
    char = result.scalar_one_or_none()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")
    return char


async def _get_npc(db: AsyncSession, campaign_id: str, npc_id: str) -> NPC:
    result = await db.execute(
        select(NPC).where(
            NPC.id == npc_id,
            NPC.campaign_id == campaign_id,
        )
    )
    npc = result.scalar_one_or_none()
    if not npc:
        raise HTTPException(status_code=404, detail="NPC not found")
    return npc


# ── Portrait Upload ─────────────────────────────────────────


@router.post("/campaigns/{campaign_id}/characters/{character_id}/portrait")
async def upload_character_portrait(
    campaign_id: str,
    character_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_session),
):
    char = await _get_character(db, campaign_id, character_id)
    ext = os.path.splitext(file.filename or "portrait.png")[1] or ".png"
    char.portrait_path = save_campaign_file(
        campaign_id,
        "characters",
        character_id,
        filename=f"portrait{ext}",
        content=await file.read(),
    )
    await db.commit()
    await db.refresh(char)
    return await apply_vida_response(db, char)


@router.post("/campaigns/{campaign_id}/npcs/{npc_id}/portrait")
async def upload_npc_portrait(
    campaign_id: str,
    npc_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_session),
):
    npc = await _get_npc(db, campaign_id, npc_id)
    ext = os.path.splitext(file.filename or "portrait.png")[1] or ".png"
    npc.portrait_path = save_campaign_file(
        campaign_id,
        "npcs",
        npc_id,
        filename=f"portrait{ext}",
        content=await file.read(),
    )
    await db.commit()
    await db.refresh(npc)
    return await apply_npc_vida_response(db, npc)


# ── 3D Model Upload ────────────────────────────────────────


@router.post("/campaigns/{campaign_id}/characters/{character_id}/model")
async def upload_character_model(
    campaign_id: str,
    character_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_session),
):
    char = await _get_character(db, campaign_id, character_id)
    filename = file.filename or "model.glb"
    ext = os.path.splitext(filename)[1] or ".glb"
    char.model_path = save_campaign_file(
        campaign_id,
        "characters",
        character_id,
        filename=f"model{ext}",
        content=await file.read(),
    )
    await db.commit()
    await db.refresh(char)
    return await apply_vida_response(db, char)


@router.post("/campaigns/{campaign_id}/npcs/{npc_id}/model")
async def upload_npc_model(
    campaign_id: str,
    npc_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_session),
):
    npc = await _get_npc(db, campaign_id, npc_id)
    filename = file.filename or "model.glb"
    ext = os.path.splitext(filename)[1] or ".glb"
    npc.model_path = save_campaign_file(
        campaign_id,
        "npcs",
        npc_id,
        filename=f"model{ext}",
        content=await file.read(),
    )
    await db.commit()
    await db.refresh(npc)
    return await apply_npc_vida_response(db, npc)