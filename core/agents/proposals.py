"""La acción de proponer: el agente propone, el DM autoriza.

Un solo camino para los dos que procesan una sesión:

- `POST /campaigns/{id}/agents/process-session` (el router)
- el `full_pipeline` del orquestador

Si el DM procesa la sesion por cualquiera de los dos, los eventos quedan
`PROPOSED` en la DB y el DM los aprueba uno por uno (`PUT /events/{id}`).
Ninguna de las dos rutas escribe canon aprobado.

El flujo del canon es `docs/EVENT-SYSTEM.md`: PROPOSED -> REVIEW -> APPROVED.
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from core.events.bus import get_event_bus
from core.narrative.entity_resolver import resolve_entities
from core.narrative.parser import ExtractedEvent
from core.narrative.proposer import ProposedEvent, propose_events


def events_to_extracted(events: list[dict]) -> list[ExtractedEvent]:
    """Los eventos del LLM (dicts) al tipo del extractor de narrativa.

    El Session Processor devuelve `{"type", "description", "actors", "targets",
    "location", "importance"}`; el proposer trabaja con `ExtractedEvent`.
    """
    extracted: list[ExtractedEvent] = []
    for e in events or []:
        if not isinstance(e, dict):
            continue
        description = str(e.get("description") or "")
        etype = str(e.get("type") or "")
        if not description and not etype:
            continue
        extracted.append(
            ExtractedEvent(
                type=etype or "NARRATIVE",
                description=description,
                actors=[str(a) for a in (e.get("actors") or [])],
                targets=[str(t) for t in (e.get("targets") or [])],
                location=str(e["location"]) if e.get("location") else None,
                importance=str(e.get("importance") or "NORMAL"),
            )
        )
    return extracted


async def propose_session_events(
    db: AsyncSession,
    campaign_id: str,
    session_id: str,
    events: list[dict],
) -> tuple[list[ProposedEvent], list[str]]:
    """Deja los eventos del LLM como proposals PROPOSED en la DB.

    Devuelve (proposals, warnings). Los warnings son los nombres que no se
    pudieron resolver (actores o lugares que no existen en la campaña): el
    evento se propone igual, pero con menos confianza.
    """
    extracted = events_to_extracted(events)
    if not extracted:
        return [], []

    names = list({
        name
        for e in extracted
        for name in ([*e.actors, *e.targets] + ([e.location] if e.location else []))
    })
    resolution = await resolve_entities(db, campaign_id, names)
    result = await propose_events(db, campaign_id, session_id, extracted, resolution)
    await db.commit()

    await get_event_bus().emit(
        "session.processed",
        {
            "campaign_id": campaign_id,
            "session_id": session_id,
            "event_ids": [p.event_id for p in result.proposed],
        },
        source="session-processor",
    )
    return result.proposed, result.warnings
