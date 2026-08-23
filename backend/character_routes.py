from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_session
from models import Character, NPC
from schemas import (
    CharacterCreate,
    CharacterUpdate,
    CharacterResponse,
    NPCCreate,
    NPCUpdate,
    NPCResponse,
)
import os
import uuid

router = APIRouter(tags=["characters", "npcs"])

ASSETS_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "assets")

DEFAULT_MAX_PV = 10
DEFAULT_MAX_PM = 10
DEFAULT_DEFENSE = 5


def apply_vida_response(char: Character) -> dict:
    return {
        "id": char.id,
        "campaign_id": char.campaign_id,
        "name": char.name,
        "type": char.type,
        "description": char.description,
        "class_": char.class_,
        "race": char.race,
        "status": char.status,
        "current_location_id": char.current_location_id,
        "visual_config_json": char.visual_config_json or {},
        "knowledge_scope": char.knowledge_scope,
        "portrait_path": char.portrait_path,
        "vigor": char.vigor,
        "intelligence": char.intelligence,
        "dexterity": char.dexterity,
        "cunning": char.cunning,
        "max_pv": char.max_pv if char.max_pv is not None else DEFAULT_MAX_PV,
        "max_pm": char.max_pm if char.max_pm is not None else DEFAULT_MAX_PM,
        "defense": char.defense if char.defense is not None else DEFAULT_DEFENSE,
        "current_pv": char.current_pv,
        "current_pm": char.current_pm,
        "inventory_json": char.inventory_json or [],
        "spells_json": char.spells_json or [],
    }


def apply_npc_vida_response(npc: NPC) -> dict:
    return {
        "id": npc.id,
        "campaign_id": npc.campaign_id,
        "name": npc.name,
        "description": npc.description,
        "status": npc.status,
        "current_location_id": npc.current_location_id,
        "faction_id": npc.faction_id,
        "knowledge_scope": npc.knowledge_scope,
        "visual_config_json": npc.visual_config_json or {},
        "portrait_path": npc.portrait_path,
        "vigor": npc.vigor,
        "intelligence": npc.intelligence,
        "dexterity": npc.dexterity,
        "cunning": npc.cunning,
        "max_pv": npc.max_pv if npc.max_pv is not None else DEFAULT_MAX_PV,
        "max_pm": npc.max_pm if npc.max_pm is not None else DEFAULT_MAX_PM,
        "defense": npc.defense if npc.defense is not None else DEFAULT_DEFENSE,
        "current_pv": npc.current_pv,
        "current_pm": npc.current_pm,
        "inventory_json": npc.inventory_json or [],
        "spells_json": npc.spells_json or [],
    }


# ── Character CRUD ──────────────────────────────────────────


@router.post("/campaigns/{campaign_id}/characters", response_model=CharacterResponse)
async def create_character(
    campaign_id: str,
    data: CharacterCreate,
    db: AsyncSession = Depends(get_session),
):
    max_pv = data.max_pv if data.max_pv is not None else DEFAULT_MAX_PV
    max_pm = data.max_pm if data.max_pm is not None else DEFAULT_MAX_PM
    char = Character(
        campaign_id=campaign_id,
        name=data.name,
        type=data.type,
        description=data.description,
        class_=data.class_name,
        race=data.race,
        status=data.status,
        current_location_id=data.current_location_id,
        visual_config_json=data.visual_config_json,
        knowledge_scope=data.knowledge_scope,
        vigor=data.vigor,
        intelligence=data.intelligence,
        dexterity=data.dexterity,
        cunning=data.cunning,
        max_pv=max_pv,
        max_pm=max_pm,
        defense=data.defense if data.defense is not None else DEFAULT_DEFENSE,
        current_pv=data.current_pv if data.current_pv is not None else max_pv,
        current_pm=data.current_pm if data.current_pm is not None else max_pm,
    )
    db.add(char)
    await db.commit()
    await db.refresh(char)
    return apply_vida_response(char)


@router.get("/campaigns/{campaign_id}/characters", response_model=list[CharacterResponse])
async def list_characters(
    campaign_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Character).where(Character.campaign_id == campaign_id)
    )
    return [apply_vida_response(c) for c in result.scalars().all()]


@router.get(
    "/campaigns/{campaign_id}/characters/{character_id}",
    response_model=CharacterResponse,
)
async def get_character(
    campaign_id: str,
    character_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Character).where(
            Character.id == character_id,
            Character.campaign_id == campaign_id,
        )
    )
    char = result.scalar_one_or_none()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")
    return apply_vida_response(char)


@router.put(
    "/campaigns/{campaign_id}/characters/{character_id}",
    response_model=CharacterResponse,
)
async def update_character(
    campaign_id: str,
    character_id: str,
    data: CharacterUpdate,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Character).where(
            Character.id == character_id,
            Character.campaign_id == campaign_id,
        )
    )
    char = result.scalar_one_or_none()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")

    updates = data.model_dump(exclude_unset=True)
    if "class_name" in updates:
        char.class_ = updates.pop("class_name")
    for field, value in updates.items():
        setattr(char, field, value)

    await db.commit()
    await db.refresh(char)
    return apply_vida_response(char)


