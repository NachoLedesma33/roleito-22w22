"""Memory API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_session
from core.memory.builder import MemoryBuilder

router = APIRouter(prefix="/memory", tags=["memory"])


class SessionMemoryResponse(BaseModel):
    session_id: str
    session_number: int
    title: str
    date: str
    summary: str
    key_discoveries: list[str]
    character_changes: list[str]
    word_count: int


class CampaignMemoryResponse(BaseModel):
    campaign_id: str
    total_sessions: int
    current_arc: str | None
    arcs: list[dict]
    sessions: list[SessionMemoryResponse]
    active_threads: list[str]
    major_npcs: list[str]
    key_locations: list[str]


class SearchResult(BaseModel):
    event_id: str
    event_type: str
    description: str
    actor: str
    target: str | None
    location: str | None
    session_number: int
    importance: str


@router.get("/{campaign_id}", response_model=CampaignMemoryResponse)
async def get_campaign_memory(campaign_id: str, db: AsyncSession = Depends(get_session)):
    builder = MemoryBuilder(db)
    memory = await builder.build(campaign_id)
    return CampaignMemoryResponse(**memory.to_dict())


@router.get("/{campaign_id}/sessions/{session_number}", response_model=SessionMemoryResponse)
async def get_session_memory(campaign_id: str, session_number: int, db: AsyncSession = Depends(get_session)):
    builder = MemoryBuilder(db)
    mem = await builder.get_session_memory(campaign_id, session_number)
    if not mem:
        raise HTTPException(status_code=404, detail="Session memory not found")
    return SessionMemoryResponse(
        session_id=mem.session_id,
        session_number=mem.session_number,
        title=mem.title,
        date=mem.date,
        summary=mem.summary,
        key_discoveries=mem.key_discoveries,
        character_changes=mem.character_changes,
        word_count=mem.word_count,
    )


@router.get("/{campaign_id}/search", response_model=list[SearchResult])
async def search_memory(
    campaign_id: str,
    q: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_session),
):
    builder = MemoryBuilder(db)
    results = await builder.search_memory(campaign_id, q)
    return [
        SearchResult(
            event_id=r.event_id,
            event_type=r.event_type,
            description=r.description,
            actor=r.actor,
            target=r.target,
            location=r.location,
            session_number=r.session_number,
            importance=r.importance,
        )
        for r in results
    ]
