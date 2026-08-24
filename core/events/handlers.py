"""Default event handlers — world state, audit, context invalidation."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .bus import BusEvent

logger = logging.getLogger("roleito.events.handlers")


async def world_state_handler(event: BusEvent) -> None:
    """Update world state when approved events occur."""
    if event.event_type in ("event.approved", "event.canon"):
        logger.info(f"World state update triggered by: {event.event_type}")


async def audit_handler(event: BusEvent) -> None:
    """Log all events for audit trail."""
    logger.info(f"[AUDIT] {event.event_type} from {event.source} at {event.timestamp}")


async def context_invalidation_handler(event: BusEvent) -> None:
    """Invalidate cached contexts when relevant data changes."""
    if event.event_type in ("event.approved", "entity.updated", "world_state.updated"):
        logger.info(f"Context invalidation triggered by: {event.event_type}")


async def agent_notification_handler(event: BusEvent) -> None:
    """Notify agents of important events."""
    if event.event_type in ("session.completed", "event.approved"):
        logger.info(f"Agent notification: {event.event_type}")


def register_default_handlers(bus) -> None:
    """Register all default event handlers on the bus."""
    bus.on("event.approved", world_state_handler)
    bus.on("event.canon", world_state_handler)
    bus.on("*", audit_handler)
    bus.on("event.approved", context_invalidation_handler)
    bus.on("entity.updated", context_invalidation_handler)
    bus.on("session.completed", agent_notification_handler)
