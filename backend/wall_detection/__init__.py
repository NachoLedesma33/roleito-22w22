"""
Wall Detection Service
Automatically detect walls, doors, and openings from battle map images.

Two detection modes:
- BLUEPRINT: for clean 2D maps with clear lines (threshold + morphology)
- TEXTURED: for rendered/isometric maps (CLAHE + Canny edge detection)

Usage:
    from wall_detection import detect_map, DetectionMode

    result = detect_map("map.png", mode=DetectionMode.BLUEPRINT)
    print(result.wall_count, result.door_count)
"""

from .types import (
    DetectedMap,
    DetectedWall,
    DetectedDoor,
    DetectedWindow,
    DetectedRoom,
    GridMetadata,
    WalkableArea,
    Point,
)
from .preprocessing import DetectionMode, detect_grid
from .pipeline import detect_map
from .ai_detector import detect_walls_ai, detect_walls_ai_sync

import math
import random
import time


def _point_segment_distance(px, py, ax, ay, bx, by) -> float:
    """Distancia de un punto a un segmento."""
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return ((px - ax) ** 2 + (py - ay) ** 2) ** 0.5
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    cx, cy = ax + t * dx, ay + t * dy
    return ((px - cx) ** 2 + (py - cy) ** 2) ** 0.5


def _zones_near(point, zones, tolerance: float) -> list:
    """Las zonas cuyo borde pasa cerca del punto, de mas cerca a mas lejos."""
    scored = []
    for zone_id, points in zones:
        dist = min(
            _point_segment_distance(
                point[0], point[1],
                points[i][0], points[i][1],
                points[(i + 1) % len(points)][0], points[(i + 1) % len(points)][1],
            )
            for i in range(len(points))
        )
        if dist <= tolerance:
            scored.append((dist, zone_id, points))
    scored.sort(key=lambda s: s[0])
    return scored


def scene_items_from_detection(detection_result: DetectedMap) -> list:
    """
    Convert DetectedMap to SceneItem dicts for the frontend.
    Normalized coordinates (0-1).
    """

    items = []
    base_time = int(time.time() * 1000)

    for i, wall in enumerate(detection_result.walls):
        item_id = f"wall-auto-{base_time}-{i}-{random.randint(1000, 9999)}"

        normalized_points = []
        for p in wall.points:
            normalized_points.append(p.x / detection_result.width)
            normalized_points.append(p.y / detection_result.height)

        items.append({
            "id": item_id,
            "type": "shape",
            "shape": {
                "type": "line",
                "points": normalized_points,
            },
            "position": {"x": 0, "y": 0, "z": 0},
            "rotation": 0,
            "scale": 1,
            "layer": 1,
            "zIndex": 0,
            "locked": False,
            "visible": True,
            "metadata": {
                "type": "wall",
                "wallType": "solid",
                "material": "stone",
                "height": 8,
                "thickness": wall.thickness,
                "opacity": 0.12,
                "lineOfSight": True,
                "movement": True,
                "soundOcclusion": 0.8,
                "confidence": wall.confidence,
            },
        })

    for i, door in enumerate(detection_result.doors):
        item_id = f"door-auto-{base_time}-{i}-{random.randint(1000, 9999)}"

        items.append({
            "id": item_id,
            "type": "shape",
            "shape": {
                "type": "rectangle",
                "width": door.width / max(detection_result.width, detection_result.height),
                "height": (door.width * 0.4) / max(detection_result.width, detection_result.height),
            },
            "position": {
                "x": door.position.x / detection_result.width,
                "y": 0,
                "z": door.position.y / detection_result.height,
            },
            "rotation": door.rotation,
            "scale": 1,
            "layer": 3,
            "zIndex": 0,
            "locked": False,
            "visible": True,
            "metadata": {
                "type": "door",
                # La puerta detectada es un paso abierto: el portal que une las
                # dos zonas queda abierto tambien (mismo estado, misma verdad).
                "state": "open",
                "material": "wood",
                "autoClose": False,
                "confidence": door.confidence,
            },
        })

    # Las zonas (las salas detectadas) se arman primero: los portales las
    # necesitan para saber que dos zonas se tocan.
    zones = []  # (item_id, puntos normalizados)
    for i, room in enumerate(detection_result.rooms):
        # Una sala con menos de 3 vertices no es un poligono: no hay nada que
        # dibujar.
        if len(room.polygon) < 3:
            continue
        item_id = f"room-auto-{base_time}-{i}-{random.randint(1000, 9999)}"

        normalized_points = []
        for p in room.polygon:
            normalized_points.append(p.x / detection_result.width)
            normalized_points.append(p.y / detection_result.height)

        pts = [
            (normalized_points[k], normalized_points[k + 1])
            for k in range(0, len(normalized_points), 2)
        ]
        zones.append((item_id, pts))

        items.append({
            "id": item_id,
            "name": room.label,
            "type": "shape",
            "shape": {
                "type": "polygon",
                "points": normalized_points,
            },
            "position": {"x": 0, "y": 0, "z": 0},
            "rotation": 0,
            "scale": 1,
            "layer": 1,
            "zIndex": 0,
            "locked": False,
            "visible": True,
            "metadata": {
                # La geometria de la IA entra como ZONA, la misma estructura
                # que dibuja el DM a mano: asi una sala detectada alimenta la
                # niebla, la luz y la LoS igual que una zona manual (antes
                # eran items `room`, un tipo en paralelo que el runtime no
                # consumia). `origin: ai` deja la traza de que la propuso
                # la maquina y el DM la revisa con las mismas herramientas.
                "type": "zone",
                "zoneType": "polygon",
                "origin": "ai",
                "touchedByDm": False,
                "shadowOnly": False,
                "fillColor": "#334155",
                "fillOpacity": 0.35,
                "portals": [],
            },
        })

    _attach_portals(items, zones, detection_result, base_time)

    return items


