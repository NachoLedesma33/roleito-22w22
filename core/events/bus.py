"""Event Bus — in-process pub/sub for decoupled event handling."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable, Coroutine

logger = logging.getLogger("roleito.events")

HandlerFunc = Callable[["BusEvent"], Coroutine[Any, Any, None]]


@dataclass
class BusEvent:
    event_type: str
    data: dict = field(default_factory=dict)
    source: str = ""
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    event_id: str = ""


class EventBus:
    """In-process event bus for decoupled communication.

    Usage:
        bus = EventBus()
        bus.on("world_state.updated", my_handler)
        await bus.emit("world_state.updated", {"campaign_id": "..."})
    """

    def __init__(self):
        self._handlers: dict[str, list[HandlerFunc]] = {}
        self._history: list[BusEvent] = []
        self._max_history = 100

    def on(self, event_type: str, handler: HandlerFunc) -> None:
        self._handlers.setdefault(event_type, []).append(handler)

    def off(self, event_type: str, handler: HandlerFunc) -> None:
        if event_type in self._handlers:
            self._handlers[event_type] = [
                h for h in self._handlers[event_type] if h != handler
            ]

    async def emit(self, event_type: str, data: dict | None = None, source: str = "") -> BusEvent:
        event = BusEvent(
            event_type=event_type,
            data=data or {},
            source=source,
            event_id=f"evt-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{len(self._history)}",
        )

        self._history.append(event)
        if len(self._history) > self._max_history:
            self._history = self._history[-self._max_history:]

        handlers = self._handlers.get(event_type, [])
        wildcard_handlers = self._handlers.get("*", [])

        for handler in handlers + wildcard_handlers:
            try:
                await handler(event)
            except Exception as e:
                logger.error(f"Handler error for {event_type}: {e}")

        return event

    def get_history(self, event_type: str | None = None, limit: int = 50) -> list[BusEvent]:
        if event_type:
            events = [e for e in self._history if e.event_type == event_type]
        else:
            events = self._history
        return events[-limit:]

    def clear_history(self) -> None:
        self._history.clear()

    @property
    def handler_count(self) -> int:
        return sum(len(h) for h in self._handlers.values())


_global_bus: EventBus | None = None


def get_event_bus() -> EventBus:
    global _global_bus
    if _global_bus is None:
        _global_bus = EventBus()
    return _global_bus
