"""Lore Agent — searches and summarizes campaign lore."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

from core.agents.base import AgentResult, BaseAgent
from core.agents.context_manager import build_context

LORE_SYSTEM = """You are a tabletop RPG lore keeper. Given campaign context and a question, provide a helpful answer.

Return ONLY valid JSON. No markdown, no explanation.

Output format:
{
  "answer": "clear answer to the question",
  "entities_mentioned": ["entity_name1", "entity_name2"],
  "confidence": 0.0-1.0,
  "related_topics": ["related topic 1", "related topic 2"],
  "source_hint": "brief description of where this info comes from in the campaign"
}

Rules:
- Only use information provided in the context
- If information is missing, say so clearly (confidence < 0.3)
- Never invent lore that isn't in the context
- Keep answers concise and relevant
- Identify which characters/NPCs/locations are mentioned"""


@dataclass
class LoreResult:
    answer: str
    entities_mentioned: list[str]
    confidence: float
    related_topics: list[str]
    source_hint: str


class LoreAgent(BaseAgent):
    """Searches and summarizes campaign lore."""

    agent_id = "lore"
    version = "1.0"
    description = "Answers questions about campaign lore and history."

    async def run(
        self,
        *,
        question: str,
        campaign_context: str = "",
        characters: list[dict[str, str]] | None = None,
        npcs: list[dict[str, str]] | None = None,
        locations: list[dict[str, str]] | None = None,
        events: list[dict[str, str]] | None = None,
        **kwargs: Any,
    ) -> AgentResult:
        if not question.strip():
            return self._error("No question provided")

        context = build_context(
            campaign_context=campaign_context,
            characters=characters,
            npcs=npcs,
            locations=locations,
            events=events,
        )
        context_str = context.text or "No campaign context available."

        user_msg = f"Campaign Context:\n{context_str}\n\nQuestion: {question}"

        raw = await self.provider.complete(
            user_msg,
            system=LORE_SYSTEM,
            max_tokens=1024,
            temperature=0.3,
        )

        return self._parse_response(raw)

    def _parse_response(self, raw: str) -> AgentResult:
        data = self._parse_json_response(raw)
        if data is None:
            return self._error("Failed to parse AI response")

        result = LoreResult(
            answer=data.get("answer", ""),
            entities_mentioned=data.get("entities_mentioned", []),
            confidence=data.get("confidence", 0.5),
            related_topics=data.get("related_topics", []),
            source_hint=data.get("source_hint", ""),
        )

        return self._ok(result)
