"""Event proposer — creates event proposals from extracted narrative events."""

from __future__ import annotations

from dataclasses import dataclass, field

from sqlalchemy.ext.asyncio import AsyncSession

from models import Event, gen_id
from core.narrative.entity_resolver import ResolutionResult
from core.narrative.parser import ExtractedEvent


@dataclass
class ProposedEvent:
    event_id: str
    type: str
    description: str
    actor_id: str | None
    target_id: str | None
    location_id: str | None
    confidence: float
    unresolved_actors: list[str] = field(default_factory=list)
    unresolved_targets: list[str] = field(default_factory=list)


@dataclass
class ProposalResult:
    proposed: list[ProposedEvent] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


async def propose_events(
    db: AsyncSession,
    campaign_id: str,
    session_id: str,
    extracted: list[ExtractedEvent],
    resolution: ResolutionResult,
) -> ProposalResult:
    """Create event proposals from extracted events with resolved entities."""
    result = ProposalResult()

    resolved_map = {r.name.lower(): r for r in resolution.resolved}

    for ext in extracted:
        actor_id = None
        target_id = None
        location_id = None
        unresolved_actors = []
        unresolved_targets = []

        for actor_name in ext.actors:
            r = resolved_map.get(actor_name.lower())
            if r and r.entity_type in ("character", "npc"):
                actor_id = r.entity_id
            else:
                unresolved_actors.append(actor_name)

        for target_name in ext.targets:
            r = resolved_map.get(target_name.lower())
            if r and r.entity_type in ("character", "npc"):
                target_id = r.entity_id
            else:
                unresolved_targets.append(target_name)

        if ext.location:
            r = resolved_map.get(ext.location.lower())
            if r and r.entity_type == "location":
                location_id = r.entity_id
            else:
                result.warnings.append(
                    f"Location '{ext.location}' not found in campaign"
                )

        event_id = gen_id()
        confidence = 0.9 if not unresolved_actors else 0.6

        db_event = Event(
            id=event_id,
            campaign_id=campaign_id,
            session_id=session_id,
            type=ext.type,
            actor_id=actor_id or "unknown",
            target_id=target_id,
            location_id=location_id,
            description=ext.description,
            confidence=confidence,
            status="PROPOSED",
        )
        db.add(db_event)

        result.proposed.append(
            ProposedEvent(
                event_id=event_id,
                type=ext.type,
                description=ext.description,
                actor_id=actor_id,
                target_id=target_id,
                location_id=location_id,
                confidence=confidence,
                unresolved_actors=unresolved_actors,
                unresolved_targets=unresolved_targets,
            )
        )

    await db.flush()
    return result
