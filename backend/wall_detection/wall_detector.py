"""Wall detection from preprocessed binary/edge images."""

import cv2
import numpy as np
from typing import List, Tuple
from .types import Point, DetectedWall
from .clustering import (
    cluster_segments,
    merge_cluster_to_wall,
    simplify_wall,
)


def detect_walls(
    binary: np.ndarray,
    min_area: int = 500,
    min_wall_length: float = 10.0,
    merge_distance: float = 15.0,
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

    clusters = cluster_segments(
        raw_segments,
        angle_tolerance=10.0,
        distance_tolerance=merge_distance,
        gap_tolerance=merge_distance * 2,
    )

    walls = []
    for i, cluster in enumerate(clusters):
        ordered_points = merge_cluster_to_wall(cluster)
        simplified = simplify_wall(ordered_points, tolerance=2.0)

        if len(simplified) < 2:
            continue

        total_length = 0.0
        for j in range(len(simplified) - 1):
            dx = simplified[j + 1].x - simplified[j].x
            dy = simplified[j + 1].y - simplified[j].y
            total_length += (dx ** 2 + dy ** 2) ** 0.5

        if total_length < min_wall_length:
            continue

        confidence = _compute_wall_confidence(cluster, total_length)

        walls.append(DetectedWall(
            id=f"wall-{i}",
            points=simplified,
            thickness=10.0,
            confidence=confidence,
        ))

    return walls


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
