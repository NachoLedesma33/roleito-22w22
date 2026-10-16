from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
import os
from database import get_session
from models import Ability, Campaign, Character, CharacterAbility, Event
from services.assets import remove_asset_file, save_campaign_file
from services.vida import apply_vida_response, spell_payload
from routes import broadcast_revision

router = APIRouter(tags=["abilities"])


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


# ── Catálogo de la campaña ──────────────────────────────────


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
    return [{**spell_payload(a), "owners": owners} for a, owners in result.all()]


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
    remove_asset_file(ability.icon)
    remove_asset_file(ability.audio_path)
    await db.delete(ability)
    await db.commit()
    return {"status": "deleted", "id": ability_id}


# ── Icono y audio de la habilidad ───────────────────────────


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
    return spell_payload(ability)


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
    remove_asset_file(ability.icon)

    ext = os.path.splitext(file.filename or "icon.png")[1] or ".png"
    file_path = save_campaign_file(
        campaign_id,
        "abilities",
        ability_id,
        filename=f"icon{ext}",
        content=await file.read(),
    )

    ability.icon = file_path
    await db.commit()
    return spell_payload(ability)


@router.delete("/campaigns/{campaign_id}/abilities/{ability_id}/icon")
async def clear_ability_icon(
    campaign_id: str,
    ability_id: str,
    db: AsyncSession = Depends(get_session),
):
    """Quita el icono: la UI vuelve al fallback (primera letra del nombre)."""
    ability = await _get_ability(db, campaign_id, ability_id)
    remove_asset_file(ability.icon)
    ability.icon = None
    await db.commit()
    return spell_payload(ability)


@router.post("/campaigns/{campaign_id}/abilities/{ability_id}/audio")
async def upload_ability_audio(
    campaign_id: str,
    ability_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_session),
):
    """Sube un sonido de la habilidad; se guarda como el del icono, en
    data/assets/<campaña>/abilities/<habilidad>/audio.<ext>."""
    ability = await _get_ability(db, campaign_id, ability_id)
    remove_asset_file(ability.audio_path)

    ext = os.path.splitext(file.filename or "audio.mp3")[1] or ".mp3"
    file_path = save_campaign_file(
        campaign_id,
        "abilities",
        ability_id,
        filename=f"audio{ext}",
        content=await file.read(),
    )

    ability.audio_path = file_path
    await db.commit()
    return spell_payload(ability)


@router.delete("/campaigns/{campaign_id}/abilities/{ability_id}/audio")
async def clear_ability_audio(
    campaign_id: str,
    ability_id: str,
    db: AsyncSession = Depends(get_session),
):
    """Quita el audio: el botón Usar vuelve a sonar solo con ambiente."""
    ability = await _get_ability(db, campaign_id, ability_id)
    remove_asset_file(ability.audio_path)
    ability.audio_path = None
    await db.commit()
    return spell_payload(ability)


# ── Uso de la habilidad ─────────────────────────────────────


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