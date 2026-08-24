"""Memory Builder — constructs campaign memory from sessions and events."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import Session, Event, Character, NPC, Location
from .models import CampaignMemory, SessionMemory, EventSummary


class MemoryBuilder:
    """Build campaign memory from DB data."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def build(self, campaign_id: str) -> CampaignMemory:
        sessions = (await self.db.execute(
            select(Session)
            .where(Session.campaign_id == campaign_id)
            .order_by(Session.number)
        )).scalars().all()

        events = (await self.db.execute(
            select(Event)
            .where(Event.campaign_id == campaign_id)
            .order_by(Event.id)
        )).scalars().all()

        characters = (await self.db.execute(
            select(Character).where(Character.campaign_id == campaign_id)
        )).scalars().all()

        npcs = (await self.db.execute(
            select(NPC).where(NPC.campaign_id == campaign_id)
        )).scalars().all()

        locations = (await self.db.execute(
            select(Location).where(Location.campaign_id == campaign_id)
        )).scalars().all()

        char_names = {c.id: c.name for c in characters}
        npc_names = {n.id: n.name for n in npcs}
        loc_names = {l.id: l.name for l in locations}

        entity_names = {**char_names, **npc_names}

        events_by_session: dict[str, list[Event]] = {}
        for ev in events:
            events_by_session.setdefault(ev.session_id, []).append(ev)

        session_memories = []
        for sess in sessions:
            sess_events = events_by_session.get(sess.id, [])
            event_summaries = [
                EventSummary(
                    event_id=ev.id,
                    event_type=ev.type,
                    description=ev.description or "",
                    actor=entity_names.get(ev.actor_id, ev.actor_id),
                    target=entity_names.get(ev.target_id, ev.target_id) if ev.target_id else None,
                    location=loc_names.get(ev.location_id, ev.location_id) if ev.location_id else None,
                    session_number=sess.number,
                    importance="high" if ev.type in ("combat", "discovery", "quest") else "normal",
                )
                for ev in sess_events
            ]

            key_discoveries = [
                ev.description for ev in sess_events
                if ev.type == "discovery" and ev.description
            ]

            word_count = len((sess.raw_notes or "").split()) + len((sess.summary or "").split())

            session_memories.append(SessionMemory(
                session_id=sess.id,
                session_number=sess.number,
                title=sess.title or f"Session {sess.number}",
                date=sess.date,
                summary=sess.summary or "",
                event_summaries=event_summaries,
                key_discoveries=key_discoveries,
                word_count=word_count,
            ))

        high_importance = [
            es for sm in session_memories for es in sm.event_summaries
            if es.importance == "high"
        ]

        active_threads = []
        for es in high_importance:
            thread = f"{es.event_type}: {es.description[:80]}"
            if thread not in active_threads:
                active_threads.append(thread)

        return CampaignMemory(
            campaign_id=campaign_id,
            total_sessions=len(sessions),
            sessions=session_memories,
            active_threads=active_threads,
            major_npcs=[n.name for n in npcs if n.status == "alive"],
            key_locations=[l.name for l in locations if (l.status or "").upper() == "ACTIVE"],
        )

    async def get_session_memory(self, campaign_id: str, session_number: int) -> SessionMemory | None:
        memory = await self.build(campaign_id)
        for sm in memory.sessions:
            if sm.session_number == session_number:
                return sm
        return None

    async def search_memory(self, campaign_id: str, query: str) -> list[EventSummary]:
        memory = await self.build(campaign_id)
        query_lower = query.lower()
        results = []
        for sm in memory.sessions:
            for es in sm.event_summaries:
                if query_lower in es.description.lower() or query_lower in es.actor.lower():
                    results.append(es)
        return results
