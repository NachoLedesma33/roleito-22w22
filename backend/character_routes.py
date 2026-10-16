from fastapi import APIRouter, Depends, HTTPException
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
from services.vida import (
    DEFAULT_DEFENSE,
    DEFAULT_MAX_PM,
    DEFAULT_MAX_PV,
    apply_npc_vida_response,
    apply_vida_response,
    load_spells_bulk,
    replace_spells,
)
from routes import broadcast_revision

router = APIRouter(tags=["characters", "npcs"])


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
        player_notes=data.player_notes,
    )
    db.add(char)
    await db.commit()
    await db.refresh(char)
    return await apply_vida_response(db, char)


@router.get("/campaigns/{campaign_id}/characters", response_model=list[CharacterResponse])
async def list_characters(
    campaign_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Character).where(Character.campaign_id == campaign_id)
    )
    rows = result.scalars().all()
    spells = await load_spells_bulk(db, "character", [c.id for c in rows])
    return [await apply_vida_response(db, c, spells.get(c.id, [])) for c in rows]


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
    return await apply_vida_response(db, char)


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
    spells = updates.pop("spells_json", None)
    for field, value in updates.items():
        setattr(char, field, value)
    if spells is not None:
        await replace_spells(db, campaign_id, "character", char.id, spells)

    await db.commit()
    await db.refresh(char)
    await broadcast_revision(db, campaign_id)
    return await apply_vida_response(db, char)


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
    return await apply_npc_vida_response(db, npc)


@router.get("/campaigns/{campaign_id}/npcs", response_model=list[NPCResponse])
async def list_npcs(
    campaign_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(NPC).where(NPC.campaign_id == campaign_id)
    )
    rows = result.scalars().all()
    spells = await load_spells_bulk(db, "npc", [n.id for n in rows])
    return [await apply_npc_vida_response(db, n, spells.get(n.id, [])) for n in rows]


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
    return await apply_npc_vida_response(db, npc)


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
    spells = updates.pop("spells_json", None)
    for field, value in updates.items():
        setattr(npc, field, value)
    if spells is not None:
        await replace_spells(db, campaign_id, "npc", npc.id, spells)

    await db.commit()
    await db.refresh(npc)
    await broadcast_revision(db, campaign_id)
    return await apply_npc_vida_response(db, npc)


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

