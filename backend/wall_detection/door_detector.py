"""Door detection from wall segments and binary image.

Doors are openings in walls: near-collinear wall endpoints whose gap is
free of wall pixels in the binary image. The pixel check kills doors
invented from arbitrary endpoint pairs (furniture, decorations).
"""

import cv2
import numpy as np
from typing import List, Optional

from .types import Point, DetectedWall, DetectedDoor


def detect_doors(
    walls: List[DetectedWall],
    binary: np.ndarray,
    min_gap: float = 15.0,
    max_gap: float = 80.0,
    angle_tolerance: float = 20.0,
) -> List[DetectedDoor]:
    """Detect doors as free gaps between near-collinear wall endpoints."""
    doors: List[DetectedDoor] = []
    used = set()

    for i in range(len(walls)):
        if i in used:
            continue
        for j in range(i + 1, len(walls)):
            if j in used:
                continue

            w1, w2 = walls[i], walls[j]
            candidate = _best_endpoint_pair(w1, w2, min_gap, max_gap, angle_tolerance)
            if candidate is None:
                continue

            p1, p2, direction = candidate
            gap = ((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2) ** 0.5

            free_ratio = _gap_free_ratio(p1, p2, binary, radius=3)
            if free_ratio < 0.6:
                continue

            mid = Point((p1.x + p2.x) / 2, (p1.y + p2.y) / 2)
            rotation = np.degrees(np.arctan2(direction[1], direction[0]))

            colinear_conf = _collinearity_confidence(w1, w2, p1, p2)
            free_conf = 0.3 + 0.7 * free_ratio
            confidence = min(1.0, (colinear_conf * 0.4 + free_conf * 0.6))

            doors.append(DetectedDoor(
                id=f"door-{len(doors)}",
                position=mid,
                rotation=rotation,
                width=gap,
                confidence=confidence,
                connects=(w1.id, w2.id),
            ))
            used.add(i)
            used.add(j)
            break

    return doors


def _best_endpoint_pair(
    w1: DetectedWall,
    w2: DetectedWall,
    min_gap: float,
    max_gap: float,
    angle_tol: float,
) -> Optional[tuple]:
    """Find the endpoint pair of two walls that forms a valid door gap."""
    for p1 in (w1.start, w1.end):
        for p2 in (w2.start, w2.end):
            gap = ((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2) ** 0.5
            if not (min_gap <= gap <= max_gap):
                continue

            d1 = _tail_direction(w1, p1)
            d2 = _tail_direction(w2, p2)
            if d1 is None or d2 is None:
                continue

            angle = _angle_between(d1, d2)
            if angle > angle_tol:
                continue

            return p1, p2, _outward_direction(d1)

    return None


def _tail_direction(wall: DetectedWall, endpoint: Point) -> Optional[tuple]:
    """Unit vector pointing from endpoint back into the wall."""
    pts = wall.points
    if len(pts) < 2:
        return None

    is_start = (abs(pts[0].x - endpoint.x) < 1e-6 and abs(pts[0].y - endpoint.y) < 1e-6)
    if is_start:
        a, b = pts[0], pts[1]
    else:
        a, b = pts[-1], pts[-2]

    dx, dy = b.x - a.x, b.y - a.y
    length = (dx ** 2 + dy ** 2) ** 0.5
    if length < 1e-6:
        return None
    return (dx / length, dy / length)


def _outward_direction(d: tuple) -> tuple:
    """Direction pointing out of the wall at its endpoint."""
    return (-d[0], -d[1])


def _angle_between(d1: tuple, d2: tuple) -> float:
    dot = d1[0] * d2[0] + d1[1] * d2[1]
    return abs(np.degrees(np.arccos(np.clip(dot, -1.0, 1.0))))


def _collinearity_confidence(w1: DetectedWall, w2: DetectedWall, p1: Point, p2: Point) -> float:
    """Confidence that the two wall tails are collinear toward the gap."""
    d1 = _tail_direction(w1, p1)
    d2 = _tail_direction(w2, p2)
    if d1 is None or d2 is None:
        return 0.5

    angle = _angle_between(d1, d2)
    return max(0.5, 1.0 - angle / 45.0)


def _gap_free_ratio(p1: Point, p2: Point, binary: np.ndarray, radius: int = 3) -> float:
    """Fraction of gap samples with no wall pixels nearby.

    1.0 = fully open passage; 0.0 = gap blocked by detected wall material.
    """
    h, w = binary.shape
    length = ((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2) ** 0.5
    if length < 1e-6:
        return 1.0

    n = max(3, int(length / 4.0))
    free = 0
    for i in range(n + 1):
        t = i / n
        x = int(round(p1.x + (p2.x - p1.x) * t))
        y = int(round(p1.y + (p2.y - p1.y) * t))

        x0, x1c = max(0, x - radius), min(w - 1, x + radius)
        y0, y1c = max(0, y - radius), min(h - 1, y + radius)
        if not np.any(binary[y0:y1c + 1, x0:x1c + 1] > 0):
            free += 1

    return free / (n + 1)