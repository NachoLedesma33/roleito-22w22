from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from database import get_session
from models import Campaign, DiceRoll
from schemas import DiceRollCreate, DiceRollResponse
from datetime import datetime

dice_router = APIRouter(tags=["dice"])

MAX_HISTORY_PER_ENTITY = 20


@dice_router.post("/campaigns/{campaign_id}/rolls", response_model=DiceRollResponse)
async def create_roll(
    campaign_id: str,
    data: DiceRollCreate,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if len(data.results) != data.count:
        raise HTTPException(status_code=422, detail="results length must match count")

    roll = DiceRoll(
        campaign_id=campaign_id,
        entity_type=data.entity_type,
        entity_id=data.entity_id,
        entity_name=data.entity_name,
        roller_name=data.roller_name,
        dice_type=data.dice_type,
        count=data.count,
        results=data.results,
        total=data.total,
        label=data.label,
    )
    db.add(roll)
    await db.flush()

    if data.entity_id:
        count_r = await db.execute(
            select(func.count()).select_from(DiceRoll).where(
                DiceRoll.campaign_id == campaign_id,
                DiceRoll.entity_id == data.entity_id,
            )
        )
        total = count_r.scalar()
        if total > MAX_HISTORY_PER_ENTITY:
            old_r = await db.execute(
                select(DiceRoll.id)
                .where(
                    DiceRoll.campaign_id == campaign_id,
                    DiceRoll.entity_id == data.entity_id,
                )
                .order_by(DiceRoll.created_at.asc())
                .limit(total - MAX_HISTORY_PER_ENTITY)
            )
            old_ids = [row[0] for row in old_r.all()]
            if old_ids:
                await db.execute(
                    delete(DiceRoll).where(DiceRoll.id.in_(old_ids))
                )

    await db.commit()
    await db.refresh(roll)
    return roll


@dice_router.get("/campaigns/{campaign_id}/rolls/recent")
async def recent_rolls(
    campaign_id: str,
    since: float = Query(default=0, description="Unix timestamp in ms"),
    db: AsyncSession = Depends(get_session),
):
    since_dt = datetime.utcfromtimestamp(since / 1000) if since > 0 else datetime.utcfromtimestamp(0)
    result = await db.execute(
        select(DiceRoll)
        .where(
            DiceRoll.campaign_id == campaign_id,
            DiceRoll.created_at > since_dt,
        )
        .order_by(DiceRoll.created_at.asc())
        .limit(20)
    )
    rolls = result.scalars().all()
    return [DiceRollResponse.model_validate(r) for r in rolls]


@dice_router.get("/campaigns/{campaign_id}/rolls/recent/all")
async def recent_rolls_all(
    campaign_id: str,
    limit: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(DiceRoll)
        .where(DiceRoll.campaign_id == campaign_id)
        .order_by(DiceRoll.created_at.desc())
        .limit(limit)
    )
    rolls = result.scalars().all()
    return [DiceRollResponse.model_validate(r) for r in rolls]


@dice_router.get("/campaigns/{campaign_id}/rolls/history/{entity_id}")
async def roll_history(
    campaign_id: str,
    entity_id: str,
    limit: int = Query(default=20, ge=1, le=50),
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(DiceRoll)
        .where(
            DiceRoll.campaign_id == campaign_id,
            DiceRoll.entity_id == entity_id,
        )
        .order_by(DiceRoll.created_at.desc())
        .limit(limit)
    )
    rolls = result.scalars().all()
    return [DiceRollResponse.model_validate(r) for r in rolls]
