"""Orchestrator Agent — coordinates specialized agents for complex tasks."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

from infrastructure.ai import AIProvider
from core.agents.session_processor import SessionProcessor
from core.agents.lore_agent import LoreAgent
from core.agents.narrator import NarratorAgent
from core.agents.recap import RecapAgent
from core.agents.provider import get_provider_for_agent


class TaskType(str, Enum):
    PROCESS_SESSION = "process_session"
    GENERATE_RECAP = "generate_recap"
    LORE_INQUIRY = "lore_inquiry"
    NARRATE_SCENE = "narrate_scene"
    FULL_PIPELINE = "full_pipeline"


@dataclass
class OrchestratorResult:
    task_type: str
    status: str
    agent_results: dict = field(default_factory=dict)
    summary: str = ""
    errors: list[str] = field(default_factory=list)
    execution_time_ms: int = 0


class OrchestratorAgent:
    """Coordinates specialized agents for complex multi-step tasks.

    The Orchestrator does not perform tasks itself — it delegates
    to specialized agents and validates their output.
    """

    def __init__(self, db=None):
        """`db` es la sesion de SQLAlchemy. Sin ella el orquestador coordina
        pero no ve la campana: los sub-agentes responden sin contexto.
        """
        provider = get_provider_for_agent()
        self.db = db
        self.session_processor = SessionProcessor(provider)
        self.lore_agent = LoreAgent(provider)
        self.narrator = NarratorAgent(provider)
        self.recap_agent = RecapAgent(provider)

    async def _campaign_data(self, campaign_id: str) -> dict:
        """Datos reales de la campana para los sub-agentes.

        El mismo armado que `POST /agents/lore`: personajes, NPCs, lugares y los
        ultimos 20 eventos. Sin db (o sin campana) devuelve vacio y los
        agentes quedan como estaban: sin contexto.
        """
        if self.db is None:
            return {}

        from sqlalchemy import select
        from backend.models import Campaign, Character, Event, Location, NPC

        campaign = (await self.db.execute(
            select(Campaign).where(Campaign.id == campaign_id)
        )).scalar_one_or_none()
        if not campaign:
            return {}

        chars = (await self.db.execute(
            select(Character).where(Character.campaign_id == campaign_id)
        )).scalars().all()
        npcs = (await self.db.execute(
            select(NPC).where(NPC.campaign_id == campaign_id)
        )).scalars().all()
        locs = (await self.db.execute(
            select(Location).where(Location.campaign_id == campaign_id)
        )).scalars().all()
        events = (await self.db.execute(
            select(Event).where(Event.campaign_id == campaign_id).order_by(Event.id.desc()).limit(20)
        )).scalars().all()

        return {
            "campaign_name": campaign.name,
            "campaign_context": f"{campaign.name}: {campaign.description or ''}",
            "characters": [{"name": c.name, "description": c.description} for c in chars],
            "npcs": [{"name": n.name, "description": n.description} for n in npcs],
            "locations": [{"name": l.name, "description": l.description} for l in locs],
            "events": [{"type": e.type, "description": e.description} for e in events],
        }

    async def _session_notes(self, campaign_id: str, session_id: str | None, fallback: str) -> str:
        """Las notas reales de la sesion. Sin `session_id` o sin db, lo que haya."""
        if not session_id or self.db is None:
            return fallback

        from sqlalchemy import select
        from backend.models import Session

        session = (await self.db.execute(
            select(Session).where(
                Session.id == session_id,
                Session.campaign_id == campaign_id,
            )
        )).scalar_one_or_none()
        if not session:
            return fallback
        return session.raw_notes or session.summary or fallback

    async def execute(self, task_type: TaskType, campaign_id: str, **kwargs) -> OrchestratorResult:
        start = datetime.utcnow()
        result = OrchestratorResult(task_type=task_type.value, status="running")

        try:
            if task_type == TaskType.PROCESS_SESSION:
                await self._process_session(result, campaign_id, **kwargs)
            elif task_type == TaskType.GENERATE_RECAP:
                await self._generate_recap(result, campaign_id, **kwargs)
            elif task_type == TaskType.LORE_INQUIRY:
                await self._lore_inquiry(result, campaign_id, **kwargs)
            elif task_type == TaskType.NARRATE_SCENE:
                await self._narrate_scene(result, campaign_id, **kwargs)
            elif task_type == TaskType.FULL_PIPELINE:
                await self._full_pipeline(result, campaign_id, **kwargs)

            result.status = "completed" if not result.errors else "partial"
        except Exception as e:
            result.status = "failed"
            result.errors.append(str(e))

        elapsed = (datetime.utcnow() - start).total_seconds() * 1000
        result.execution_time_ms = int(elapsed)
        return result

    async def _process_session(self, result: OrchestratorResult, campaign_id: str, **kwargs):
        session_id = kwargs.get("session_id")
        raw_notes = kwargs.get("raw_notes", "")

        if not session_id:
            result.errors.append("session_id required")
            return

        raw_notes = await self._session_notes(campaign_id, session_id, raw_notes)
        data = await self._campaign_data(campaign_id)

        agent_result = await self.session_processor.run(
            raw_notes=raw_notes,
            campaign_context=data.get("campaign_context", ""),
        )
        result.agent_results["session_processor"] = {
            "status": agent_result.status,
            "data": agent_result.data if agent_result.status == "success" else None,
            "error": agent_result.error,
        }
        result.summary = f"Processed session: status={agent_result.status}"

    async def _generate_recap(self, result: OrchestratorResult, campaign_id: str, **kwargs):
        notes = await self._session_notes(
            campaign_id, kwargs.get("session_id"), kwargs.get("raw_notes", "")
        )

        agent_result = await self.recap_agent.run(session_notes=notes)
        result.agent_results["recap"] = {
            "status": agent_result.status,
            "data": agent_result.data if agent_result.status == "success" else None,
        }
        result.summary = f"Generated recap: status={agent_result.status}"

    async def _lore_inquiry(self, result: OrchestratorResult, campaign_id: str, **kwargs):
        query = kwargs.get("query", "")
        if not query:
            result.errors.append("query required")
            return

        data = await self._campaign_data(campaign_id)

        agent_result = await self.lore_agent.run(
            question=query,
            campaign_context=data.get("campaign_context", ""),
            characters=data.get("characters"),
            npcs=data.get("npcs"),
            locations=data.get("locations"),
            events=data.get("events"),
        )
        result.agent_results["lore"] = {
            "status": agent_result.status,
            "data": agent_result.data if agent_result.status == "success" else None,
            "error": agent_result.error,
        }
        result.summary = f"Lore inquiry: status={agent_result.status}"

    async def _narrate_scene(self, result: OrchestratorResult, campaign_id: str, **kwargs):
        scene_description = kwargs.get("scene_description", "")
        mood = kwargs.get("mood", "neutral")
        if not scene_description:
            data = await self._campaign_data(campaign_id)
            scene_description = data.get("campaign_context", "")

        agent_result = await self.narrator.run(
            scene_description=scene_description,
            mood=mood,
        )
        result.agent_results["narrator"] = {
            "status": agent_result.status,
            "data": agent_result.data if agent_result.status == "success" else None,
        }
        result.summary = f"Narrated scene: status={agent_result.status}"

    async def _full_pipeline(self, result: OrchestratorResult, campaign_id: str, **kwargs):
        session_id = kwargs.get("session_id")
        if session_id:
            await self._process_session(result, campaign_id, session_id=session_id, raw_notes=kwargs.get("raw_notes", ""))

        # La pregunta y la escena salen de la campana real, no de textos fijos.
        data = await self._campaign_data(campaign_id)
        name = data.get("campaign_name", "")
        await self._lore_inquiry(
            result, campaign_id, query=f"¿Cuál es el estado actual de {name}?"
        )
        await self._narrate_scene(
            result, campaign_id, scene_description=data.get("campaign_context", ""), mood="neutral"
        )

        result.summary = f"Full pipeline completed: {len(result.agent_results)} agents"
