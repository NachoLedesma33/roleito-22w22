"""Narrative engine routes — parse DM text into structured events."""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_session
from models import Campaign, Session
from core.narrative.entity_resolver import get_campaign_context, resolve_entities
from core.narrative.parser import parse_narrative
from core.narrative.proposer import propose_events
from infrastructure.ai import build_provider

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
):
    """Parse DM narration text into structured event proposals."""
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

    config_path = Path("data/ai_config.json")
    if config_path.exists():
        config = json.loads(config_path.read_text())
    else:
        config = {"provider": "mock"}

    provider = build_provider(
        config.get("provider", "mock"),
        local_base_url=config.get("local_base_url"),
        remote_base_url=config.get("remote_base_url"),
    )

    context = await get_campaign_context(db, campaign_id)

    extracted = await parse_narrative(
        provider,
        body.text,
        campaign_name=campaign.name,
        scene_name=body.scene_name or "",
        characters=context["characters"],
        npcs=context["npcs"],
        locations=context["locations"],
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
