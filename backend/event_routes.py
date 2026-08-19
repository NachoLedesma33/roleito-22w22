from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_session
from models import Event, Campaign, Character, NPC, Session
from schemas import EventCreate, EventUpdate, EventResponse

router = APIRouter(tags=["events"])


@router.post(
    "/campaigns/{campaign_id}/sessions/{session_id}/events",
    response_model=EventResponse,
)
async def create_event(
    campaign_id: str,
    session_id: str,
    data: EventCreate,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Session).where(
            Session.id == session_id,
            Session.campaign_id == campaign_id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Session not found")

    event = Event(
        campaign_id=campaign_id,
        session_id=session_id,
        type=data.type,
        actor_id=data.actor_id,
        target_id=data.target_id,
        location_id=data.location_id,
        description=data.description,
        confidence=data.confidence,
        status="PROPOSED",
        source_id=data.source_id,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


@router.get(
    "/campaigns/{campaign_id}/sessions/{session_id}/events",
    response_model=list[EventResponse],
)
async def list_session_events(
    campaign_id: str,
    session_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Event).where(
            Event.campaign_id == campaign_id,
            Event.session_id == session_id,
        ).order_by(Event.id)
    )
    return result.scalars().all()


@router.get(
    "/campaigns/{campaign_id}/events",
    response_model=list[EventResponse],
)
async def list_campaign_events(
    campaign_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Event).where(Event.campaign_id == campaign_id)
    )
    return result.scalars().all()


@router.get(
    "/events/{event_id}",
    response_model=EventResponse,
)
async def get_event(
    event_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.put(
    "/events/{event_id}",
    response_model=EventResponse,
)
async def update_event(
    event_id: str,
    data: EventUpdate,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(event, field, value)

    await db.commit()
    await db.refresh(event)
    return event


@router.put(
    "/events/{event_id}/approve",
    response_model=EventResponse,
)
async def approve_event(
    event_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.status not in ("PROPOSED", "UNCONFIRMED"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve event with status: {event.status}",
        )

    event.status = "CANON"
    await db.commit()
    await db.refresh(event)
    return event


@router.put(
    "/events/{event_id}/reject",
    response_model=EventResponse,
)
async def reject_event(
    event_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    event.status = "REJECTED"
    await db.commit()
    await db.refresh(event)
    return event


@router.delete("/events/{event_id}")
async def delete_event(
    event_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    await db.delete(event)
    await db.commit()
    return {"status": "deleted", "id": event_id}


@router.get(
    "/campaigns/{campaign_id}/world-state",
)
async def get_world_state(
    campaign_id: str,
    db: AsyncSession = Depends(get_session),
):
    campaign_r = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )
    campaign = campaign_r.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    chars_r = await db.execute(
        select(Character).where(Character.campaign_id == campaign_id)
    )
    npcs_r = await db.execute(
        select(NPC).where(NPC.campaign_id == campaign_id)
    )
    events_r = await db.execute(
        select(Event).where(
            Event.campaign_id == campaign_id,
            Event.status == "CANON",
        ).order_by(Event.id)
    )
    sessions_r = await db.execute(
        select(Session).where(Session.campaign_id == campaign_id)
    )

    characters = [
        {
            "id": c.id,
            "name": c.name,
            "type": c.type,
            "status": c.status,
            "current_location_id": c.current_location_id,
        }
        for c in chars_r.scalars().all()
    ]
    npcs = [
        {
            "id": n.id,
            "name": n.name,
            "status": n.status,
            "current_location_id": n.current_location_id,
        }
        for n in npcs_r.scalars().all()
    ]
    events = [
        {
            "id": e.id,
            "type": e.type,
            "actor_id": e.actor_id,
            "target_id": e.target_id,
            "location_id": e.location_id,
            "description": e.description,
            "session_id": e.session_id,
        }
        for e in events_r.scalars().all()
    ]

    return {
        "campaign_id": campaign_id,
        "current_session_id": campaign.current_session_id,
        "current_location_id": campaign.current_location_id,
        "characters": characters,
        "npcs": npcs,
        "events": events,
        "total_sessions": len(sessions_r.scalars().all()),
        "total_canon_events": len(events),
    }
