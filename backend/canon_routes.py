"""Canon API endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_session
from core.canon.manager import CanonManager

router = APIRouter(prefix="/canon", tags=["canon"])


class ProposeRequest(BaseModel):
    entity_type: str
    entity_id: str
    fact: str
    source_event_id: str | None = None
    confidence: float = 1.0


class ReviewRequest(BaseModel):
    reviewed_by: str = "dm"
    notes: str = ""


class CanonEntryResponse(BaseModel):
    entry_id: str
    campaign_id: str
    entity_type: str
    entity_id: str
    fact: str
    source_event_id: str | None
    status: str
    confidence: float
    proposed_by: str
    reviewed_by: str | None
    review_notes: str
    contradictions: list[str]
    created_at: str
    updated_at: str


@router.post("/{campaign_id}/propose", response_model=CanonEntryResponse)
async def propose_canon(campaign_id: str, req: ProposeRequest, db: AsyncSession = Depends(get_session)):
    manager = CanonManager(db)
    entry = await manager.propose(
        campaign_id, req.entity_type, req.entity_id, req.fact,
        req.source_event_id, req.confidence,
    )
    return CanonEntryResponse(**entry.to_dict())


@router.get("/{campaign_id}", response_model=list[CanonEntryResponse])
async def list_canon(campaign_id: str, status: str | None = None, db: AsyncSession = Depends(get_session)):
    manager = CanonManager(db)
    entries = await manager.list_entries(campaign_id, status)
    return [CanonEntryResponse(**e.to_dict()) for e in entries]


@router.get("/{campaign_id}/{entry_id}", response_model=CanonEntryResponse)
async def get_canon(campaign_id: str, entry_id: str, db: AsyncSession = Depends(get_session)):
    manager = CanonManager(db)
    entry = await manager.get_entry(campaign_id, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Canon entry not found")
    return CanonEntryResponse(**entry.to_dict())


@router.put("/{campaign_id}/{entry_id}/approve", response_model=CanonEntryResponse)
async def approve_canon(campaign_id: str, entry_id: str, req: ReviewRequest, db: AsyncSession = Depends(get_session)):
    manager = CanonManager(db)
    entry = await manager.approve(entry_id, campaign_id, req.reviewed_by, req.notes)
    if not entry:
        raise HTTPException(status_code=404, detail="Canon entry not found")
    return CanonEntryResponse(**entry.to_dict())


@router.put("/{campaign_id}/{entry_id}/reject", response_model=CanonEntryResponse)
async def reject_canon(campaign_id: str, entry_id: str, req: ReviewRequest, db: AsyncSession = Depends(get_session)):
    manager = CanonManager(db)
    entry = await manager.reject(entry_id, campaign_id, req.reviewed_by, req.notes)
    if not entry:
        raise HTTPException(status_code=404, detail="Canon entry not found")
    return CanonEntryResponse(**entry.to_dict())
