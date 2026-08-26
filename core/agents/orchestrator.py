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

    def __init__(self):
        provider = get_provider_for_agent()
        self.session_processor = SessionProcessor(provider)
        self.lore_agent = LoreAgent(provider)
        self.narrator = NarratorAgent(provider)
        self.recap_agent = RecapAgent(provider)

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

        agent_result = await self.session_processor.run(
            campaign_id=campaign_id,
            session_id=session_id,
            raw_notes=raw_notes,
        )
        result.agent_results["session_processor"] = {
            "status": agent_result.status,
            "data": agent_result.data if agent_result.status == "success" else None,
            "error": agent_result.error,
        }
        result.summary = f"Processed session: status={agent_result.status}"

    async def _generate_recap(self, result: OrchestratorResult, campaign_id: str, **kwargs):
        session_number = kwargs.get("session_number", 1)
        agent_result = await self.narrator.run(
            campaign_id=campaign_id,
            scene_description=f"Generate a recap for session {session_number}",
            mood="reflective",
        )
        result.agent_results["recap"] = {
            "status": agent_result.status,
            "data": agent_result.data if agent_result.status == "success" else None,
        }
        result.summary = f"Generated recap for session {session_number}"

    async def _lore_inquiry(self, result: OrchestratorResult, campaign_id: str, **kwargs):
        query = kwargs.get("query", "")
        if not query:
            result.errors.append("query required")
            return

        agent_result = await self.lore_agent.run(
            campaign_id=campaign_id,
            question=query,
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

        agent_result = await self.narrator.run(
            campaign_id=campaign_id,
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

        await self._lore_inquiry(result, campaign_id, query="Describe the current state of the campaign")
        await self._narrate_scene(result, campaign_id, scene_description="Current campaign state", mood="neutral")

        result.summary = f"Full pipeline completed: {len(result.agent_results)} agents"
