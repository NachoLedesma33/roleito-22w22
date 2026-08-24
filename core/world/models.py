"""World State models — data structures for computed world state."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class EntityState:
    entity_id: str
    entity_type: str
    name: str
    status: str = "active"
    current_location_id: str | None = None
    hp: int | None = None
    max_hp: int | None = None
    metadata: dict = field(default_factory=dict)


@dataclass
class QuestState:
    quest_id: str
    name: str
    status: str = "active"
    description: str = ""
    participants: list[str] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)


@dataclass
class WorldStateData:
    version: int = 0
    campaign_id: str = ""
    current_session_id: str | None = None
    current_location_id: str | None = None
    current_date: str = ""

    characters: dict[str, EntityState] = field(default_factory=dict)
    npcs: dict[str, EntityState] = field(default_factory=dict)
    locations: dict[str, EntityState] = field(default_factory=dict)
    quests: dict[str, QuestState] = field(default_factory=dict)
    active_threads: list[str] = field(default_factory=list)
    applied_events: list[str] = field(default_factory=list)

    created_at: str = ""
    updated_at: str = ""

    def to_dict(self) -> dict:
        return {
            "version": self.version,
            "campaign_id": self.campaign_id,
            "current_session_id": self.current_session_id,
            "current_location_id": self.current_location_id,
            "current_date": self.current_date,
            "characters": {k: vars(v) for k, v in self.characters.items()},
            "npcs": {k: vars(v) for k, v in self.npcs.items()},
            "locations": {k: vars(v) for k, v in self.locations.items()},
            "quests": {k: vars(v) for k, v in self.quests.items()},
            "active_threads": self.active_threads,
            "applied_events": self.applied_events,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @classmethod
    def from_dict(cls, d: dict) -> WorldStateData:
        chars = {k: EntityState(**v) for k, v in d.get("characters", {}).items()}
        npcs = {k: EntityState(**v) for k, v in d.get("npcs", {}).items()}
        locs = {k: EntityState(**v) for k, v in d.get("locations", {}).items()}
        quests = {k: QuestState(**v) for k, v in d.get("quests", {}).items()}
        return cls(
            version=d.get("version", 0),
            campaign_id=d.get("campaign_id", ""),
            current_session_id=d.get("current_session_id"),
            current_location_id=d.get("current_location_id"),
            current_date=d.get("current_date", ""),
            characters=chars,
            npcs=npcs,
            locations=locs,
            quests=quests,
            active_threads=d.get("active_threads", []),
            applied_events=d.get("applied_events", []),
            created_at=d.get("created_at", ""),
            updated_at=d.get("updated_at", ""),
        )
