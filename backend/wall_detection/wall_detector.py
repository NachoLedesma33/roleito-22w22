"""Wall detection from preprocessed binary/edge images.

Two complementary detectors:
- Contour analysis: good for filled/outline walls (TEXTURED).
- scikit-image probabilistic Hough: returns precise line segments, good
  for clean blueprints and straight architectural lines.

Segments are validated by edge support: a wall only counts if actual wall
pixels exist along most of its length. Curved walls are chained into dense
polylines (nearest-neighbor ordering + optional B-spline smoothing).
"""

import cv2
import numpy as np
from typing import List, Tuple

from .preprocessing import DetectionMode
from .types import Point, DetectedWall
from .clustering import cluster_segments
from .geometry import smooth_wall_curve


def detect_walls(
    binary: np.ndarray,
    mode: DetectionMode = DetectionMode.BLUEPRINT,
    min_area: int = 500,
    min_wall_length: float = 10.0,
    merge_distance: float = 15.0,
    validate_support: bool = True,
    use_spline: bool = False,
    hough_threshold: int = 20,
) -> List[DetectedWall]:
    """Detect walls from binary image.

    BLUEPRINT: probabilistic Hough line detection.
    TEXTURED: contour analysis fused with Hough lines.

    `use_spline` enables scipy B-spline curve smoothing (imports scipy on
    first curved wall). Off by default — Hough polyline sampling already
    captures curved walls as dense polylines.
    """
    base_args = dict(min_wall_length=min_wall_length, merge_distance=merge_distance)
    if mode == DetectionMode.BLUEPRINT:
        return _detect_from_hough(binary, validate_support=validate_support, use_spline=use_spline, hough_threshold=15, **base_args)

    contour_walls = _detect_from_contours(binary, max(min_area, 800), min_wall_length, merge_distance, use_spline)
    hough_walls = _detect_from_hough(binary, validate_support=validate_support, use_spline=use_spline, hough_threshold=40, max_segments=200, **base_args)

    raw = []
    seen = set()
    for walls in (contour_walls, hough_walls):
        for wall in walls:
            for i in range(len(wall.points) - 1):
                key = (round(wall.points[i].x, 0), round(wall.points[i].y, 0),
                       round(wall.points[i+1].x, 0), round(wall.points[i+1].y, 0))
                if key not in seen:
                    seen.add(key)
                    raw.append((wall.points[i], wall.points[i + 1]))

    return _build_walls_from_segments(raw, merge_distance, min_wall_length, use_spline=use_spline, connectivity_filter=(mode == DetectionMode.TEXTURED))


