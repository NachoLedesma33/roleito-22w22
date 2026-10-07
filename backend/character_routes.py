from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete, func, select
from database import get_session
from models import Ability, Campaign, Character, CharacterAbility, Event, NPC, gen_id
from schemas import (
    CharacterCreate,
    CharacterUpdate,
    CharacterResponse,
    NPCCreate,
    NPCUpdate,
    NPCResponse,
)
import os
from routes import broadcast_revision

router = APIRouter(tags=["characters", "npcs"])

ASSETS_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "assets")

DEFAULT_MAX_PV = 10
DEFAULT_MAX_PM = 10
DEFAULT_DEFENSE = 5


def _spell_payload(ability: Ability) -> dict:
    # La respuesta conserva el nombre spells_json para no romper CharacterSheet
    # ni PlayerView; la fuente ya no es la columna, es abilities + enlaces.
    return {
        "id": ability.id,
        "name": ability.name,
        "description": ability.description,
        "level": ability.level,
        "cost_pm": ability.cost_pm,
        "icon": ability.icon,
    }


async def _load_spells_bulk(
    db: AsyncSession, entity_type: str, entity_ids: list[str]
) -> dict[str, list[dict]]:
    if not entity_ids:
        return {}
    result = await db.execute(
        select(CharacterAbility.entity_id, Ability)
        .join(Ability, Ability.id == CharacterAbility.ability_id)
        .where(
            CharacterAbility.entity_type == entity_type,
            CharacterAbility.entity_id.in_(entity_ids),
        )
        .order_by(Ability.name)
    )
    out: dict[str, list[dict]] = {}
    for entity_id, ability in result.all():
        out.setdefault(entity_id, []).append(_spell_payload(ability))
    return out


async def _load_spells(db: AsyncSession, entity_type: str, entity_id: str) -> list[dict]:
    return (await _load_spells_bulk(db, entity_type, [entity_id])).get(entity_id, [])


async def _replace_spells(
    db: AsyncSession,
    campaign_id: str,
    entity_type: str,
    entity_id: str,
    spells: list,
) -> None:
    """Reemplaza lo que la entidad sabe.

    El catálogo es de campaña: editar un conjuro que también sabe otro
    personaje lo cambia para los dos, que es la semántica elegida. Borrar solo
    quita el enlace y la fila del catálogo queda.
    """
    keep: list[str] = []
    for raw in spells:
        ability_id = str(raw.get("id") or gen_id())
        if ability_id in keep:
            continue
        keep.append(ability_id)
        result = await db.execute(select(Ability).where(Ability.id == ability_id))
        ability = result.scalar_one_or_none()
        if ability is None:
            ability = Ability(id=ability_id, campaign_id=campaign_id)
            db.add(ability)
        elif ability.campaign_id != campaign_id:
            # id de otra campaña: no se toca su catálogo.
            raise HTTPException(status_code=404, detail="Ability not found")
        ability.name = str(raw.get("name") or "Nuevo conjuro")
        ability.description = str(raw.get("description") or "")
        ability.level = int(raw.get("level") or 1)
        ability.cost_pm = int(raw.get("cost_pm") or 1)
        # icon viaja en el mismo payload que nombre/nivel: cambiarlo en la ficha
        # es una edición del catálogo compartido, igual que el resto. Si la
        # clave no viene (payloads viejos), el icono de la fila no se toca.
        if "icon" in raw:
            ability.icon = raw.get("icon") or None

        link = await db.execute(
            select(CharacterAbility).where(
                CharacterAbility.entity_type == entity_type,
                CharacterAbility.entity_id == entity_id,
                CharacterAbility.ability_id == ability_id,
            )
        )
        if link.scalar_one_or_none() is None:
            db.add(
                CharacterAbility(
                    entity_type=entity_type,
                    entity_id=entity_id,
                    ability_id=ability_id,
                )
            )

    unlink = delete(CharacterAbility).where(
        CharacterAbility.entity_type == entity_type,
        CharacterAbility.entity_id == entity_id,
    )
    if keep:
        unlink = unlink.where(CharacterAbility.ability_id.not_in(keep))
    await db.execute(unlink)


async def apply_vida_response(
    db: AsyncSession, char: Character, spells: list[dict] | None = None
) -> dict:
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
        "model_path": char.model_path,
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
        "spells_json": spells if spells is not None else await _load_spells(db, "character", char.id),
        "player_notes": char.player_notes or "",
    }


