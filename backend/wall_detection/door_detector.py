"""Door detection from wall segments and binary image."""

import cv2
import numpy as np
from typing import List
from .types import Point, DetectedWall, DetectedDoor


def detect_doors(
    walls: List[DetectedWall],
    binary: np.ndarray,
    min_gap: float = 15.0,
    max_gap: float = 80.0,
) -> List[DetectedDoor]:
    """Detect doors as gaps between wall segment endpoints."""
    endpoints = []
    for wall in walls:
        endpoints.append(wall.start)
        endpoints.append(wall.end)

    doors = []
    used = set()

    for i in range(len(endpoints)):
        if i in used:
            continue
        for j in range(i + 1, len(endpoints)):
            if j in used:
                continue

            p1 = endpoints[i]
            p2 = endpoints[j]
            d = ((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2) ** 0.5

            if min_gap <= d <= max_gap:
                mid = Point((p1.x + p2.x) / 2, (p1.y + p2.y) / 2)
                rotation = np.degrees(np.arctan2(p2.y - p1.y, p2.x - p1.x))

                confidence = _compute_door_confidence(d, min_gap, max_gap)

                doors.append(DetectedDoor(
                    id=f"door-{len(doors)}",
                    position=mid,
                    rotation=rotation,
                    width=d,
                    confidence=confidence,
                ))
                used.add(i)
                used.add(j)
                break

    return doors


def _compute_door_confidence(width: float, min_gap: float, max_gap: float) -> float:
    """Compute confidence for a detected door."""
    mid = (min_gap + max_gap) / 2
    dist_from_mid = abs(width - mid) / (max_gap - min_gap)
    return max(0.5, 1.0 - dist_from_mid)
