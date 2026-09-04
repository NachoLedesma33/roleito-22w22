"""Segment clustering and merging for wall detection."""

import numpy as np
from typing import List, Tuple
from .types import Point


def cluster_segments(
    segments: List[Tuple[Point, Point]],
    angle_tolerance: float = 10.0,
    distance_tolerance: float = 15.0,
    gap_tolerance: float = 25.0,
) -> List[List[Tuple[Point, Point]]]:
    """Group segments that are collinear and close together."""
    if not segments:
        return []

    n = len(segments)
    parent = list(range(n))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: int, b: int):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb

    for i in range(n):
        for j in range(i + 1, n):
            if _segments_can_merge(segments[i], segments[j], angle_tolerance, distance_tolerance, gap_tolerance):
                union(i, j)

    groups = {}
    for i in range(n):
        root = find(i)
        if root not in groups:
            groups[root] = []
        groups[root].append(segments[i])

    return list(groups.values())


def _segments_can_merge(
    s1: Tuple[Point, Point],
    s2: Tuple[Point, Point],
    angle_tol: float,
    dist_tol: float,
    gap_tol: float,
) -> bool:
    """Check if two segments can be merged into one wall."""
    p1a, p1b = s1
    p2a, p2b = s2

    d1 = np.array([p1b.x - p1a.x, p1b.y - p1a.y])
    d2 = np.array([p2b.x - p2a.x, p2b.y - p2a.y])

    len1 = np.linalg.norm(d1)
    len2 = np.linalg.norm(d2)
    if len1 < 1e-6 or len2 < 1e-6:
        return False

    cos_angle = abs(np.dot(d1, d2) / (len1 * len2))
    angle = np.degrees(np.arccos(np.clip(cos_angle, -1, 1)))
    if angle > angle_tol:
        return False

    min_dist = _min_segment_distance(s1, s2)
    if min_dist > dist_tol:
        return False

    gap = _segment_gap(s1, s2)
    if gap > gap_tol:
        return False

    return True


def _min_segment_distance(
    s1: Tuple[Point, Point],
    s2: Tuple[Point, Point],
) -> float:
    """Minimum distance between two segments."""
    dists = []
    for p in [s1[0], s1[1]]:
        dists.append(_point_segment_distance(p, s2))
    for p in [s2[0], s2[1]]:
        dists.append(_point_segment_distance(p, s1))
    return min(dists)


def _point_segment_distance(p: Point, seg: Tuple[Point, Point]) -> float:
    """Distance from point to segment."""
    ax, ay = seg[0].x, seg[0].y
    bx, by = seg[1].x, seg[1].y
    px, py = p.x, p.y

    dx = bx - ax
    dy = by - ay
    len_sq = dx * dx + dy * dy
    if len_sq < 1e-10:
        return ((px - ax) ** 2 + (py - ay) ** 2) ** 0.5

    t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / len_sq))
    proj_x = ax + t * dx
    proj_y = ay + t * dy
    return ((px - proj_x) ** 2 + (py - proj_y) ** 2) ** 0.5


def _segment_gap(s1: Tuple[Point, Point], s2: Tuple[Point, Point]) -> float:
    """Minimum gap between segment endpoints."""
    dists = []
    for p1 in [s1[0], s1[1]]:
        for p2 in [s2[0], s2[1]]:
            dists.append(((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2) ** 0.5)
    return min(dists)


def merge_cluster_to_wall(
    cluster: List[Tuple[Point, Point]],
) -> List[Point]:
    """Convert a cluster of segments into an ordered list of wall points."""
    if len(cluster) == 1:
        return [cluster[0][0], cluster[0][1]]

    all_points = []
    for seg in cluster:
        all_points.append((seg[0].x, seg[0].y))
        all_points.append((seg[1].x, seg[1].y))

    unique = []
    seen = set()
    for px, py in all_points:
        key = (round(px, 1), round(py, 1))
        if key not in seen:
            seen.add(key)
            unique.append(Point(px, py))

    if len(unique) <= 2:
        return unique

    centroid = Point(
        np.mean([p.x for p in unique]),
        np.mean([p.y for p in unique]),
    )

    angles = []
    for p in unique:
        angle = np.arctan2(p.y - centroid.y, p.x - centroid.x)
        angles.append(angle)

    sorted_indices = np.argsort(angles)
    return [unique[i] for i in sorted_indices]


def simplify_wall(points: List[Point], tolerance: float = 2.0) -> List[Point]:
    """Remove collinear intermediate points from wall."""
    if len(points) <= 2:
        return points

    result = [points[0]]
    for i in range(1, len(points) - 1):
        prev = np.array([result[-1].x, result[-1].y])
        curr = np.array([points[i].x, points[i].y])
        nxt = np.array([points[i + 1].x, points[i + 1].y])

        d1 = curr - prev
        d2 = nxt - curr
        len1 = np.linalg.norm(d1)
        len2 = np.linalg.norm(d2)

        if len1 < 1e-6 or len2 < 1e-6:
            continue

        cross = abs(d1[0] * d2[1] - d1[1] * d2[0]) / (len1 * len2)
        if cross > 0.1:
            result.append(points[i])

    result.append(points[-1])
    return result
