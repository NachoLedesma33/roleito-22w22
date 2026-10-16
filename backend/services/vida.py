"""El payload de una ficha: vida, inventario y conjuros.

Vive acá porque lo necesitan los routers de personajes, de NPCs y de subidas
(los uploads devuelven la ficha actualizada). Un router no debería ser el dueño
de algo que otro router importa.
"""

from fastapi import HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from models import Ability, Character, CharacterAbility, NPC, gen_id

DEFAULT_MAX_PV = 10
DEFAULT_MAX_PM = 10
DEFAULT_DEFENSE = 5


def spell_payload(ability: Ability) -> dict:
    # La respuesta conserva el nombre spells_json para no romper CharacterSheet
    # ni PlayerView; la fuente ya no es la columna, es abilities + enlaces.
    return {
        "id": ability.id,
        "name": ability.name,
        "description": ability.description,
        "level": ability.level,
        "cost_pm": ability.cost_pm,
        "icon": ability.icon,
        "audio_path": ability.audio_path,
    }


async def load_spells_bulk(
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
        out.setdefault(entity_id, []).append(spell_payload(ability))
    return out


async def load_spells(
    db: AsyncSession, entity_type: str, entity_id: str
) -> list[dict]:
    return (await load_spells_bulk(db, entity_type, [entity_id])).get(entity_id, [])


async def replace_spells(
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
        if "audio_path" in raw:
            ability.audio_path = raw.get("audio_path") or None

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
        "spells_json": spells if spells is not None else await load_spells(db, "character", char.id),
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
        "spells_json": spells if spells is not None else await load_spells(db, "npc", npc.id),
    }