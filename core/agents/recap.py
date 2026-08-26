"""Recap Agent — generates session recaps from history and notes."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from core.agents.base import AgentResult, BaseAgent

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
        user_msg = f"Session Notes:\n{session_notes or 'No notes available.'}"
        if session_summary:
            user_msg += f"\n\nSession Summary:\n{session_summary}"
        if previous_recap:
            user_msg += f"\n\nPrevious Session Recap:\n{previous_recap}"
        if campaign_context:
            user_msg += f"\n\nCampaign Context:\n{campaign_context}"

        raw = await self.provider.complete(
            user_msg,
            system=RECAP_SYSTEM,
            max_tokens=1500,
            temperature=0.7,
        )

        return self._parse_response(raw)

    def _parse_response(self, raw: str) -> AgentResult:
        data = self._parse_json_response(raw)
        if data is None:
            return self._error("Failed to parse AI response")

        result = RecapResult(
            recap=data.get("recap", ""),
            highlights=data.get("highlights", []),
            cliffhanger=data.get("cliffhanger", ""),
            next_session_hook=data.get("next_session_hook", ""),
        )

        return self._ok(result)
