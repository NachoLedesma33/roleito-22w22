import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_session
from models import (
    Campaign,
    CampaignCalendar,
    DEFAULT_MONTH_NAMES,
    ProgressClock,
    default_months_json,
)
from schemas import CalendarState, CalendarUpdate, ProgressClockIn, ProgressClockOut, ProgressClockUpdate

router = APIRouter(tags=["calendar"])

DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]


def _clock_out(c: ProgressClock) -> ProgressClockOut:
    return ProgressClockOut(
        id=c.id,
        campaign_id=c.campaign_id,
        title=c.title,
        segments_total=c.segments_total,
        segments_filled=c.segments_filled,
        visible_to_players=bool(c.visible_to_players),
        created_at=c.created_at,
    )


async def _get_campaign(db: AsyncSession, campaign_id: str) -> Campaign:
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


async def _ensure_calendar(db: AsyncSession, campaign_id: str) -> CampaignCalendar:
    result = await db.execute(
        select(CampaignCalendar).where(CampaignCalendar.campaign_id == campaign_id)
    )
    cal = result.scalar_one_or_none()
    if cal:
        return cal
    cal = CampaignCalendar(campaign_id=campaign_id)
    db.add(cal)
    await db.commit()
    await db.refresh(cal)
    return cal


def _month_names(cal: CampaignCalendar) -> list[str]:
    try:
        names = json.loads(cal.month_names_json or "[]")
        if len(names) == 12:
            return names
    except ValueError:
        pass
    return list(DEFAULT_MONTH_NAMES)


async def _state(db: AsyncSession, campaign: Campaign) -> CalendarState:
    cal = await _ensure_calendar(db, campaign.id)
    clocks_r = await db.execute(
        select(ProgressClock)
        .where(ProgressClock.campaign_id == campaign.id)
        .order_by(ProgressClock.created_at.asc())
    )
    return CalendarState(
        year=cal.year,
        month=cal.month,
        day=cal.day,
        month_names=_month_names(cal),
        clocks=[_clock_out(c) for c in clocks_r.scalars().all()],
    )


def _advance(cal: CampaignCalendar, add_days: int) -> None:
    if add_days == 0:
        return
    day = cal.day or 1
    month = cal.month or 1
    year = cal.year or 1
    day += add_days
    while day > DAYS_IN_MONTH[month - 1]:
        day -= DAYS_IN_MONTH[month - 1]
        month += 1
        if month > 12:
            month = 1
            year += 1
    while day < 1:
        month -= 1
        if month < 1:
            month = 12
            year -= 1
        day += DAYS_IN_MONTH[month - 1]
    cal.year = year
    cal.month = month
    cal.day = day


@router.get("/campaigns/{campaign_id}/calendar", response_model=CalendarState)
async def get_calendar(
    campaign_id: str,
    db: AsyncSession = Depends(get_session),
):
    campaign = await _get_campaign(db, campaign_id)
    return await _state(db, campaign)


@router.put("/campaigns/{campaign_id}/calendar", response_model=CalendarState)
async def advance_calendar(
    campaign_id: str,
    data: CalendarUpdate,
    db: AsyncSession = Depends(get_session),
):
    campaign = await _get_campaign(db, campaign_id)
    cal = await _ensure_calendar(db, campaign.id)
    _advance(cal, data.add_days)
    await db.commit()
    await db.refresh(cal)
    return await _state(db, campaign)


@router.post("/campaigns/{campaign_id}/clocks", response_model=ProgressClockOut)
async def create_clock(
    campaign_id: str,
    data: ProgressClockIn,
    db: AsyncSession = Depends(get_session),
):
    campaign = await _get_campaign(db, campaign_id)
    clock = ProgressClock(
        campaign_id=campaign.id,
        title=data.title,
        segments_total=data.segments_total,
        segments_filled=0,
        visible_to_players=1 if data.visible_to_players else 0,
    )
    db.add(clock)
    await db.commit()
    await db.refresh(clock)
    return _clock_out(clock)


@router.put("/campaigns/{campaign_id}/clocks/{clock_id}", response_model=ProgressClockOut)
async def update_clock(
    campaign_id: str,
    clock_id: str,
    data: ProgressClockUpdate,
    db: AsyncSession = Depends(get_session),
):
    await _get_campaign(db, campaign_id)
    result = await db.execute(
        select(ProgressClock).where(
            ProgressClock.id == clock_id,
            ProgressClock.campaign_id == campaign_id,
        )
    )
    clock = result.scalar_one_or_none()
    if not clock:
        raise HTTPException(status_code=404, detail="Clock not found")

    updates = data.model_dump(exclude_unset=True)
    if "visible_to_players" in updates:
        updates["visible_to_players"] = 1 if updates["visible_to_players"] else 0
    for field, value in updates.items():
        setattr(clock, field, value)
    await db.commit()
    await db.refresh(clock)
    return _clock_out(clock)


@router.delete("/campaigns/{campaign_id}/clocks/{clock_id}")
async def delete_clock(
    campaign_id: str,
    clock_id: str,
    db: AsyncSession = Depends(get_session),
):
    await _get_campaign(db, campaign_id)
    result = await db.execute(
        select(ProgressClock).where(
            ProgressClock.id == clock_id,
            ProgressClock.campaign_id == campaign_id,
        )
    )
    clock = result.scalar_one_or_none()
    if not clock:
        raise HTTPException(status_code=404, detail="Clock not found")
    await db.delete(clock)
    await db.commit()
    return {"status": "deleted", "id": clock_id}