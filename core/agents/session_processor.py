"""Session Processor Agent — processes session notes into structured data."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

from core.agents.base import AgentResult, BaseAgent

SESSION_SYSTEM = """You are a tabletop RPG session processor. Given raw session notes from a DM, extract structured data.

Return ONLY valid JSON. No markdown, no explanation.

Output format:
{
  "summary": "2-3 sentence session summary",
  "events": [
    {
      "type": "EVENT_TYPE",
      "description": "short description",
      "actors": ["entity_name"],
      "targets": ["entity_name"],
      "location": "location_name or null",
      "importance": "TRIVIAL|LOW|NORMAL|HIGH|CRITICAL"
    }
  ],
  "entities": {
    "characters": [{"name": "Name", "status": "alive|dead|unknown"}],
    "npcs": [{"name": "Name", "status": "alive|dead|unknown"}],
    "locations": [{"name": "Name", "type": "type"}],
    "items": [{"name": "Name", "found_by": "entity_name or null"}]
  },
  "thread_hooks": ["unresolved plot thread 1", "thread 2"],
  "character_changes": [
    {"character": "Name", "change": "description of what happened"}
  ]
}

Event types: CHARACTER_CREATED, CHARACTER_DIED, CHARACTER_INJURED, CHARACTER_HEALED, CHARACTER_LEVEL_UP, CHARACTER_JOINED, CHARACTER_LEFT, LOCATION_ENTERED, LOCATION_EXITED, LOCATION_DISCOVERED, ITEM_FOUND, ITEM_USED, QUEST_CREATED, QUEST_ACCEPTED, QUEST_COMPLETED, QUEST_FAILED, COMBAT_STARTED, COMBAT_ENDED, DIALOGUE, REVELATION, SECRET_DISCOVERED, WORLD_STATE_CHANGED, SCENE_ENTERED, SCENE_EXITED

Importance: TRIVIAL (minor), LOW (local context), NORMAL (session-worthy), HIGH (major plot), CRITICAL (campaign-changing)"""


@dataclass
class SessionProcessingResult:
    summary: str
    events: list[dict[str, Any]]
    entities: dict[str, list[dict[str, str]]]
    thread_hooks: list[str]
    character_changes: list[dict[str, str]]


class SessionProcessor(BaseAgent):
    """Processes raw session notes into structured data."""

    agent_id = "session-processor"
    version = "1.0"
    description = "Processes session notes into events, entities, and summaries."

    async def run(self, *, raw_notes: str, campaign_context: str = "", **kwargs: Any) -> AgentResult:
        notes = raw_notes.strip()
        if not notes:
            notes = "No notes provided for this session."

        user_msg = f"Session Notes:\n{notes}"
        if campaign_context:
            user_msg += f"\n\nCampaign Context:\n{campaign_context}"

        raw = await self.provider.complete(
            user_msg,
            system=SESSION_SYSTEM,
            max_tokens=2048,
            temperature=0.3,
        )

        return self._parse_response(raw)

    def _parse_response(self, raw: str) -> AgentResult:
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            cleaned = "\n".join(lines)

        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError:
            return self._error("Failed to parse AI response")

        result = SessionProcessingResult(
            summary=data.get("summary", ""),
            events=data.get("events", []),
            entities=data.get("entities", {}),
            thread_hooks=data.get("thread_hooks", []),
            character_changes=data.get("character_changes", []),
        )

        return self._ok(result)
