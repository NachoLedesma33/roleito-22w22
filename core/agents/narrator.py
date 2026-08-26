"""Narrator Agent — generates narration from scene context."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

from core.agents.base import AgentResult, BaseAgent

NARRATOR_SYSTEM = """You are a tabletop RPG narrator. Given scene context, generate atmospheric narration for the party.

Return ONLY valid JSON. No markdown, no explanation.

Output format:
{
  "narration": "2-4 paragraphs of atmospheric narration",
  "mood": "tense|calm|mysterious|dangerous|joyful|somber",
  "environmental_cues": ["cue 1", "cue 2"],
  "suggested_effects": ["effect 1", "effect 2"]
}

Rules:
- Match the tone of the scene
- Use sensory details (sight, sound, smell)
- Keep narration concise but evocative
- Don't introduce new plot elements
- Don't make decisions for the DM
- Suggest visual/audio effects that would enhance the scene"""


@dataclass
class NarrationResult:
    narration: str
    mood: str
    environmental_cues: list[str]
    suggested_effects: list[str]


class NarratorAgent(BaseAgent):
    """Generates atmospheric narration from scene context."""

    agent_id = "narrator"
    version = "1.0"
    description = "Generates atmospheric narration for scenes."

    async def run(
        self,
        *,
        scene_description: str = "",
        current_action: str = "",
        characters_present: list[str] | None = None,
        mood_hint: str = "",
        **kwargs: Any,
    ) -> AgentResult:
        context_parts = []
        if scene_description:
            context_parts.append(f"Scene: {scene_description}")
        if current_action:
            context_parts.append(f"Current Action: {current_action}")
        if characters_present:
            context_parts.append(f"Characters Present: {', '.join(characters_present)}")
        if mood_hint:
            context_parts.append(f"Desired Mood: {mood_hint}")

        if not context_parts:
            return self._error("No scene context provided")

        user_msg = "\n".join(context_parts)

        raw = await self.provider.complete(
            user_msg,
            system=NARRATOR_SYSTEM,
            max_tokens=1024,
            temperature=0.7,
        )

        return self._parse_response(raw)

    def _parse_response(self, raw: str) -> AgentResult:
        data = self._parse_json_response(raw)
        if data is None:
            return self._error("Failed to parse AI response")

        result = NarrationResult(
            narration=data.get("narration", ""),
            mood=data.get("mood", "calm"),
            environmental_cues=data.get("environmental_cues", []),
            suggested_effects=data.get("suggested_effects", []),
        )

        return self._ok(result)
