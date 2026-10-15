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
from core.agents.ingestion import IngestionAgent, ingest_text, ingest_document
from core.agents.world_state import WorldStateAgent
from core.agents.scene_agent import SceneAgent
from core.agents.context_manager import (
    ContextProfile,
    build_context,
    filter_canon,
)


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


def _events(n, status="CANON"):
    return [{"type": "DIALOGUE", "description": f"event number {i} with padding text", "status": status} for i in range(n)]


def test_filter_canon_drops_proposed_by_default():
    events = _events(2, "CANON") + _events(2, "PROPOSED")
    kept = filter_canon(events)
    assert len(kept) == 2
    assert all(e["status"] == "CANON" for e in kept)


def test_filter_canon_opt_in_keeps_all():
    events = _events(1, "CANON") + _events(1, "PROPOSED")
    kept = filter_canon(events, ContextProfile(canon_only=False))
    assert len(kept) == 2


def test_build_context_trims_oldest_first_to_budget():
    events = _events(20, "CANON")
    ctx = build_context(
        campaign_name="Saga",
        characters=[{"name": "Ardan", "description": "hero"}],
        events=events,
        profile=ContextProfile(max_chars=300),
    )
    assert ctx.chars <= 300
    assert ctx.truncated
    assert ctx.events_included + ctx.events_dropped == 20
    assert "event number 0" in ctx.text
    assert "event number 19" not in ctx.text


def test_build_context_empty_is_minimal():
    ctx = build_context()
    assert ctx.text == ""
    assert ctx.chars == 0
    assert not ctx.truncated


def test_build_context_verbatim_campaign_context():
    ctx = build_context(campaign_context="Epic saga")
    assert "Epic saga" in ctx.text

async def test_lore_wiring_filters_proposed_events():
    agent = LoreAgent(_mock())
    res = await agent.run(
        question="What happened?",
        characters=[{"name": "Ardan", "description": "hero"}],
        events=[
            {"type": "DIALOGUE", "description": "canon talk", "status": "CANON"},
            {"type": "DIALOGUE", "description": "draft talk", "status": "PROPOSED"},
        ],
    )
    assert res.status == "success", res.error
    assert res.data.answer


def test_ingest_text_normalizes_and_segments():
    raw = ingest_text("  Title line\r\n\n\nBody  \nline2\n\n\n\nTail", source="dm-notes", title="S1")
    assert raw.title == "S1"
    assert raw.source == "dm-notes"
    assert "\r" not in raw.body
    assert "\n\n\n" not in raw.body
    assert raw.segments == ["  Title line", "Body\nline2", "Tail"]
    assert raw.chars == len(raw.body)


def test_ingest_document_titles_from_filename():
    raw = ingest_document("quests.md", "Find the amulet.")
    assert raw.title == "quests"
    assert raw.source == "document"
    assert raw.segments == ["Find the amulet."]


async def test_ingestion_agent_run_ok_and_blank_errors():
    agent = IngestionAgent(_mock())
    ok = await agent.run(text="Party rests.", title="Night")
    assert ok.status == "success"
    assert ok.agent_id == "ingestion"
    assert ok.data.title == "Night"
    bad = await agent.run(text="   \n  ")
    assert bad.status == "error"


async def test_world_state_success():
    agent = WorldStateAgent(_mock())
    res = await agent.run(
        question="Where is Ardan?",
        characters=[{"name": "Ardan", "location": "Dungeon entrance"}],
        quests=[{"title": "Find the amulet", "status": "active"}],
    )
    assert res.status == "success", res.error
    assert res.agent_id == "world-state"
    assert res.data.answer
    assert isinstance(res.data.positions, list)
    assert isinstance(res.data.active_quests, list)


async def test_world_state_empty_question_errors():
    agent = WorldStateAgent(_mock())
    res = await agent.run(question="  ")
    assert res.status == "error"


async def test_world_state_garbage_json_errors():
    agent = WorldStateAgent(GarbageProvider())
    res = await agent.run(question="Where is Ardan?")
    assert res.status == "error"


async def test_scene_success():
    agent = SceneAgent(_mock())
    res = await agent.run(scene_description="The party enters an underground prison.", mood="tense")
    assert res.status == "success", res.error
    assert res.agent_id == "scene"
    assert res.data.environment
    assert res.data.lighting in ("dark", "dim", "neutral", "bright")
    assert isinstance(res.data.structures, list)


async def test_scene_empty_description_errors():
    agent = SceneAgent(_mock())
    res = await agent.run(scene_description="  ")
    assert res.status == "error"


async def test_scene_garbage_json_errors():
    agent = SceneAgent(GarbageProvider())
    res = await agent.run(scene_description="The party enters an underground prison.")
    assert res.status == "error"
