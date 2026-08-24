"""Lore Agent — searches and summarizes campaign lore."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

from core.agents.base import AgentResult, BaseAgent

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

        context_parts = []
        if campaign_context:
            context_parts.append(f"Campaign: {campaign_context}")
        if characters:
            context_parts.append("Characters:\n" + "\n".join(
                f"- {c.get('name', '?')}: {c.get('description', 'no description')}"
                for c in characters
            ))
        if npcs:
            context_parts.append("NPCs:\n" + "\n".join(
                f"- {n.get('name', '?')}: {n.get('description', 'no description')}"
                for n in npcs
            ))
        if locations:
            context_parts.append("Locations:\n" + "\n".join(
                f"- {l.get('name', '?')}: {l.get('description', 'no description')}"
                for l in locations
            ))
        if events:
            context_parts.append("Recent Events:\n" + "\n".join(
                f"- [{e.get('type', '?')}] {e.get('description', '')}"
                for e in events[-10:]  # last 10 events
            ))

        context_str = "\n\n".join(context_parts) if context_parts else "No campaign context available."

        user_msg = f"Campaign Context:\n{context_str}\n\nQuestion: {question}"

        raw = await self.provider.complete(
            user_msg,
            system=LORE_SYSTEM,
            max_tokens=1024,
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

        result = LoreResult(
            answer=data.get("answer", ""),
            entities_mentioned=data.get("entities_mentioned", []),
            confidence=data.get("confidence", 0.5),
            related_topics=data.get("related_topics", []),
            source_hint=data.get("source_hint", ""),
        )

        return self._ok(result)
