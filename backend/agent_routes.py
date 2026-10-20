"""Agent routes — API endpoints for AI agents."""

from __future__ import annotations

import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_session
from models import Campaign, Session, Character, NPC, Location, Event, Quest
from core.agents.session_processor import SessionProcessor
from core.agents.lore_agent import LoreAgent
from core.agents.narrator import NarratorAgent
from core.agents.recap import RecapAgent
from core.agents.ingestion import IngestionAgent
from core.agents.scene_agent import SceneAgent
from core.agents.world_state import WorldStateAgent
from core.agents.provider import get_provider_for_agent
from core.events.bus import get_event_bus
from core.narrative.entity_resolver import resolve_entities
from core.narrative.parser import ExtractedEvent
from core.narrative.proposer import propose_events
from core.world.engine import WorldStateEngine
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


class IngestRequest(BaseModel):
    """Texto externo a normalizar. `filename` lo usa para deducir el titulo."""
    text: str = ""
    source: str = "dm-notes"
    title: str = ""
    filename: str = ""


class WorldStateRequest(BaseModel):
    question: str


class SceneRequest(BaseModel):
    scene_description: str = ""
    mood: str = ""


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

    # El flujo del producto (docs/AGENTS.md §104) es Ingestion -> Session
    # Processor: las notas crudas se normalizan y segmentan antes de que el
    # modelo las vea. La ingestion no juzga el canon, solo limpia.
    raw_notes = session.raw_notes or session.summary or ""
    ingestion = IngestionAgent(provider)
    ingested = await ingestion.run(text=raw_notes, source="session-notes")
    ingestion_data = None
    if ingested.status == "success" and ingested.data:
        raw_notes = ingested.data.body
        ingestion_data = {
            "chars": ingested.data.chars,
            "segments": ingested.data.segments,
            "body": ingested.data.body,
        }

    result = await agent.run(
        raw_notes=raw_notes,
        campaign_context=campaign.description or "",
    )

    # La IA no escribe al canon: propone eventos PROPOSED y el DM los aprueba
    # (el mismo camino que /narrative/parse). Antes esto solo devolvia JSON y
    # el DM tenia que copiar los eventos a mano.
    extracted = [
        ExtractedEvent(
            type=str(e.get("type") or "NARRATIVE"),
            description=str(e.get("description") or ""),
            actors=[str(a) for a in (e.get("actors") or [])],
            targets=[str(t) for t in (e.get("targets") or [])],
            location=str(e["location"]) if e.get("location") else None,
            importance=str(e.get("importance") or "NORMAL"),
        )
        for e in (result.data.events if result.data else [])
        if isinstance(e, dict) and (e.get("description") or e.get("type"))
    ]

    proposed: list[dict] = []
    warnings: list[str] = []
    if extracted:
        names = list({
            name
            for e in extracted
            for name in ([*e.actors, *e.targets] + ([e.location] if e.location else []))
        })
        resolution = await resolve_entities(db, campaign_id, names)
        proposal = await propose_events(
            db, campaign_id, session.id, extracted, resolution
        )
        await db.commit()
        proposed = [
            {
                "event_id": p.event_id,
                "type": p.type,
                "description": p.description,
                "actor_id": p.actor_id,
                "target_id": p.target_id,
                "location_id": p.location_id,
                "confidence": p.confidence,
                "unresolved_actors": p.unresolved_actors,
                "unresolved_targets": p.unresolved_targets,
            }
            for p in proposal.proposed
        ]
        warnings = proposal.warnings
        await get_event_bus().emit(
            "session.processed",
            {
                "campaign_id": campaign_id,
                "session_id": session.id,
                "event_ids": [p["event_id"] for p in proposed],
            },
            source="session-processor",
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
        # Los eventos propuestos quedan en la DB con status PROPOSED: el DM los
        # revisa y aprueba (PUT /events/{id}).
        "proposed_events": proposed,
        "warnings": warnings,
        # Como quedaron normalizadas las notas antes de procesarlas.
        "ingestion": ingestion_data,
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
    """Generate a session recap.

    El recap se guarda en la sesion: antes vivia solo en el navegador y se
    perdia al recargar. Si el body no trae `previous_recap`, se usa el recap
    guardado de la sesion ANTERIOR (la continuidad que el agente necesita).
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

    previous_recap = body.previous_recap
    if not previous_recap:
        prev = (await db.execute(
            select(Session).where(
                Session.campaign_id == campaign_id,
                Session.number < session.number,
            ).order_by(Session.number.desc())
        )).scalars().first()
        prev_data = prev.ai_recap if prev else None
        if prev_data:
            previous_recap = prev_data.get("recap", "")

    provider = get_provider_for_agent()
    agent = RecapAgent(provider)

    result = await agent.run(
        session_notes=session.raw_notes or "",
        session_summary=session.summary or "",
        previous_recap=previous_recap,
        campaign_context=campaign.description or "",
    )

    recap_data = None
    if result.data and result.data.recap:
        recap_data = {
            "recap": result.data.recap,
            "highlights": result.data.highlights,
            "cliffhanger": result.data.cliffhanger,
            "next_session_hook": result.data.next_session_hook,
        }
        session.ai_recap_json = json.dumps(recap_data, ensure_ascii=False)
        await db.commit()

    return {
        "agent_id": result.agent_id,
        "status": result.status,
        "data": recap_data,
        "error": result.error,
    }


@router.post("/campaigns/{campaign_id}/agents/ingest")
async def ingest_notes(
    campaign_id: str,
    body: IngestRequest,
    db: AsyncSession = Depends(get_session),
    _auth: AuthSession = Depends(require_dm),
):
    """Normaliza texto externo (notas del DM, documentos) en una sesion cruda.

    El agente de ingestion NO juzga el canon: solo limpia y segmenta. El
    Session Processor y el DM son los que deciden despues.
    """
    campaign = (await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )).scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    agent = IngestionAgent(get_provider_for_agent())
    result = await agent.run(
        text=body.text,
        source=body.source,
        title=body.title,
        filename=body.filename,
    )

    return {
        "agent_id": result.agent_id,
        "status": result.status,
        "data": result.data.to_dict() if result.data else None,
        "error": result.error,
    }


@router.post("/campaigns/{campaign_id}/agents/world-state")
async def query_world_state(
    campaign_id: str,
    body: WorldStateRequest,
    db: AsyncSession = Depends(get_session),
    _auth: AuthSession = Depends(require_dm),
):
    """Responde con el estado ACTUAL de la campana (posiciones, misiones, NPCs).

    El estado sale del World State Engine (los eventos aprobados). El agente
    solo puede usar el estado que se le pasa: nunca inventa entidades.
    """
    campaign = (await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )).scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    state = await WorldStateEngine(db).compute(campaign_id)

    def location_name(entity) -> str:
        loc = state.locations.get(entity.current_location_id or "")
        return loc.name if loc else "unknown"

    quests = (await db.execute(
        select(Quest).where(Quest.campaign_id == campaign_id)
    )).scalars().all()

    characters = [
        {"name": c.name, "location": location_name(c)}
        for c in state.characters.values()
    ]
    npcs = [
        {"name": n.name, "location": location_name(n)}
        for n in state.npcs.values()
    ]
    locations = [{"name": l.name, "description": l.status} for l in state.locations.values()]
    quest_list = [{"title": q.title, "status": q.status} for q in quests]

    agent = WorldStateAgent(get_provider_for_agent())
    result = await agent.run(
        question=body.question,
        characters=characters,
        npcs=npcs,
        locations=locations,
        quests=quest_list,
    )

    return {
        "agent_id": result.agent_id,
        "status": result.status,
        "data": {
            "answer": result.data.answer if result.data else "",
            "positions": result.data.positions if result.data else [],
            "active_quests": result.data.active_quests if result.data else [],
            "confidence": result.data.confidence if result.data else 0,
        } if result.data else None,
        # El estado sobre el que respondio: para que el DM vea de donde salio
        # la respuesta y no la tome por un dato inventado.
        "state": {
            "characters": characters,
            "npcs": npcs,
            "locations": locations,
            "quests": quest_list,
        },
        "error": result.error,
    }


@router.post("/campaigns/{campaign_id}/agents/scene")
async def design_scene(
    campaign_id: str,
    body: SceneRequest,
    db: AsyncSession = Depends(get_session),
    _auth: AuthSession = Depends(require_dm),
):
    """Propone la configuracion visual de una escena a partir de su descripcion.

    No escribe nada: devuelve environment, lighting, atmosphere, structures y
    mood para que el DM lo use o lo descarte.
    """
    campaign = (await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )).scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    agent = SceneAgent(get_provider_for_agent())
    result = await agent.run(
        scene_description=body.scene_description,
        mood=body.mood,
    )

    return {
        "agent_id": result.agent_id,
        "status": result.status,
        "data": {
            "environment": result.data.environment if result.data else "",
            "lighting": result.data.lighting if result.data else "",
            "atmosphere": result.data.atmosphere if result.data else {},
            "structures": result.data.structures if result.data else [],
            "mood": result.data.mood if result.data else "",
        } if result.data else None,
        "error": result.error,
    }
