"""Triggers de zona: cuando un token entra en una zona, se dispara un evento.

Viven en el metadata de la zona (no en una tabla aparte): asi la zona y su
trigger se guardan y se revisan con las mismas herramientas, y el backend no
necesita un endpoint propio.

El evento sale por el **event bus** de la campana (la misma via que usa el
monitor del DM y los handlers del world state).
"""

from __future__ import annotations

import json
import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from core.events.bus import get_event_bus

logger = logging.getLogger("roleito.triggers")


def _items(scene) -> list[dict]:
    raw = getattr(scene, "items_json", "[]") or "[]"
    try:
        data = json.loads(raw)
    except (TypeError, ValueError):
        return []
    return data if isinstance(data, list) else []


def _polygon_points(item: dict) -> list[tuple[float, float]] | None:
    """Los puntos normalizados (0-1) de una zona poligono, o None."""
    shape = item.get("shape") or {}
    if shape.get("type") != "polygon":
        return None
    pts = shape.get("points") or []
    if len(pts) < 6:
        return None
    return [(pts[i], pts[i + 1]) for i in range(0, len(pts) - 1, 2)]


def _inside(points: list[tuple[float, float]], x: float, z: float) -> bool:
    """Si el punto (normalizado) esta dentro del poligono."""
    inside = False
    n = len(points)
    for i in range(n):
        xi, zi = points[i]
        xj, zj = points[(i + 1) % n]
        if (zi > z) != (zj > z):
            if x < (xj - xi) * (z - zi) / (zj - zi) + xi:
                inside = not inside
    return inside


def _world_to_normalized(x: float, z: float, map_scale: float) -> tuple[float, float]:
    """La posicion del token en el mundo -> coords normalizadas (0-1)."""
    size = 10 * (map_scale or 1.0)
    return (x / size) + 0.5, (z / size) + 0.5


async def fire_zone_triggers(
    db: AsyncSession,
    scene,
    entity_id: str,
    prev_x: float,
    prev_z: float,
    new_x: float,
    new_z: float,
) -> list[dict]:
    """Dispara los triggers de las zonas que el token acaba de entrar.

    "Entrar" es la diferencia: estar adentro no dispara (si no, el trigger
    reventaria en cada movimiento). Devuelve los eventos emitidos (para el
    test y para el log).
    """
    items = _items(scene)
    if not items:
        return []

    scale = getattr(scene, "map_scale", 1.0) or 1.0
    antes = _world_to_normalized(prev_x, prev_z, scale)
    despues = _world_to_normalized(new_x, new_z, scale)

    emitidos: list[dict] = []
    bus = get_event_bus()

    for item in items:
        meta = item.get("metadata") or {}
        if meta.get("type") != "zone":
            continue
        triggers = meta.get("triggers") or []
        if not triggers:
            continue
        points = _polygon_points(item)
        if not points:
            continue
        if _inside(points, *despues) and not _inside(points, *antes):
            for trigger in triggers:
                if not trigger.get("enabled", True):
                    continue
                event_type = trigger.get("eventType") or ""
                if not event_type:
                    continue
                data: dict[str, Any] = {
                    "campaign_id": getattr(scene, "campaign_id", ""),
                    "scene_id": getattr(scene, "id", ""),
                    "zone_id": item.get("id", ""),
                    "entity_id": entity_id,
                }
                payload = trigger.get("payload")
                if isinstance(payload, dict):
                    data.update(payload)
                await bus.emit(
                    event_type,
                    data,
                    source=f"trigger:{item.get('id', '')}",
                )
                logger.info("Trigger disparado: %s (zona %s)", event_type, item.get("id"))
                emitidos.append(
                    {"event_type": event_type, "zone_id": item.get("id", ""), "data": data}
                )
    return emitidos
