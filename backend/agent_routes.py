"""Agent routes — API endpoints for AI agents."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_session
from models import Campaign, Session, Character, NPC, Location, Event
from core.agents.session_processor import SessionProcessor
from core.agents.lore_agent import LoreAgent
from core.agents.narrator import NarratorAgent
from core.agents.recap import RecapAgent
from core.agents.provider import get_provider_for_agent
from auth import require_dm, AuthSession

router = APIRouter(tags=["agents"])


class SessionProcessRequest(BaseModel):
    session_id: str


class LoreQueryRequest(BaseModel):
    question: str


class NarrateRequest(BaseModel):
    scene_description: str = ""
    current_action: str = ""
    characters_present: list[str] | None = None
    mood_hint: str = ""


class RecapRequest(BaseModel):
    session_id: str
    previous_recap: str = ""


@router.post("/campaigns/{campaign_id}/agents/process-session")
async def process_session(
    campaign_id: str,
    body: SessionProcessRequest,
    db: AsyncSession = Depends(get_session),
    _auth: AuthSession = Depends(require_dm),
):
    """Process session notes into structured data."""
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

    provider = get_provider_for_agent()
    agent = SessionProcessor(provider)

    result = await agent.run(
        raw_notes=session.raw_notes or session.summary or "",
        campaign_context=campaign.description or "",
    )

    return {
        "agent_id": result.agent_id,
        "status": result.status,
        "data": {
            "summary": result.data.summary if result.data else "",
            "events": result.data.events if result.data else [],
            "entities": result.data.entities if result.data else {},
            "thread_hooks": result.data.thread_hooks if result.data else [],
            "character_changes": result.data.character_changes if result.data else [],
        } if result.data else None,
        "error": result.error,
    }


@router.post("/campaigns/{campaign_id}/agents/lore")
async def query_lore(
    campaign_id: str,
    body: LoreQueryRequest,
    db: AsyncSession = Depends(get_session),
    _auth: AuthSession = Depends(require_dm),
):
    """Query campaign lore."""
    campaign = (await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )).scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    chars = (await db.execute(
        select(Character).where(Character.campaign_id == campaign_id)
    )).scalars().all()

    npcs = (await db.execute(
        select(NPC).where(NPC.campaign_id == campaign_id)
    )).scalars().all()

    locs = (await db.execute(
        select(Location).where(Location.campaign_id == campaign_id)
    )).scalars().all()

    events = (await db.execute(
        select(Event).where(Event.campaign_id == campaign_id).order_by(Event.id.desc()).limit(20)
    )).scalars().all()

    provider = get_provider_for_agent()
    agent = LoreAgent(provider)

    result = await agent.run(
        question=body.question,
        campaign_context=f"{campaign.name}: {campaign.description or ''}",
        characters=[{"name": c.name, "description": c.description} for c in chars],
        npcs=[{"name": n.name, "description": n.description} for n in npcs],
        locations=[{"name": l.name, "description": l.description} for l in locs],
        events=[{"type": e.type, "description": e.description} for e in events],
    )

    return {
        "agent_id": result.agent_id,
        "status": result.status,
        "data": {
            "answer": result.data.answer if result.data else "",
            "entities_mentioned": result.data.entities_mentioned if result.data else [],
            "confidence": result.data.confidence if result.data else 0,
            "related_topics": result.data.related_topics if result.data else [],
            "source_hint": result.data.source_hint if result.data else "",
        } if result.data else None,
        "error": result.error,
    }


@router.post("/campaigns/{campaign_id}/agents/narrate")
async def narrate(
    campaign_id: str,
    body: NarrateRequest,
    db: AsyncSession = Depends(get_session),
    _auth: AuthSession = Depends(require_dm),
):
    """Generate atmospheric narration for a scene."""
    campaign = (await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )).scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    provider = get_provider_for_agent()
    agent = NarratorAgent(provider)

    result = await agent.run(
        scene_description=body.scene_description,
        current_action=body.current_action,
        characters_present=body.characters_present,
        mood_hint=body.mood_hint,
    )

    return {
        "agent_id": result.agent_id,
        "status": result.status,
        "data": {
            "narration": result.data.narration if result.data else "",
            "mood": result.data.mood if result.data else "",
            "environmental_cues": result.data.environmental_cues if result.data else [],
            "suggested_effects": result.data.suggested_effects if result.data else [],
        } if result.data else None,
        "error": result.error,
    }


@router.post("/campaigns/{campaign_id}/agents/recap")
async def recap_session(
    campaign_id: str,
    body: RecapRequest,
    db: AsyncSession = Depends(get_session),
    _auth: AuthSession = Depends(require_dm),
):
    """Generate a session recap."""
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

    provider = get_provider_for_agent()
    agent = RecapAgent(provider)

    result = await agent.run(
        session_notes=session.raw_notes or "",
        session_summary=session.summary or "",
        previous_recap=body.previous_recap,
        campaign_context=campaign.description or "",
    )

    return {
        "agent_id": result.agent_id,
        "status": result.status,
        "data": {
            "recap": result.data.recap if result.data else "",
            "highlights": result.data.highlights if result.data else [],
            "cliffhanger": result.data.cliffhanger if result.data else "",
            "next_session_hook": result.data.next_session_hook if result.data else "",
        } if result.data else None,
        "error": result.error,
    }