async def apply_npc_vida_response(
    db: AsyncSession, npc: NPC, spells: list[dict] | None = None
) -> dict:
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
        "model_path": npc.model_path,
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
        "spells_json": spells if spells is not None else await _load_spells(db, "npc", npc.id),
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
    spells = await _load_spells_bulk(db, "character", [c.id for c in rows])
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
        await _replace_spells(db, campaign_id, "character", char.id, spells)

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


@router.get("/campaigns/{campaign_id}/abilities")
async def list_campaign_abilities(
    campaign_id: str,
    db: AsyncSession = Depends(get_session),
):
    """Catalogo de la campaña: la fuente para que otros personajes sepan una
    habilidad que ya existe, en vez de duplicarla en cada ficha.

    `owners` es cuántas fichas la saben: la UI lo usa para avisar que editarla
    la cambia para todos los que la conocen.
    """
    result = await db.execute(
        select(Ability, func.count(CharacterAbility.ability_id))
        .outerjoin(CharacterAbility, CharacterAbility.ability_id == Ability.id)
        .where(Ability.campaign_id == campaign_id)
        .group_by(Ability.id)
        .order_by(Ability.name)
    )
    return [{**_spell_payload(a), "owners": owners} for a, owners in result.all()]


async def _get_ability(
    db: AsyncSession, campaign_id: str, ability_id: str
) -> Ability:
    result = await db.execute(
        select(Ability).where(
            Ability.id == ability_id,
            Ability.campaign_id == campaign_id,
        )
    )
    ability = result.scalar_one_or_none()
    if not ability:
        raise HTTPException(status_code=404, detail="Ability not found")
    return ability


def _remove_icon_file(ability: Ability) -> None:
    """Borra el archivo del icono subido, solo si vive bajo data/assets."""
    if not ability.icon:
        return
    root = os.path.realpath(ASSETS_DIR)
    real = os.path.realpath(ability.icon)
    if real.startswith(root + os.sep) and os.path.isfile(real):
        os.remove(real)


@router.put("/campaigns/{campaign_id}/abilities/{ability_id}/icon/{slug}")
async def set_ability_icon_preset(
    campaign_id: str,
    ability_id: str,
    slug: str,
    db: AsyncSession = Depends(get_session),
):
    """Fija un icono de la paleta precargada (apps/dm/src/lib/abilityIcons.ts)."""
    ability = await _get_ability(db, campaign_id, ability_id)
    ability.icon = slug
    await db.commit()
    return _spell_payload(ability)


@router.post("/campaigns/{campaign_id}/abilities/{ability_id}/icon")
async def upload_ability_icon(
    campaign_id: str,
    ability_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_session),
):
    """Sube una imagen propia; se guarda como la del retrato, en
    data/assets/<campaña>/abilities/<habilidad>/icon.<ext>."""
    ability = await _get_ability(db, campaign_id, ability_id)
    _remove_icon_file(ability)

    ext = os.path.splitext(file.filename or "icon.png")[1] or ".png"
    icon_dir = os.path.join(ASSETS_DIR, campaign_id, "abilities", ability_id)
    os.makedirs(icon_dir, exist_ok=True)
    file_path = os.path.join(icon_dir, f"icon{ext}")

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    ability.icon = file_path
    await db.commit()
    return _spell_payload(ability)


@router.delete("/campaigns/{campaign_id}/abilities/{ability_id}/icon")
async def clear_ability_icon(
    campaign_id: str,
    ability_id: str,
    db: AsyncSession = Depends(get_session),
):
    """Quita el icono: la UI vuelve al fallback (primera letra del nombre)."""
    ability = await _get_ability(db, campaign_id, ability_id)
    _remove_icon_file(ability)
    ability.icon = None
    await db.commit()
    return _spell_payload(ability)


@router.delete("/campaigns/{campaign_id}/abilities/{ability_id}")
async def delete_campaign_ability(
    campaign_id: str,
    ability_id: str,
    db: AsyncSession = Depends(get_session),
):
    """Borra la habilidad del catálogo, para todas las fichas que la saben.

    No hay forma de quitarla de una sola ficha por esta vía: eso es la `x` de
    la ficha, que solo desaprende. Enlaces primero y fila después (mismo orden
    que el purge de campaña), y el archivo del icono solo si vive bajo
    data/assets: lo creamos nosotros.
    """
    ability = await _get_ability(db, campaign_id, ability_id)
    await db.execute(
        delete(CharacterAbility).where(CharacterAbility.ability_id == ability_id)
    )
    _remove_icon_file(ability)
    await db.delete(ability)
    await db.commit()
    return {"status": "deleted", "id": ability_id}


