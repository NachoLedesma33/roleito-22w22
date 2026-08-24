"""Entity resolver — maps extracted names to database entity IDs."""

from __future__ import annotations

from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import Character, Location, NPC


@dataclass
class ResolvedEntity:
    name: str
    entity_type: str
    entity_id: str
    confidence: float = 1.0


@dataclass
class ResolutionResult:
    resolved: list[ResolvedEntity] = field(default_factory=list)
    unresolved: list[str] = field(default_factory=list)


async def resolve_entities(
    db: AsyncSession,
    campaign_id: str,
    names: list[str],
) -> ResolutionResult:
    """Resolve a list of names to database entity IDs."""
    chars = (await db.execute(
        select(Character).where(Character.campaign_id == campaign_id)
    )).scalars().all()
    npcs = (await db.execute(
        select(NPC).where(NPC.campaign_id == campaign_id)
    )).scalars().all()
    locs = (await db.execute(
        select(Location).where(Location.campaign_id == campaign_id)
    )).scalars().all()

    char_map = {c.name.lower(): c for c in chars}
    npc_map = {n.name.lower(): n for n in npcs}
    loc_map = {l.name.lower(): l for l in locs}

    result = ResolutionResult()

    for name in names:
        key = name.lower().strip()
        if not key:
            continue

        if key in char_map:
            c = char_map[key]
            result.resolved.append(
                ResolvedEntity(name=name, entity_type="character", entity_id=c.id)
            )
        elif key in npc_map:
            n = npc_map[key]
            result.resolved.append(
                ResolvedEntity(name=name, entity_type="npc", entity_id=n.id)
            )
        elif key in loc_map:
            l = loc_map[key]
            result.resolved.append(
                ResolvedEntity(name=name, entity_type="location", entity_id=l.id)
            )
        else:
            partial = _fuzzy_match(key, char_map, npc_map, loc_map)
            if partial:
                result.resolved.append(partial)
            else:
                result.unresolved.append(name)

    return result


def _fuzzy_match(
    key: str,
    char_map: dict,
    npc_map: dict,
    loc_map: dict,
) -> ResolvedEntity | None:
    """Simple substring/prefix matching for entity resolution."""
    for name, c in char_map.items():
        if key in name or name in key:
            return ResolvedEntity(
                name=key, entity_type="character", entity_id=c.id, confidence=0.8
            )

    for name, n in npc_map.items():
        if key in name or name in key:
            return ResolvedEntity(
                name=key, entity_type="npc", entity_id=n.id, confidence=0.8
            )

    for name, l in loc_map.items():
        if key in name or name in key:
            return ResolvedEntity(
                name=key, entity_type="location", entity_id=l.id, confidence=0.8
            )

    return None


async def get_campaign_context(
    db: AsyncSession,
    campaign_id: str,
) -> dict[str, list[str]]:
    """Get lists of entity names for a campaign (used in AI prompt)."""
    chars = (await db.execute(
        select(Character.name).where(Character.campaign_id == campaign_id)
    )).all()
    npcs = (await db.execute(
        select(NPC.name).where(NPC.campaign_id == campaign_id)
    )).all()
    locs = (await db.execute(
        select(Location.name).where(Location.campaign_id == campaign_id)
    )).all()

    return {
        "characters": [c[0] for c in chars],
        "npcs": [n[0] for n in npcs],
        "locations": [l[0] for l in locs],
    }
