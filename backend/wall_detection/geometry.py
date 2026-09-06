"""Geometric operations on detected walls using Shapely.

Handles segment merging, room detection, and walkable-area computation.
Curved walls are polyline-approximated; optional B-spline smoothing helps
clean noisy polylines without changing the polyline collision model.
"""

from typing import List, Tuple

import numpy as np
from shapely.geometry import LineString, MultiPolygon, Polygon, box
from shapely.ops import linemerge, unary_union

from .types import DetectedRoom, DetectedWall, Point, WalkableArea


def walls_to_linestrings(walls: List[DetectedWall]) -> List[LineString]:
    """Convert detected walls to Shapely LineStrings."""
    result: List[LineString] = []
    for wall in walls:
        coords = [(p.x, p.y) for p in wall.points]
        if len(coords) >= 2:
            result.append(LineString(coords))
    return result


def merge_walls_with_shapely(
    walls: List[DetectedWall],
    gap_tolerance: float = 15.0,
) -> List[DetectedWall]:
    """Merge collinear/fragmented walls using Shapely linemerge.

    linemerge chains touching segments into single walls. A tiny buffer+noded
    trick is avoided: we rely on the clustering gap tolerance applied upstream
    so endpoints are already within merge distance.
    """
    if not walls:
        return []

    lines = walls_to_linestrings(walls)
    merged = linemerge(lines)

    if merged.is_empty:
        return []

    if isinstance(merged, LineString):
        merged_list = [merged]
    else:
        merged_list = list(merged.geoms)

    result: List[DetectedWall] = []
    for i, line in enumerate(merged_list):
        if line.length < 10.0:
            continue
        result.append(DetectedWall(
            id=f"wall-{i}",
            points=[Point(float(x), float(y)) for x, y in line.coords],
            thickness=10.0,
            confidence=0.8,
        ))
    return result


def detect_rooms(
    walls: List[DetectedWall],
    width: int,
    height: int,
    min_room_area: float = 800.0,
) -> List[DetectedRoom]:
    """Extract enclosed rooms from wall geometry.

    Uses the complement approach: walkable area = map bounds minus wall
    buffers. Each connected component of that complement is a room.
    """
    if not walls:
        return []

    map_poly = box(0, 0, width, height)

    wall_polys = []
    for wall in walls:
        pts = [(p.x, p.y) for p in wall.points]
        if len(pts) < 2:
            continue
        wall_polys.append(LineString(pts).buffer(max(6.0, wall.thickness / 2.0)))

    if not wall_polys:
        return []

    walls_union = unary_union(wall_polys)
    walkable = map_poly.difference(walls_union)

    return _rooms_from_walkable(walkable, min_room_area)


def compute_walkable_areas(
    walls: List[DetectedWall],
    width: int,
    height: int,
    min_area: float = 400.0,
) -> Tuple[List[WalkableArea], float]:
    """Compute walkable polygons and their ratio of total map area.

    walkable = map bounds - (wall buffers). This directly answers
    "what area can be stepped on".
    """
    map_poly = box(0, 0, width, height)
    total_area = max(1.0, map_poly.area)

    if not walls:
        return [WalkableArea(
            id="walkable-0",
            polygon=_poly_exterior(map_poly),
            area=float(map_poly.area),
            ratio=1.0,
        )], 1.0

    wall_polys = []
    for wall in walls:
        pts = [(p.x, p.y) for p in wall.points]
        if len(pts) < 2:
            continue
        wall_polys.append(LineString(pts).buffer(max(6.0, wall.thickness / 2.0)))

    walls_union = unary_union(wall_polys)
    walkable = map_poly.difference(walls_union)

    _areas: List[WalkableArea] = []
    components = list(walkable.geoms) if isinstance(walkable, MultiPolygon) else [walkable]
    for i, comp in enumerate(components):
        if not isinstance(comp, Polygon) or comp.is_empty:
            continue
        if comp.area < min_area:
            continue
        _areas.append(WalkableArea(
            id=f"walkable-{i}",
            polygon=_poly_exterior(comp),
            area=float(comp.area),
            ratio=float(comp.area / total_area),
        ))

    _areas.sort(key=lambda a: -a.area)
    ratio = float(sum(a.area for a in _areas) / total_area)
    return _areas, ratio


def smooth_wall_curve(
    points: List[Point],
    samples: int = 40,
    smoothing: float = 0.5,
) -> List[Point]:
    """B-spline smoothing of a curved wall polyline.

    Falls back to the original polyline if point count is too low.
    Scipy is optional at runtime; guarded import keeps module loadable
    without it.
    """
    if len(points) < 4:
        return points

    try:
        from scipy.interpolate import splprep, splev
    except ImportError:
        return points

    pts = np.array([[p.x, p.y] for p in points]).T
    try:
        tck, _u = splprep(pts, s=smoothing * len(points), k=min(3, len(points) - 1))
        sx, sy = splev(np.linspace(0, 1, max(samples, len(points) * 2)), tck)
    except Exception:
        return points

    return [Point(float(x), float(y)) for x, y in zip(sx, sy)]


def _rooms_from_walkable(walkable, min_area: float) -> List[DetectedRoom]:
    """Convert walkable complement components into room polygons."""
    components = list(walkable.geoms) if isinstance(walkable, MultiPolygon) else [walkable]
    rooms: List[DetectedRoom] = []
    for i, comp in enumerate(components):
        if not isinstance(comp, Polygon) or comp.is_empty:
            continue
        if comp.area < min_area:
            continue
        rooms.append(DetectedRoom(
            id=f"room-{i}",
            polygon=_poly_exterior(comp),
            label=f"Room {i + 1}",
            area=float(comp.area),
        ))
    rooms.sort(key=lambda r: -r.area)
    return rooms


def _poly_exterior(poly: Polygon) -> List[Point]:
    return [Point(float(x), float(y)) for x, y in poly.exterior.coords]