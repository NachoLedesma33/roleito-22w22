"""Tests for AI detection refinement (filter + snap + simplify)."""

import math

from wall_detection.refine import (
    _snap_angle,
    _snap_segment,
    _max_deviation,
    refine_ai_detection,
)
from wall_detection.types import DetectedMap, DetectedWall, Point


def _wall(points, confidence=0.9):
    pts = [Point(x, y) for x, y in points]
    return DetectedWall(
        id=f"w-{pts[0].x}-{pts[0].y}",
        points=pts,
        confidence=confidence,
    )


def test_snap_angle_axis_aligned():
    assert _snap_angle(3.0, 8.0) == 0.0
    assert _snap_angle(88.0, 8.0) == 90.0
    assert _snap_angle(44.0, 8.0) == 45.0
    assert _snap_angle(179.0, 8.0) == 0.0


def test_snap_angle_too_far_kept():
    assert _snap_angle(37.0, 5.0) == 37.0


def test_snap_segment_keeps_length_and_center():
    snapped0, snapped1 = _snap_segment(Point(100, 100), Point(140, 106), 8.0)
    length = math.hypot(snapped1.x - snapped0.x, snapped1.y - snapped0.y)
    assert abs(length - math.hypot(40, 6)) < 1e-6
    cx = (snapped0.x + snapped1.x) / 2
    cy = (snapped0.y + snapped1.y) / 2
    assert abs(cx - 120) < 1e-6 and abs(cy - 103) < 1e-6
    horizontal = _snap_segment(Point(0, 0), Point(100, 6), 8.0)
    assert abs(horizontal[0].y - horizontal[1].y) < 1e-6


def test_max_deviation_straight_vs_curved():
    straight = [Point(0, 0), Point(50, 1), Point(100, 0)]
    assert _max_deviation(straight) < 1.5
    curved = [Point(0, 0), Point(50, 30), Point(100, 0)]
    assert _max_deviation(curved) > 10.0


def test_refine_filters_low_confidence():
    m = DetectedMap(
        width=1000, height=1000,
        walls=[
            _wall([(100, 100), (300, 100)], confidence=0.9),
            _wall([(100, 200), (300, 200)], confidence=0.1),
        ],
    )
    out = refine_ai_detection(m)
    assert len(out.walls) == 1
    assert out.walls[0].confidence == 0.9


def test_refine_filters_short_fragments():
    m = DetectedMap(
        width=1000, height=1000,
        walls=[_wall([(500, 500), (512, 506)], confidence=0.9)],
    )
    out = refine_ai_detection(m)
    assert len(out.walls) == 0


def test_refine_collapses_near_straight_polyline():
    m = DetectedMap(
        width=1000, height=1000,
        walls=[_wall([(100, 100), (300, 102), (500, 100)], confidence=0.9)],
    )
    out = refine_ai_detection(m)
    assert len(out.walls) == 1
    assert len(out.walls[0].points) == 2


def test_refine_snaps_oblique_wall():
    m = DetectedMap(
        width=1000, height=1000,
        walls=[_wall([(100, 100), (400, 110)], confidence=0.9)],
    )
    out = refine_ai_detection(m)
    w = out.walls[0]
    p0, p1 = w.points
    assert abs(p1.y - p0.y) < 1e-6


def test_refine_keeps_true_diagonal():
    m = DetectedMap(
        width=1000, height=1000,
        walls=[_wall([(100, 100), (400, 400)], confidence=0.9)],
    )
    out = refine_ai_detection(m)
    p0, p1 = out.walls[0].points
    assert abs((p1.y - p0.y) - (p1.x - p0.x)) < 1e-6


def test_refine_empty_still_ok():
    m = DetectedMap(width=1000, height=1000, walls=[])
    out = refine_ai_detection(m)
    assert out.walls == []