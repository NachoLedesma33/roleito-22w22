"""Context Manager — builds bounded, canon-safe context for agents.

Two invariants from the architecture:
- Never send the whole campaign to the LLM (budget enforced in chars).
- Only CANON events reach agents by default (DM is final authority;
  PROPOSED/REVIEW drafts stay out unless explicitly requested).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class ContextProfile:
    """Budget + canon policy for one agent call."""

    max_chars: int = 6000
    canon_only: bool = True
    canon_statuses: tuple[str, ...] = ("CANON",)


@dataclass
class BuiltContext:
    text: str
    chars: int
    truncated: bool
    events_included: int
    events_dropped: int


def filter_canon(
    events: list[dict[str, Any]],
    profile: ContextProfile | None = None,
) -> list[dict[str, Any]]:
    """Drop non-canon events unless the profile allows them."""
    profile = profile or ContextProfile()
    if not profile.canon_only:
        return list(events)
    return [e for e in events if e.get("status", "CANON") in profile.canon_statuses]


def _section(title: str, lines: list[str]) -> str:
    if not lines:
        return ""
    return title + ":\n" + "\n".join(f"- {line}" for line in lines)


def build_context(
    *,
    campaign_name: str = "",
    campaign_description: str = "",
    campaign_context: str = "",
    characters: list[dict[str, str]] | None = None,
    npcs: list[dict[str, str]] | None = None,
    locations: list[dict[str, str]] | None = None,
    events: list[dict[str, Any]] | None = None,
    profile: ContextProfile | None = None,
) -> BuiltContext:
    """Assemble context sections, newest events first, trimmed to budget.

    Events are expected newest-first (as routes query them). Trimming drops
    the oldest entries first so recent canon always survives.
    """
    profile = profile or ContextProfile()
    kept_events = filter_canon(events or [], profile)

    head_parts = []
    if campaign_context:
        head_parts.append(campaign_context)
    elif campaign_name or campaign_description:
        head_parts.append(f"Campaign: {campaign_name}: {campaign_description or ''}".rstrip(": "))
    if characters:
        head_parts.append(_section("Characters", [
            f"{c.get('name', '?')}: {c.get('description', 'no description')}" for c in characters
        ]))
    if npcs:
        head_parts.append(_section("NPCs", [
            f"{n.get('name', '?')}: {n.get('description', 'no description')}" for n in npcs
        ]))
    if locations:
        head_parts.append(_section("Locations", [
            f"{l.get('name', '?')}: {l.get('description', 'no description')}" for l in locations
        ]))
    head = "\n\n".join(p for p in head_parts if p)

    event_lines = [
        f"[{e.get('type', '?')}] {e.get('description', '')}" for e in kept_events
    ]
    dropped = 0
    while event_lines and len(head) + len("\n\nRecent Events:\n") + sum(len(l) + 3 for l in event_lines) > profile.max_chars:
        event_lines.pop()
        dropped += 1

    text = head
    if event_lines:
        text += ("\n\n" if text else "") + "Recent Events:\n" + "\n".join(f"- {l}" for l in event_lines)
    return BuiltContext(
        text=text,
        chars=len(text),
        truncated=dropped > 0,
        events_included=len(event_lines),
        events_dropped=dropped,
    )
