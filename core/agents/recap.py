"""Recap Agent — generates session recaps from history and notes."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from core.agents.base import AgentResult, BaseAgent
from core.agents.validation import safe_text, safe_str_list
from core.agents.context_manager import system_with_rule, wrap_data

RECAP_SYSTEM = """You are a tabletop RPG session recap writer. Given session history and notes, generate a compelling recap for players.

Return ONLY valid JSON. No markdown, no explanation.

Output format:
{
  "recap": "Full narrative recap (3-5 paragraphs) written as if narrating to players. Use second person ('you'). Include key events, decisions, and cliffhangers.",
  "highlights": ["Key moment 1", "Key moment 2", "Key moment 3"],
  "cliffhanger": "The session ended with... (1-2 sentences)",
  "next_session_hook": "What might happen next... (1 sentence)"
}

Style: Engaging, dramatic, second-person narrative. Include sensory details from the session notes. Highlight player agency and key decisions."""


@dataclass
class RecapResult:
    recap: str
    highlights: list[str]
    cliffhanger: str
    next_session_hook: str


class RecapAgent(BaseAgent):
    """Generates session recaps from history and notes."""

    agent_id = "recap"
    version = "1.0"
    description = "Generates narrative session recaps from notes and history."

    async def run(
        self,
        *,
        session_notes: str,
        session_summary: str = "",
        previous_recap: str = "",
        campaign_context: str = "",
        **kwargs: Any,
    ) -> AgentResult:
        # Todo lo que entra al prompt es material de la campana: va delimitado
        # como dato (C1). El recap anterior es la salida de otro agente: va
        # marcado igual.
        data_parts = [f"Session Notes:\n{session_notes or 'No notes available.'}"]
        if session_summary:
            data_parts.append(f"Session Summary:\n{session_summary}")
        if previous_recap:
            data_parts.append(f"Previous Session Recap:\n{previous_recap}")
        if campaign_context:
            data_parts.append(f"Campaign Context:\n{campaign_context}")
        user_msg = wrap_data("\n\n".join(data_parts))

        raw = await self.provider.complete(
            user_msg,
            system=system_with_rule(RECAP_SYSTEM),
            max_tokens=1500,
            temperature=0.7,
        )

        return self._parse_response(raw)

    def _parse_response(self, raw: str) -> AgentResult:
        data = self._parse_json_response(raw)
        if data is None:
            return self._error("Failed to parse AI response")

        result = RecapResult(
            recap=safe_text(data.get("recap")),
            highlights=safe_str_list(data.get("highlights")),
            cliffhanger=data.get("cliffhanger", ""),
            next_session_hook=data.get("next_session_hook", ""),
        )

        return self._ok(result)
