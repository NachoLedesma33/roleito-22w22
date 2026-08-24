"""Memory models — hierarchical memory tiers for campaign history."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class EventSummary:
    event_id: str
    event_type: str
    description: str
    actor: str
    target: str | None = None
    location: str | None = None
    session_number: int = 0
    importance: str = "normal"


@dataclass
class SessionMemory:
    session_id: str
    session_number: int
    title: str
    date: str
    summary: str = ""
    event_summaries: list[EventSummary] = field(default_factory=list)
    key_discoveries: list[str] = field(default_factory=list)
    character_changes: list[str] = field(default_factory=list)
    word_count: int = 0


@dataclass
class ArcMemory:
    arc_id: str
    name: str
    session_ids: list[str] = field(default_factory=list)
    summary: str = ""
    key_events: list[EventSummary] = field(default_factory=list)
    unresolved_threads: list[str] = field(default_factory=list)


@dataclass
class CampaignMemory:
    campaign_id: str
    total_sessions: int = 0
    current_arc: str | None = None
    arcs: list[ArcMemory] = field(default_factory=list)
    sessions: list[SessionMemory] = field(default_factory=list)
    active_threads: list[str] = field(default_factory=list)
    major_npcs: list[str] = field(default_factory=list)
    key_locations: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "campaign_id": self.campaign_id,
            "total_sessions": self.total_sessions,
            "current_arc": self.current_arc,
            "arcs": [
                {
                    "arc_id": a.arc_id,
                    "name": a.name,
                    "summary": a.summary,
                    "unresolved_threads": a.unresolved_threads,
                }
                for a in self.arcs
            ],
            "sessions": [
                {
                    "session_id": s.session_id,
                    "session_number": s.session_number,
                    "title": s.title,
                    "date": s.date,
                    "summary": s.summary,
                    "key_discoveries": s.key_discoveries,
                    "character_changes": s.character_changes,
                    "word_count": s.word_count,
                }
                for s in self.sessions
            ],
            "active_threads": self.active_threads,
            "major_npcs": self.major_npcs,
            "key_locations": self.key_locations,
        }