def _detect_from_contours(
    binary: np.ndarray,
    min_area: int = 500,
    min_wall_length: float = 10.0,
    merge_distance: float = 15.0,
    use_spline: bool = False,
) -> List[DetectedWall]:
    """Detect walls from binary image using contour analysis + clustering."""
    contours, _ = cv2.findContours(
        binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )

    raw_segments = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < min_area:
            continue

        x_rect, y_rect, w_rect, h_rect = cv2.boundingRect(contour)
        aspect = max(w_rect, h_rect) / (min(w_rect, h_rect) + 1)
        if aspect < 1.5:
            continue

        extent = area / (w_rect * h_rect + 1e-6)
        if extent > 0.92:
            continue

        hull = cv2.convexHull(contour)
        hull_area = cv2.contourArea(hull)
        if hull_area < 1e-6:
            continue
        solidity = area / hull_area
        if solidity < 0.3:
            continue

        perimeter = cv2.arcLength(contour, True)
        epsilon = 0.02 * perimeter
        approx = cv2.approxPolyDP(contour, epsilon, True)

        points = approx.reshape(-1, 2)
        if len(points) < 2:
            continue

        for i in range(len(points)):
            p1 = Point(float(points[i][0]), float(points[i][1]))
            p2 = Point(float(points[(i + 1) % len(points)][0]),
                       float(points[(i + 1) % len(points)][1]))
            seg_len = ((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2) ** 0.5
            if seg_len >= min_wall_length:
                raw_segments.append((p1, p2))

    return _build_walls_from_segments(raw_segments, merge_distance, min_wall_length)


def _detect_from_hough(
    binary: np.ndarray,
    min_wall_length: float = 10.0,
    merge_distance: float = 15.0,
    validate_support: bool = True,
    max_segments: int = 600,
    use_spline: bool = False,
    hough_threshold: int = 20,
) -> List[DetectedWall]:
    """Detect wall segments using scikit-image probabilistic Hough transform."""
    try:
        from skimage.transform import probabilistic_hough_line
    except ImportError:
        return []

    lines = probabilistic_hough_line(
        binary,
        threshold=hough_threshold,
        line_length=max(12, int(min_wall_length)),
        line_gap=max(6, int(merge_distance / 2)),
    )

    candidates = []
    for (x1, y1), (x2, y2) in lines:
        p1 = Point(float(x1), float(y1))
        p2 = Point(float(x2), float(y2))
        seg_len = ((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2) ** 0.5
        if seg_len >= min_wall_length:
            candidates.append((seg_len, p1, p2))

    candidates.sort(key=lambda c: c[0], reverse=True)
    if len(candidates) > max_segments:
        candidates = candidates[:max_segments]

    raw_segments = []
    for seg_len, p1, p2 in candidates:
        if validate_support:
            support = _segment_support(p1, p2, binary)
            if support < 0.65:
                continue
        else:
            support = 0.8

        raw_segments.append((p1, p2, support))

    return _build_walls_from_segments(raw_segments, merge_distance, min_wall_length, use_spline=use_spline)


def _segment_support(p1: Point, p2: Point, binary: np.ndarray, step: float = 4.0) -> float:
    """Fraction of sampled points along a segment with wall pixels nearby.

    Samples every `step` pixels and checks a small neighborhood in the
    binary image for an active (wall) pixel. Kills false positives from
    textures, shadows and furniture on TEXTURED maps.
    """
    h, w = binary.shape
    length = ((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2) ** 0.5
    if length < 1e-6:
        return 0.0

    n = max(2, int(length / step))
    hit = 0
    radius = 2

    for i in range(n + 1):
        t = i / n
        x = int(round(p1.x + (p2.x - p1.x) * t))
        y = int(round(p1.y + (p2.y - p1.y) * t))

        x0, x1c = max(0, x - radius), min(w - 1, x + radius)
        y0, y1c = max(0, y - radius), min(h - 1, y + radius)
        if np.any(binary[y0:y1c + 1, x0:x1c + 1] > 0):
            hit += 1

    return hit / (n + 1)


def _build_walls_from_segments(
    raw_segments: List[Tuple],
    merge_distance: float = 15.0,
    min_wall_length: float = 10.0,
    use_spline: bool = False,
    connectivity_filter: bool = False,
) -> List[DetectedWall]:
    """Cluster raw segments into walls with chain-ordered points.

    raw_segments may be [(p1, p2)] or [(p1, p2, support)].
    """
    if not raw_segments:
        return []

    has_support = len(raw_segments[0]) == 3
    support_lookup = {}
    if has_support:
        for s in raw_segments:
            support_lookup[_support_key(s[0], s[1])] = s[2]

    tuples = [(s[0], s[1]) for s in raw_segments]

    clusters = cluster_segments(
        tuples,
        angle_tolerance=10.0,
        distance_tolerance=merge_distance,
        gap_tolerance=merge_distance * 2,
    )

    walls = []
    for i, cluster in enumerate(clusters):
        ordered = _order_points_into_chains(cluster)
        if len(ordered) < 2:
            continue

        if use_spline:
            curve = smooth_wall_curve(ordered, samples=40, smoothing=0.5)
        else:
            curve = ordered

        total_length = _polyline_length(curve)
        if total_length < min_wall_length:
            continue

        confidence = _compute_wall_confidence(cluster, total_length)
        if has_support:
            supports = [
                support_lookup.get(_support_key(s[0], s[1]), 0.5)
                for s in cluster
            ]
            avg_support = float(np.mean(supports))
            confidence = min(1.0, confidence * (0.4 + 0.6 * avg_support))

        walls.append(DetectedWall(
            id=f"wall-{i}",
            points=curve,
            thickness=10.0,
            confidence=confidence,
        ))

    if connectivity_filter and len(walls) > 2:
        endpoints = []
        for w in walls:
            endpoints.append((w.points[0].x, w.points[0].y))
            endpoints.append((w.points[-1].x, w.points[-1].y))

        connected = set()
        for wi, w in enumerate(walls):
            for endpoint in [(w.points[0].x, w.points[0].y), (w.points[-1].x, w.points[-1].y)]:
                for wj, other in enumerate(walls):
                    if wi == wj:
                        continue
                    for ep2 in [(other.points[0].x, other.points[0].y),
                                (other.points[-1].x, other.points[-1].y)]:
                        dist = ((endpoint[0]-ep2[0])**2 + (endpoint[1]-ep2[1])**2)**0.5
                        if dist < merge_distance * 2:
                            connected.add(wi)
                            connected.add(wj)

        walls = [w for wi, w in enumerate(walls) if wi in connected or len(walls) <= 3]

    return walls


def _support_key(p1: Point, p2: Point) -> tuple:
    return (
        round(p1.x, 1), round(p1.y, 1),
        round(p2.x, 1), round(p2.y, 1),
    )


def _order_points_into_chains(
    cluster: List[Tuple[Point, Point]],
) -> List[Point]:
    """Order segment endpoints into a continuous polyline chain.

    Greedy nearest-neighbor chaining starting from an endpoint. Works for
    straight walls, L-shapes and curved walls alike (polar ordering, the
    previous approach, fails on open curves).
    """
    if len(cluster) == 1:
        return [cluster[0][0], cluster[0][1]]

    points = []
    seen = set()
    for seg in cluster:
        for p in (seg[0], seg[1]):
            key = (round(p.x, 1), round(p.y, 1))
            if key not in seen:
                seen.add(key)
                points.append(Point(p.x, p.y))

    if len(points) <= 2:
        return points

    chain = [points.pop(_start_index(points))]
    while points:
        tail = chain[-1]
        nearest_i, nearest_d = 0, float("inf")
        for i, p in enumerate(points):
            d = ((p.x - tail.x) ** 2 + (p.y - tail.y) ** 2) ** 0.5
            if d < nearest_d:
                nearest_d, nearest_i = d, i
        chain.append(points.pop(nearest_i))

    return chain


def _start_index(points: List[Point]) -> int:
    """Pick a chain start: the point farthest from the centroid.

    Maximizes the chance of starting at an endpoint rather than a middle pint.
    """
    cx = np.mean([p.x for p in points])
    cy = np.mean([p.y for p in points])
    return int(np.argmax([(p.x - cx) ** 2 + (p.y - cy) ** 2 for p in points]))


def _polyline_length(points: List[Point]) -> float:
    total = 0.0
    for i in range(len(points) - 1):
        dx = points[i + 1].x - points[i].x
        dy = points[i + 1].y - points[i].y
        total += (dx ** 2 + dy ** 2) ** 0.5
    return total


def _compute_wall_confidence(cluster: List[Tuple[Point, Point]], length: float) -> float:
    """Compute confidence score for a detected wall."""
    conf = 0.5

    if length > 50:
        conf += 0.2
    elif length > 20:
        conf += 0.1

    if len(cluster) >= 2:
        conf += 0.15

    collinear_score = _cluster_collinearity(cluster)
    conf += collinear_score * 0.15

    return min(1.0, conf)


def _cluster_collinearity(cluster: List[Tuple[Point, Point]]) -> float:
    """How collinear are segments in the cluster (0-1)."""
    if len(cluster) <= 1:
        return 1.0

    all_points = []
    for seg in cluster:
        all_points.append([seg[0].x, seg[0].y])
        all_points.append([seg[1].x, seg[1].y])

    pts = np.array(all_points)
    mean = pts.mean(axis=0)
    centered = pts - mean

    _, s, _ = np.linalg.svd(centered, full_matrices=False)
    if s[0] < 1e-6:
        return 1.0

    return min(1.0, s[0] / (s[1] + 1e-6) / 10)