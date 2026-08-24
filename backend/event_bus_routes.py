"""Event Bus API — monitoring and manual event emission."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.events.bus import get_event_bus

router = APIRouter(prefix="/event-bus", tags=["event-bus"])


class EmitRequest(BaseModel):
    event_type: str
    data: dict = {}
    source: str = "api"


class EventResponse(BaseModel):
    event_id: str
    event_type: str
    data: dict
    source: str
    timestamp: str


class BusStatusResponse(BaseModel):
    handler_count: int
    history_count: int


@router.post("/emit", response_model=EventResponse)
async def emit_event(req: EmitRequest):
    bus = get_event_bus()
    event = await bus.emit(req.event_type, req.data, req.source)
    return EventResponse(
        event_id=event.event_id,
        event_type=event.event_type,
        data=event.data,
        source=event.source,
        timestamp=event.timestamp,
    )


@router.get("/status", response_model=BusStatusResponse)
async def get_status():
    bus = get_event_bus()
    return BusStatusResponse(
        handler_count=bus.handler_count,
        history_count=len(bus._history),
    )


@router.get("/history", response_model=list[EventResponse])
async def get_history(event_type: str | None = None, limit: int = 50):
    bus = get_event_bus()
    events = bus.get_history(event_type, limit)
    return [
        EventResponse(
            event_id=e.event_id,
            event_type=e.event_type,
            data=e.data,
            source=e.source,
            timestamp=e.timestamp,
        )
        for e in events
    ]


@router.delete("/history")
async def clear_history():
    bus = get_event_bus()
    bus.clear_history()
    return {"status": "cleared"}
