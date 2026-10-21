"""Scene Agent — turns a narrative scene into a visual configuration.

Represents; never writes canon, history or character data. Output is a
plain config the renderer (or the DM) can apply, review or discard.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from core.agents.base import AgentResult, BaseAgent
from core.agents.validation import safe_str_list
from core.agents.context_manager import system_with_rule, wrap_data

SCENE_SYSTEM = """You are a tabletop RPG scene designer. Given a narrative scene, produce a visual configuration.

Return ONLY valid JSON. No markdown, no explanation.

Output format:
{
  "environment": "short environment id (e.g. underground-prison)",
  "lighting": "dark|dim|neutral|bright",
  "atmosphere": {"fog": "none|low|medium|high", "dust": "none|low|medium"},
  "structures": ["prison-cells", "stone-walls"],
  "mood": "tense|calm|mysterious|dangerous|joyful|somber"
}

Rules:
- Represent the description, do not expand the story
- No new characters, quests or lore
- Structures are generic set pieces, not canon entities
- If the description lacks visual detail, choose neutral defaults"""


@dataclass
class SceneConfiguration:
    environment: str
    lighting: str
    atmosphere: dict[str, str]
    structures: list[str]
    mood: str


class SceneAgent(BaseAgent):
    """Transforms narrative scenes into visual configurations."""

    agent_id = "scene"
    version = "1.0"
    description = "Produces visual scene configurations from narration."

    async def run(
        self,
        *,
        scene_description: str = "",
        mood: str = "",
        **kwargs: Any,
    ) -> AgentResult:
        if not scene_description.strip():
            return self._error("No scene description provided")

        context_parts = [f"Scene: {scene_description}"]
        if mood:
            context_parts.append(f"Desired Mood: {mood}")
        user_msg = wrap_data("\n".join(context_parts))

        raw = await self._complete(
            user_msg,
            system=system_with_rule(SCENE_SYSTEM),
            max_tokens=512,
            temperature=0.4,
        )

        return self._parse_response(raw)

    def _parse_response(self, raw: str) -> AgentResult:
        data = self._parse_json_response(raw)
        if data is None:
            return self._error("Failed to parse AI response")

        result = SceneConfiguration(
            environment=data.get("environment", ""),
            lighting=data.get("lighting", "neutral"),
            atmosphere=data.get("atmosphere", {}),
            structures=safe_str_list(data.get("structures")),
            mood=data.get("mood", "calm"),
        )

        return self._ok(result)
