"""Post-processing refinement for AI wall detections.

The VLM tends to over-propose: bushes/furniture become walls, straight walls
come back slightly diagonal, and confidence is inflated. This module filters,
simplifies, and axis-aligns detections before they hit the scene.
"""

import math

from .types import DetectedMap, DetectedWall, Point

MIN_CONFIDENCE = 0.5
MIN_LENGTH_FRACTION = 0.02
MAX_DEVIATION_FRACTION = 0.012
SNAP_ANGLE_TOLERANCE = 8.0
SNAP_AXES_DEG = 45.0


def _angle_deg(ax: float, ay: float) -> float:
    return math.degrees(math.atan2(ay, ax)) % 180.0


def _snap_angle(angle: float, tolerance: float) -> float:
    nearest = round(angle / SNAP_AXES_DEG) * SNAP_AXES_DEG
    diff = abs(angle - nearest) % 180.0
    diff = min(diff, 180.0 - diff)
    if diff <= tolerance:
        return nearest % 180.0
    return angle


def _snap_segment(p0: Point, p1: Point, tolerance: float) -> tuple[Point, Point]:
    dx = p1.x - p0.x
    dy = p1.y - p0.y
    if dx == 0.0 and dy == 0.0:
        return p0, p1
    angle = _angle_deg(dx, dy)
    snapped = _snap_angle(angle, tolerance)
    if snapped == angle:
        return p0, p1
    length = math.hypot(dx, dy)
    cx = (p0.x + p1.x) / 2.0
    cy = (p0.y + p1.y) / 2.0
    cos_a = math.cos(math.radians(snapped))
    sin_a = math.sin(math.radians(snapped))
    hdx = cos_a * length / 2.0
    hdy = sin_a * length / 2.0
    return Point(cx - hdx, cy - hdy), Point(cx + hdx, cy + hdy)


def _max_deviation(points: list[Point]) -> float:
    """Max perpendicular distance from polyline points to first->last line."""
    if len(points) <= 2:
        return 0.0
    x0, y0 = points[0].x, points[0].y
    x1, y1 = points[-1].x, points[-1].y
    dx = x1 - x0
    dy = y1 - y0
    seg_len_sq = dx * dx + dy * dy
    if seg_len_sq == 0.0:
        return 0.0
    worst = 0.0
    for p in points[1:-1]:
        t = ((p.x - x0) * dx + (p.y - y0) * dy) / seg_len_sq
        t = max(0.0, min(1.0, t))
        px = x0 + t * dx
        py = y0 + t * dy
        dist = math.hypot(p.x - px, p.y - py)
        worst = max(worst, dist)
    return worst


def _refine_wall(w: DetectedWall, max_dim: float, min_conf: float, min_len: float, snap_tol: float) -> DetectedWall | None:
    if w.confidence < min_conf:
        return None
    if w.length < min_len:
        return None

    points = w.points
    if len(points) > 2 and _max_deviation(points) < MAX_DEVIATION_FRACTION * max_dim:
        points = [points[0], points[-1]]

    if snap_tol > 0 and len(points) == 2:
        p0, p1 = _snap_segment(points[0], points[1], snap_tol)
        points = [p0, p1]

    if points[0].x == points[-1].x and points[0].y == points[-1].y:
        return None
    return DetectedWall(
        id=w.id,
        points=points,
        thickness=w.thickness,
        confidence=w.confidence,
    )


def refine_ai_detection(
    detection: DetectedMap,
    *,
    min_confidence: float = MIN_CONFIDENCE,
    min_length_fraction: float = MIN_LENGTH_FRACTION,
    snap_tolerance: float = SNAP_ANGLE_TOLERANCE,
) -> DetectedMap:
    """Filter and clean AI-proposed walls.

    - Drops walls below a confidence floor (AI overestimates).
    - Drops short fragments (vegetation, props, noise).
    - Collapses near-straight polylines to two endpoints.
    - Snaps segments to the nearest 0/45/90 degree axis within tolerance.
    """
    max_dim = max(detection.width, detection.height) or 1
    min_len = min_length_fraction * max_dim

    walls: list[DetectedWall] = []
    for w in detection.walls:
        refined = _refine_wall(w, max_dim, min_confidence, min_len, snap_tolerance)
        if refined is not None:
            walls.append(refined)

    detection.walls = walls
    all_conf = [w.confidence for w in walls]
    detection.confidence = sum(all_conf) / len(all_conf) if all_conf else 0.0
    return detection