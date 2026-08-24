import hashlib
import json
import re

from .base import AIProvider


def _extract_names_from_prompt(prompt: str) -> dict[str, list[str]]:
    """Extract entity names from the narrative prompt context."""
    result: dict[str, list[str]] = {"characters": [], "npcs": [], "locations": []}

    char_match = re.search(r"Characters present:\s*(.+)", prompt)
    if char_match:
        raw = char_match.group(1).strip()
        if raw and raw != "none":
            result["characters"] = [n.strip() for n in raw.split(",")]

    npc_match = re.search(r"NPCs present:\s*(.+)", prompt)
    if npc_match:
        raw = npc_match.group(1).strip()
        if raw and raw != "none":
            result["npcs"] = [n.strip() for n in raw.split(",")]

    loc_match = re.search(r"Locations known:\s*(.+)", prompt)
    if loc_match:
        raw = loc_match.group(1).strip()
        if raw and raw != "none":
            result["locations"] = [n.strip() for n in raw.split(",")]

    return result


class MockProvider(AIProvider):
    """Deterministic provider for dev and E2E tests. Never calls the network."""

    name = "mock"

    async def complete(
        self,
        prompt: str,
        *,
        system: str = "",
        model: str | None = None,
        max_tokens: int = 512,
        temperature: float = 0.7,
    ) -> str:
        if "event extractor" in system.lower():
            names = _extract_names_from_prompt(prompt)
            actors = names["characters"][:1] if names["characters"] else names["npcs"][:1] if names["npcs"] else []
            events = [
                {
                    "type": "LOCATION_ENTERED",
                    "description": "The party enters the location.",
                    "actors": actors,
                    "targets": [],
                    "location": names["locations"][0] if names["locations"] else None,
                    "importance": "NORMAL",
                    "state_changes": [],
                    "tags": ["movement"],
                },
                {
                    "type": "ITEM_FOUND",
                    "description": "An item is discovered.",
                    "actors": actors,
                    "targets": names["npcs"][:1] if names["npcs"] else [],
                    "location": names["locations"][0] if names["locations"] else None,
                    "importance": "LOW",
                    "state_changes": [],
                    "tags": ["discovery"],
                },
            ]
            return json.dumps(events)

        digest = hashlib.sha1(f"{system}|{prompt}".encode()).hexdigest()[:8]
        return f"[mock:{model or 'mock-1'}:{digest}] {prompt[:120]}"
