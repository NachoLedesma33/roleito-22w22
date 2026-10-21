"""Narrative engine routes — parse DM text into structured events."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_session
from models import Campaign, Session
from auth import require_dm, AuthSession
from core.narrative.entity_resolver import get_campaign_context, resolve_entities
from core.narrative.parser import parse_narrative
from core.narrative.proposer import propose_events
from core.agents.provider import get_ai_config, get_provider_for_agent

router = APIRouter(tags=["narrative"])


class NarrativeParseRequest(BaseModel):
    text: str
    session_id: str
    scene_name: str | None = None


class NarrativeEventResponse(BaseModel):
    event_id: str
    type: str
    description: str
    actor_id: str | None
    target_id: str | None
    location_id: str | None
    confidence: float
    unresolved_actors: list[str]
    unresolved_targets: list[str]


class NarrativeParseResponse(BaseModel):
    events: list[NarrativeEventResponse]
    warnings: list[str]
    raw_count: int


@router.post(
    "/campaigns/{campaign_id}/narrative/parse",
    response_model=NarrativeParseResponse,
)
async def parse_narrative_text(
    campaign_id: str,
    body: NarrativeParseRequest,
    db: AsyncSession = Depends(get_session),
    _auth: AuthSession = Depends(require_dm),
):
    """Parse DM narration text into structured event proposals.

    Es una ruta de IA: llama al modelo con el contexto de la campana y gasta
    la API key del DM. Exige rol DM (S1): un jugador no puede usarla.
    """
    campaign = (await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )).scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    session = (await db.execute(
        select(Session).where(
            Session.id == body.session_id,
            Session.campaign_id == campaign_id,
        )
    )).scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if not body.text.strip():
        return NarrativeParseResponse(events=[], warnings=[], raw_count=0)

    config = get_ai_config()
    provider = get_provider_for_agent()

    context = await get_campaign_context(db, campaign_id)

    extracted = await parse_narrative(
        provider,
        body.text,
        campaign_name=campaign.name,
        scene_name=body.scene_name or "",
        characters=context["characters"],
        npcs=context["npcs"],
        locations=context["locations"],
        # El modelo que eligio el DM, no el default del provider.
        model=config.get("model"),
    )

    all_names = (
        [a for e in extracted for a in e.actors]
        + [t for e in extracted for t in e.targets]
        + [e.location for e in extracted if e.location]
    )
    unique_names = list(set(all_names))

    resolution = await resolve_entities(db, campaign_id, unique_names)

    result = await propose_events(
        db, campaign_id, body.session_id, extracted, resolution
    )

    await db.commit()

    return NarrativeParseResponse(
        events=[
            NarrativeEventResponse(
                event_id=p.event_id,
                type=p.type,
                description=p.description,
                actor_id=p.actor_id,
                target_id=p.target_id,
                location_id=p.location_id,
                confidence=p.confidence,
                unresolved_actors=p.unresolved_actors,
                unresolved_targets=p.unresolved_targets,
            )
            for p in result.proposed
        ],
        warnings=result.warnings,
        raw_count=len(extracted),
    )
