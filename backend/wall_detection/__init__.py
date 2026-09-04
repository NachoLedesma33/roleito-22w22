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
    Point,
)
from .preprocessing import DetectionMode
from .pipeline import detect_map


def scene_items_from_detection(detection_result: DetectedMap) -> list:
    """
    Convert DetectedMap to SceneItem dicts for the frontend.
    Normalized coordinates (0-1).
    """
    import time
    import random

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
                "state": "closed",
                "material": "wood",
                "autoClose": False,
                "confidence": door.confidence,
            },
        })

    return items
