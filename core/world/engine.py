"""World State Engine — computes current world state from approved events."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import Campaign, Character, NPC, Location, Event, Session
from .models import EntityState, QuestState, WorldStateData

SNAPSHOTS_DIR = Path(__file__).parent.parent.parent / "data" / "snapshots"


class WorldStateEngine:
    """Compute and maintain world state for a campaign.

    World state is derived from approved events + current entity data.
    Snapshots are saved to disk after each state change.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def compute(self, campaign_id: str) -> WorldStateData:
        """Compute fresh world state from DB."""
        now = datetime.utcnow().isoformat()

        campaign = (await self.db.execute(
            select(Campaign).where(Campaign.id == campaign_id)
        )).scalar_one_or_none()

        characters = (await self.db.execute(
            select(Character).where(Character.campaign_id == campaign_id)
        )).scalars().all()

        npcs = (await self.db.execute(
            select(NPC).where(NPC.campaign_id == campaign_id)
        )).scalars().all()

        locations = (await self.db.execute(
            select(Location).where(Location.campaign_id == campaign_id)
        )).scalars().all()

        approved_events = (await self.db.execute(
            select(Event).where(
                Event.campaign_id == campaign_id,
                Event.status.in_(["APPROVED", "CANON"]),
            ).order_by(Event.id)
        )).scalars().all()

        current_session_id = campaign.current_session_id if campaign else None
        current_location_id = campaign.current_location_id if campaign else None

        state = WorldStateData(
            version=len(approved_events),
            campaign_id=campaign_id,
            current_session_id=current_session_id,
            current_location_id=current_location_id,
            current_date=now,
            created_at=now,
            updated_at=now,
        )

        for c in characters:
            state.characters[c.id] = EntityState(
                entity_id=c.id,
                entity_type="character",
                name=c.name,
                status=c.status or "active",
                current_location_id=c.current_location_id,
                hp=c.current_pv,
                max_hp=c.max_pv,
                metadata={"class": c.class_, "race": c.race},
            )

        for n in npcs:
            state.npcs[n.id] = EntityState(
                entity_id=n.id,
                entity_type="npc",
                name=n.name,
                status=n.status or "active",
                current_location_id=n.current_location_id,
                hp=n.current_pv,
                max_hp=n.max_pv,
                metadata={"faction_id": n.faction_id},
            )

        for loc in locations:
            state.locations[loc.id] = EntityState(
                entity_id=loc.id,
                entity_type="location",
                name=loc.name,
                status=loc.status or "active",
            )

        for ev in approved_events:
            state.applied_events.append(ev.id)
            self._apply_event(state, ev)

        return state

    def _apply_event(self, state: WorldStateData, event: Event) -> None:
        """Apply a single approved event to the world state."""
        actor = event.actor_id
        target = event.target_id
        loc = event.location_id
        etype = event.type

        if etype == "travel" and actor and loc:
            self._move_entity(state, actor, loc)
        elif etype == "character_action" and actor:
            self._touch_entity(state, actor)
        elif etype == "npc_action" and actor:
            self._touch_entity(state, actor)
        elif etype == "combat":
            if actor:
                self._touch_entity(state, actor)
            if target:
                self._touch_entity(state, target)
        elif etype == "discovery":
            if target and loc:
                self._add_thread(state, f"Discovery at {loc}: {target}")
        elif etype == "location_change" and loc:
            state.current_location_id = loc

    def _move_entity(self, state: WorldStateData, entity_id: str, location_id: str) -> None:
        if entity_id in state.characters:
            state.characters[entity_id].current_location_id = location_id
        elif entity_id in state.npcs:
            state.npcs[entity_id].current_location_id = location_id

    def _touch_entity(self, state: WorldStateData, entity_id: str) -> None:
        if entity_id in state.characters:
            state.characters[entity_id].status = "active"
        elif entity_id in state.npcs:
            state.npcs[entity_id].status = "active"

    def _add_thread(self, state: WorldStateData, thread: str) -> None:
        if thread not in state.active_threads:
            state.active_threads.append(thread)

    async def save_snapshot(self, state: WorldStateData) -> Path:
        """Save world state snapshot to disk."""
        campaign_dir = SNAPSHOTS_DIR / state.campaign_id
        campaign_dir.mkdir(parents=True, exist_ok=True)

        snapshot_file = campaign_dir / f"v{state.version}.json"
        snapshot_file.write_text(json.dumps(state.to_dict(), indent=2, default=str))
        return snapshot_file

    async def load_snapshot(self, campaign_id: str, version: int) -> WorldStateData | None:
        """Load a snapshot from disk."""
        snapshot_file = SNAPSHOTS_DIR / campaign_id / f"v{version}.json"
        if not snapshot_file.exists():
            return None
        data = json.loads(snapshot_file.read_text())
        return WorldStateData.from_dict(data)

    async def list_snapshots(self, campaign_id: str) -> list[int]:
        """List available snapshot versions for a campaign."""
        campaign_dir = SNAPSHOTS_DIR / campaign_id
        if not campaign_dir.exists():
            return []
        return sorted([
            int(f.stem.replace("v", ""))
            for f in campaign_dir.glob("v*.json")
        ])

    async def rollback(self, campaign_id: str, target_version: int) -> WorldStateData | None:
        """Load a snapshot as the current state."""
        return await self.load_snapshot(campaign_id, target_version)
