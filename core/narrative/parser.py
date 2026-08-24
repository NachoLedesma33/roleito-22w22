"""Narrative parser — extracts structured events from DM text using AI."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

from infrastructure.ai import AIProvider

EXTRACTION_SYSTEM = """You are a tabletop RPG event extractor. Given DM narration text, extract structured events.

Return ONLY valid JSON array. No markdown, no explanation.

Each event object:
{
  "type": "EVENT_TYPE",
  "description": "short description",
  "actors": ["entity_name"],
  "targets": ["entity_name"],
  "location": "location_name or null",
  "importance": "TRIVIAL|LOW|NORMAL|HIGH|CRITICAL",
  "state_changes": [
    {"entity": "name", "field": "field_name", "before": "old_value", "after": "new_value"}
  ],
  "tags": ["tag1"]
}

Event types: CHARACTER_CREATED, CHARACTER_DIED, CHARACTER_INJURED, CHARACTER_HEALED, CHARACTER_LEVEL_UP, CHARACTER_JOINED, CHARACTER_LEFT, CHARACTER_STATUS_CHANGED, RELATIONSHIP_CREATED, RELATIONSHIP_CHANGED, RELATIONSHIP_BROKEN, ALLIANCE_CREATED, BETRAYAL, LOCATION_ENTERED, LOCATION_EXITED, LOCATION_DISCOVERED, LOCATION_DESTROYED, LOCATION_CHANGED, LOCATION_UNLOCKED, LOCATION_LOCKED, ITEM_FOUND, ITEM_PICKED_UP, ITEM_DROPPED, ITEM_GIVEN, ITEM_STOLEN, ITEM_USED, ITEM_DESTROYED, ITEM_EQUIPPED, QUEST_CREATED, QUEST_ACCEPTED, QUEST_UPDATED, QUEST_OBJECTIVE_COMPLETED, QUEST_FAILED, QUEST_COMPLETED, QUEST_ABANDONED, COMBAT_STARTED, COMBAT_ACTION, DAMAGE_DEALT, DAMAGE_RECEIVED, CHARACTER_DOWNED, CHARACTER_DEFEATED, COMBAT_ENDED, DIALOGUE, REVELATION, SECRET_DISCOVERED, LORE_DISCOVERED, FACTION_CREATED, FACTION_JOINED, FACTION_LEFT, FACTION_ALLIANCE, FACTION_CONFLICT, FACTION_LEADER_CHANGED, WORLD_STATE_CHANGED, WEATHER_CHANGED, POLITICAL_CHANGE, WAR_STARTED, WAR_ENDED, DISASTER, NATURAL_EVENT, SCENE_ENTERED, SCENE_EXITED, SCENE_CHANGED, LIGHTING_CHANGED, ENVIRONMENT_CHANGED, MUSIC_CHANGED, AMBIENCE_CHANGED, EFFECT_TRIGGERED

Importance rules:
- TRIVIAL: sitting, breathing, minor atmosphere
- LOW: lighting torch, opening unlocked door, minor物品
- NORMAL: entering room, talking to NPC, minor combat
- HIGH: discovering important item, major plot point, significant combat
- CRITICAL: character death, major betrayal, kingdom destroyed, major quest completed

State changes only for clear physical/world changes. Empty array if none.

If no events detected, return empty array []."""

EXTRACTION_USER_TEMPLATE = """DM Narration:
{text}

Context:
- Campaign: {campaign_name}
- Current scene: {scene_name}
- Characters present: {characters}
- NPCs present: {npcs}
- Locations known: {locations}"""


@dataclass
class ExtractedEvent:
    type: str
    description: str
    actors: list[str] = field(default_factory=list)
    targets: list[str] = field(default_factory=list)
    location: str | None = None
    importance: str = "NORMAL"
    state_changes: list[dict[str, str]] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)


async def parse_narrative(
    provider: AIProvider,
    text: str,
    *,
    campaign_name: str = "",
    scene_name: str = "",
    characters: list[str] | None = None,
    npcs: list[str] | None = None,
    locations: list[str] | None = None,
) -> list[ExtractedEvent]:
    """Parse DM narration text into structured events using AI."""
    user_msg = EXTRACTION_USER_TEMPLATE.format(
        text=text,
        campaign_name=campaign_name or "Unknown",
        scene_name=scene_name or "Unknown",
        characters=", ".join(characters) if characters else "none",
        npcs=", ".join(npcs) if npcs else "none",
        locations=", ".join(locations) if locations else "none",
    )

    raw = await provider.complete(
        user_msg,
        system=EXTRACTION_SYSTEM,
        max_tokens=2048,
        temperature=0.3,
    )

    return _parse_response(raw)


def _parse_response(raw: str) -> list[ExtractedEvent]:
    """Parse AI response into ExtractedEvent list."""
    cleaned = raw.strip()

    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        cleaned = "\n".join(lines)

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        return []

    if not isinstance(data, list):
        return []

    events = []
    for item in data:
        if not isinstance(item, dict):
            continue
        if "type" not in item or "description" not in item:
            continue

        events.append(
            ExtractedEvent(
                type=item.get("type", "DIALOGUE"),
                description=item.get("description", ""),
                actors=item.get("actors", []) if isinstance(item.get("actors"), list) else [],
                targets=item.get("targets", []) if isinstance(item.get("targets"), list) else [],
                location=item.get("location"),
                importance=item.get("importance", "NORMAL"),
                state_changes=item.get("state_changes", []) if isinstance(item.get("state_changes"), list) else [],
                tags=item.get("tags", []) if isinstance(item.get("tags"), list) else [],
            )
        )

    return events