class AbilityUseRequest(BaseModel):
    character_id: str


@router.post("/campaigns/{campaign_id}/abilities/{ability_id}/use")
async def use_campaign_ability(
    campaign_id: str,
    ability_id: str,
    data: AbilityUseRequest,
    db: AsyncSession = Depends(get_session),
):
    """El jugador usa la habilidad: descuenta PM y deja el evento ability_used.

    PM y evento salen de la misma transacción — o los dos o ninguno — así un
    fallo a mitad de camino no deja PM descontado sin registro. El evento nace
    como CANON (EVENT-SYSTEM.md §57: auto-canon de bajo impacto, igual que
    "character moved from room A to B"), así el World State lo aplica sin
    esperar revisión del DM: un hechizo no es lore. `Event.session_id` es NOT
    NULL, así que sin sesión activa se gasta igual y `event_id` vuelve null.
    """
    ability = await _get_ability(db, campaign_id, ability_id)

    result = await db.execute(
        select(Character).where(
            Character.id == data.character_id,
            Character.campaign_id == campaign_id,
        )
    )
    char = result.scalar_one_or_none()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")

    link = await db.execute(
        select(CharacterAbility.ability_id).where(
            CharacterAbility.entity_type == "character",
            CharacterAbility.entity_id == char.id,
            CharacterAbility.ability_id == ability_id,
        )
    )
    if not link.scalar_one_or_none():
        raise HTTPException(
            status_code=400, detail=f"{char.name} no sabe {ability.name}"
        )

    cost = ability.cost_pm or 0
    current = char.current_pm if char.current_pm is not None else char.max_pm
    if cost > current:
        raise HTTPException(status_code=400, detail="PM insuficientes")
    char.current_pm = current - cost

    campaign = (
        await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    ).scalar_one()
    event_id = None
    if campaign.current_session_id:
        event = Event(
            campaign_id=campaign_id,
            session_id=campaign.current_session_id,
            type="ability_used",
            actor_id=char.id,
            target_id=ability.id,
            location_id=char.current_location_id,
            description=f"{char.name} usó {ability.name} (-{cost} PM)",
            confidence=1.0,
            status="CANON",
            source_id="player",
        )
        db.add(event)
        await db.flush()
        event_id = event.id

    await db.commit()
    await db.refresh(char)
    await broadcast_revision(db, campaign_id)
    return {"character": await apply_vida_response(db, char), "event_id": event_id}


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
    spells = await _load_spells_bulk(db, "npc", [n.id for n in rows])
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
        await _replace_spells(db, campaign_id, "npc", npc.id, spells)

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
    return await apply_vida_response(db, char)


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
    return await apply_npc_vida_response(db, npc)


# ── 3D Model Upload ────────────────────────────────────────


@router.post("/campaigns/{campaign_id}/characters/{character_id}/model")
async def upload_character_model(
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

    filename = file.filename or "model.glb"
    ext = os.path.splitext(filename)[1] or ".glb"
    model_dir = os.path.join(ASSETS_DIR, campaign_id, "characters", character_id)
    os.makedirs(model_dir, exist_ok=True)
    file_path = os.path.join(model_dir, f"model{ext}")

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    char.model_path = file_path
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
    result = await db.execute(
        select(NPC).where(
            NPC.id == npc_id,
            NPC.campaign_id == campaign_id,
        )
    )
    npc = result.scalar_one_or_none()
    if not npc:
        raise HTTPException(status_code=404, detail="NPC not found")

    filename = file.filename or "model.glb"
    ext = os.path.splitext(filename)[1] or ".glb"
    model_dir = os.path.join(ASSETS_DIR, campaign_id, "npcs", npc_id)
    os.makedirs(model_dir, exist_ok=True)
    file_path = os.path.join(model_dir, f"model{ext}")

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    npc.model_path = file_path
    await db.commit()
    await db.refresh(npc)
    return await apply_npc_vida_response(db, npc)
