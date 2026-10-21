"""World State Agent — answers questions about the CURRENT campaign state.

Reads state supplied by the caller (positions, quests, NPCs, items) and
answers from it. Never invents entities; never writes canon. History lives
in events/sessions — this agent only reports the now.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from core.agents.base import AgentResult, BaseAgent
from core.agents.validation import safe_text, safe_list, safe_str_list

WORLD_SYSTEM = """You are a tabletop RPG world state oracle. Given the current state of the campaign and a question, answer from the state only.

Return ONLY valid JSON. No markdown, no explanation.

Output format:
{
  "answer": "direct answer about positions, quests, NPCs or items",
  "positions": [{"entity": "name", "location": "place or unknown"}],
  "active_quests": ["quest title"],
  "confidence": 0.0-1.0
}

Rules:
- Only use the state provided below
- If the state lacks the answer, say so clearly (confidence < 0.3)
- Never invent entities, locations or quests
- Never propose canon changes"""


@dataclass
class WorldStateResult:
    answer: str
    positions: list[dict[str, str]]
    active_quests: list[str]
    confidence: float


class WorldStateAgent(BaseAgent):
    """Reports current state, never history, never canon writes."""

    agent_id = "world-state"
    version = "1.0"
    description = "Answers questions about character positions, quests, NPCs and items."

    async def run(
        self,
        *,
        question: str,
        characters: list[dict[str, str]] | None = None,
        quests: list[dict[str, str]] | None = None,
        npcs: list[dict[str, str]] | None = None,
        items: list[dict[str, str]] | None = None,
        locations: list[dict[str, str]] | None = None,
        **kwargs: Any,
    ) -> AgentResult:
        if not question.strip():
            return self._error("No question provided")

        state_parts = []
        if characters:
            state_parts.append("Positions:\n" + "\n".join(
                f"- {c.get('name', '?')} @ {c.get('location', 'unknown')}"
                for c in characters
            ))
        if quests:
            state_parts.append("Quests:\n" + "\n".join(
                f"- {q.get('title', '?')} [{q.get('status', 'unknown')}]"
                for q in quests
            ))
        if npcs:
            state_parts.append("NPCs:\n" + "\n".join(
                f"- {n.get('name', '?')} ({n.get('status', 'unknown')})"
                for n in npcs
            ))
        if items:
            state_parts.append("Items:\n" + "\n".join(
                f"- {i.get('name', '?')} (held by {i.get('holder', 'unknown')})"
                for i in items
            ))
        if locations:
            state_parts.append("Locations:\n" + "\n".join(
                f"- {loc.get('name', '?')}" for loc in locations
            ))

        state_str = "\n\n".join(state_parts) if state_parts else "No state available."
        user_msg = f"Current State:\n{state_str}\n\nQuestion: {question}"

        raw = await self.provider.complete(
            user_msg,
            system=WORLD_SYSTEM,
            max_tokens=1024,
            temperature=0.2,
        )

        return self._parse_response(raw)

    def _parse_response(self, raw: str) -> AgentResult:
        data = self._parse_json_response(raw)
        if data is None:
            return self._error("Failed to parse AI response")

        result = WorldStateResult(
            answer=safe_text(data.get("answer")),
            positions=safe_list(data.get("positions")),
            active_quests=safe_str_list(data.get("active_quests")),
            confidence=data.get("confidence", 0.5),
        )

        return self._ok(result)