def _attach_portals(items, zones, detection_result, base_time) -> None:
    """Las puertas detectadas se vuelven PORTALES entre las zonas que tocan.

    Sin esto, una zona de la IA encierra al token: el borde de la zona
    bloquea el movimiento y el unico modo de cruzarlo es un portal abierto
    (el modelo de `HYBRID-SHADOW-GEOMETRY.md` §7). Como los portales se
    reflejan en las DOS zonas, el portal se mete en los dos metadatos.
    """
    if not zones:
        return

    by_id = {item["id"]: item for item in items}
    max_dim = max(detection_result.width, detection_result.height) or 1

    for i, door in enumerate(detection_result.doors):
        center = (
            door.position.x / detection_result.width,
            door.position.y / detection_result.height,
        )
        near = _zones_near(center, zones, tolerance=0.06)
        if len(near) < 2:
            # Una puerta que solo toca una zona no une dos: no hay a que
            # conectarla (y una zona con una sola puerta sigue encerrada:
            # eso lo decide el DM, no la maquina).
            continue

        (_, zone_a_id, zone_a_pts) = near[0]
        (_, zone_b_id, zone_b_pts) = near[1]
        if zone_a_id == zone_b_id:
            continue

        portal_id = f"portal-auto-{base_time}-{i}-{random.randint(1000, 9999)}"
        # El segmento del portal: el ancho de la puerta, sobre el borde.
        half = (door.width / 2) / max_dim
        ux = math.cos(door.rotation)
        uz = math.sin(door.rotation)
        local_edge = [
            {"x": center[0] - ux * half, "y": center[1] - uz * half},
            {"x": center[0] + ux * half, "y": center[1] + uz * half},
        ]
        portal = {
            "id": portal_id,
            "zoneA": zone_a_id,
            "zoneB": zone_b_id,
            # La puerta detectada es un paso: el token puede cruzarlo. El DM
            # la puede cerrar desde la UI.
            "state": "open",
            "localEdge": local_edge,
            "activatesOn": None,
        }

        for zone_id in (zone_a_id, zone_b_id):
            zone_item = by_id.get(zone_id)
            if not zone_item:
                continue
            zone_item["metadata"]["portals"] = [
                *zone_item["metadata"].get("portals", []),
                portal,
            ]