@router.delete("/campaigns/{campaign_id}/characters/{character_id}")
async def delete_character(
    campaign_id: str,
    character_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Character).where(
            Character.id == character_id,
            Character.campaign_id == campaign_id,
        )
    )
    char = result.scalar_one_or_none()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")

    await db.delete(char)
    await db.commit()
    return {"status": "deleted", "id": character_id}


# ── NPC CRUD ────────────────────────────────────────────────


@router.post("/campaigns/{campaign_id}/npcs", response_model=NPCResponse)
async def create_npc(
    campaign_id: str,
    data: NPCCreate,
    db: AsyncSession = Depends(get_session),
):
    max_pv = data.max_pv if data.max_pv is not None else DEFAULT_MAX_PV
    max_pm = data.max_pm if data.max_pm is not None else DEFAULT_MAX_PM
    npc = NPC(
        campaign_id=campaign_id,
        name=data.name,
        description=data.description,
        status=data.status,
        current_location_id=data.current_location_id,
        faction_id=data.faction_id,
        knowledge_scope=data.knowledge_scope,
        visual_config_json=data.visual_config_json,
        vigor=data.vigor,
        intelligence=data.intelligence,
        dexterity=data.dexterity,
        cunning=data.cunning,
        max_pv=max_pv,
        max_pm=max_pm,
        defense=data.defense if data.defense is not None else DEFAULT_DEFENSE,
        current_pv=data.current_pv if data.current_pv is not None else max_pv,
        current_pm=data.current_pm if data.current_pm is not None else max_pm,
    )
    db.add(npc)
    await db.commit()
    await db.refresh(npc)
    return apply_npc_vida_response(npc)


@router.get("/campaigns/{campaign_id}/npcs", response_model=list[NPCResponse])
async def list_npcs(
    campaign_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(NPC).where(NPC.campaign_id == campaign_id)
    )
    return [apply_npc_vida_response(n) for n in result.scalars().all()]


@router.get("/campaigns/{campaign_id}/npcs/{npc_id}", response_model=NPCResponse)
async def get_npc(
    campaign_id: str,
    npc_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(NPC).where(
            NPC.id == npc_id,
            NPC.campaign_id == campaign_id,
        )
    )
    npc = result.scalar_one_or_none()
    if not npc:
        raise HTTPException(status_code=404, detail="NPC not found")
    return apply_npc_vida_response(npc)


@router.put("/campaigns/{campaign_id}/npcs/{npc_id}", response_model=NPCResponse)
async def update_npc(
    campaign_id: str,
    npc_id: str,
    data: NPCUpdate,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(NPC).where(
            NPC.id == npc_id,
            NPC.campaign_id == campaign_id,
        )
    )
    npc = result.scalar_one_or_none()
    if not npc:
        raise HTTPException(status_code=404, detail="NPC not found")

    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(npc, field, value)

    await db.commit()
    await db.refresh(npc)
    return apply_npc_vida_response(npc)


@router.delete("/campaigns/{campaign_id}/npcs/{npc_id}")
async def delete_npc(
    campaign_id: str,
    npc_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(NPC).where(
            NPC.id == npc_id,
            NPC.campaign_id == campaign_id,
        )
    )
    npc = result.scalar_one_or_none()
    if not npc:
        raise HTTPException(status_code=404, detail="NPC not found")

    await db.delete(npc)
    await db.commit()
    return {"status": "deleted", "id": npc_id}


# ── Portrait Upload ─────────────────────────────────────────


@router.post("/campaigns/{campaign_id}/characters/{character_id}/portrait")
async def upload_character_portrait(
    campaign_id: str,
    character_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Character).where(
            Character.id == character_id,
            Character.campaign_id == campaign_id,
        )
    )
    char = result.scalar_one_or_none()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")

    ext = os.path.splitext(file.filename or "portrait.png")[1] or ".png"
    portrait_dir = os.path.join(ASSETS_DIR, campaign_id, "characters", character_id)
    os.makedirs(portrait_dir, exist_ok=True)
    file_path = os.path.join(portrait_dir, f"portrait{ext}")

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    char.portrait_path = file_path
    await db.commit()
    await db.refresh(char)
    return apply_vida_response(char)


@router.post("/campaigns/{campaign_id}/npcs/{npc_id}/portrait")
async def upload_npc_portrait(
    campaign_id: str,
    npc_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(NPC).where(
            NPC.id == npc_id,
            NPC.campaign_id == campaign_id,
        )
    )
    npc = result.scalar_one_or_none()
    if not npc:
        raise HTTPException(status_code=404, detail="NPC not found")

    ext = os.path.splitext(file.filename or "portrait.png")[1] or ".png"
    portrait_dir = os.path.join(ASSETS_DIR, campaign_id, "npcs", npc_id)
    os.makedirs(portrait_dir, exist_ok=True)
    file_path = os.path.join(portrait_dir, f"portrait{ext}")

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    npc.portrait_path = file_path
    await db.commit()
    await db.refresh(npc)
    return apply_npc_vida_response(npc)
