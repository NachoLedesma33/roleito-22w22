"""World State API endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_session
from core.world.engine import WorldStateEngine

router = APIRouter(prefix="/world-state", tags=["world-state"])


class WorldStateResponse(BaseModel):
    version: int
    campaign_id: str
    current_session_id: str | None
    current_location_id: str | None
    current_date: str
    characters: dict
    npcs: dict
    locations: dict
    quests: dict
    active_threads: list[str]
    applied_events: list[str]
    created_at: str
    updated_at: str


class SnapshotListResponse(BaseModel):
    versions: list[int]


@router.get("/{campaign_id}", response_model=WorldStateResponse)
async def get_world_state(campaign_id: str, db: AsyncSession = Depends(get_session)):
    engine = WorldStateEngine(db)
    state = await engine.compute(campaign_id)
    await engine.save_snapshot(state)
    return WorldStateResponse(**state.to_dict())


@router.get("/{campaign_id}/snapshots", response_model=SnapshotListResponse)
async def list_snapshots(campaign_id: str, db: AsyncSession = Depends(get_session)):
    engine = WorldStateEngine(db)
    versions = await engine.list_snapshots(campaign_id)
    return SnapshotListResponse(versions=versions)


@router.get("/{campaign_id}/snapshots/{version}", response_model=WorldStateResponse)
async def get_snapshot(campaign_id: str, version: int, db: AsyncSession = Depends(get_session)):
    engine = WorldStateEngine(db)
    state = await engine.load_snapshot(campaign_id, version)
    if not state:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    return WorldStateResponse(**state.to_dict())


@router.post("/{campaign_id}/rollback/{target_version}", response_model=WorldStateResponse)
async def rollback_to_version(campaign_id: str, target_version: int, db: AsyncSession = Depends(get_session)):
    engine = WorldStateEngine(db)
    state = await engine.rollback(campaign_id, target_version)
    if not state:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    await engine.save_snapshot(state)
    return WorldStateResponse(**state.to_dict())
