"""Tests for core AI agents with the deterministic mock provider (no network)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from infrastructure.ai.base import AIProvider
from infrastructure.ai.mock import MockProvider
from core.agents.lore_agent import LoreAgent
from core.agents.narrator import NarratorAgent
from core.agents.recap import RecapAgent
from core.agents.session_processor import SessionProcessor
from core.agents.orchestrator import OrchestratorAgent, TaskType


class GarbageProvider(AIProvider):
    name = "garbage"

    async def complete(self, prompt, *, system="", model=None, max_tokens=512, temperature=0.7):
        return "this is not json {{"


def _mock():
    return MockProvider()


def _orch():
    # __new__ + inyección directa: evita leer data/ai_config.json real.
    orch = OrchestratorAgent.__new__(OrchestratorAgent)
    provider = _mock()
    orch.session_processor = SessionProcessor(provider)
    orch.lore_agent = LoreAgent(provider)
    orch.narrator = NarratorAgent(provider)
    orch.recap_agent = RecapAgent(provider)
    return orch


async def test_lore_success():
    agent = LoreAgent(_mock())
    res = await agent.run(question="Who is Ardan?", campaign_context="Epic campaign")
    assert res.status == "success", res.error
    assert res.agent_id == "lore"
    assert res.data.answer
    assert isinstance(res.data.entities_mentioned, list)
    assert 0 <= res.data.confidence <= 1


async def test_lore_empty_question_errors():
    agent = LoreAgent(_mock())
    res = await agent.run(question="   ")
    assert res.status == "error"


async def test_lore_garbage_json_errors():
    agent = LoreAgent(GarbageProvider())
    res = await agent.run(question="Who is Ardan?")
    assert res.status == "error"


async def test_narrator_success():
    agent = NarratorAgent(_mock())
    res = await agent.run(scene_description="Dark crypt", mood_hint="tense")
    assert res.status == "success", res.error
    assert res.data.narration
    assert res.data.mood


async def test_narrator_empty_context_errors():
    agent = NarratorAgent(_mock())
    res = await agent.run()
    assert res.status == "error"


async def test_recap_success():
    agent = RecapAgent(_mock())
    res = await agent.run(session_notes="Party entered the dungeon.")
    assert res.status == "success", res.error
    assert res.data.recap
    assert isinstance(res.data.highlights, list)


async def test_session_processor_success():
    agent = SessionProcessor(_mock())
    res = await agent.run(raw_notes="Party entered the dungeon and fought goblins.")
    assert res.status == "success", res.error
    assert res.data.summary
    assert len(res.data.events) > 0


async def test_orchestrator_lore_inquiry():
    orch = _orch()
    res = await orch.execute(TaskType.LORE_INQUIRY, "camp-1", query="Who is Ardan?")
    assert res.status == "completed", res.errors
    assert res.agent_results["lore"]["status"] == "success"


async def test_orchestrator_recap_uses_recap_agent():
    orch = _orch()
    res = await orch.execute(TaskType.GENERATE_RECAP, "camp-1", raw_notes="Party entered the dungeon.")
    assert res.status == "completed", res.errors
    data = res.agent_results["recap"]["data"]
    assert data is not None
    assert hasattr(data, "recap") and hasattr(data, "highlights")
    assert not hasattr(data, "narration")


async def test_orchestrator_process_session_missing_id_is_partial():
    orch = _orch()
    res = await orch.execute(TaskType.PROCESS_SESSION, "camp-1")
    assert res.status == "partial"
    assert res.errors
