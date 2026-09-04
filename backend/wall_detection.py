"""
Wall Detection Service
Automatically detect walls and doors from battle map images using OpenCV.

Algorithm based on Auto-Wall (github.com/ThreeHats/auto-wall):
1. Grayscale → Gaussian Blur → Canny Edge Detection
2. findContours → filter by area → approxPolyDP simplification
3. Contour segments → wall line segments
4. Gap detection in wall runs → door candidates
"""

import cv2
import numpy as np
from pathlib import Path
from typing import Optional


class WallDetectionConfig:
    def __init__(
        self,
        canny_low: int = 50,
        canny_high: int = 150,
        blur_size: int = 5,
        min_area: int = 500,
        approx_epsilon: float = 0.02,
        min_wall_length: float = 5.0,
        max_door_width: float = 80.0,
        min_door_width: float = 15.0,
        merge_distance: float = 10.0,
    ):
        self.canny_low = canny_low
        self.canny_high = canny_high
        self.blur_size = blur_size
        self.min_area = min_area
        self.approx_epsilon = approx_epsilon
        self.min_wall_length = min_wall_length
        self.max_door_width = max_door_width
        self.min_door_width = min_door_width
        self.merge_distance = merge_distance


def detect_walls_from_image(
    image_path: str,
    config: Optional[WallDetectionConfig] = None,
) -> dict:
    """
    Detect walls and doors from a battle map image.

    Returns dict with:
        - walls: list of {"start": [x, y], "end": [x, y]} in normalized coords (0-1)
        - doors: list of {"x": x, "y": y, "width": w} in normalized coords (0-1)
        - image_size: {"width": w, "height": h}
        - wall_count: int
        - door_count: int
    """
    if config is None:
        config = WallDetectionConfig()

    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not load image: {image_path}")

    h, w = img.shape[:2]

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    blur_k = max(3, config.blur_size | 1)
    blurred = cv2.GaussianBlur(gray, (blur_k, blur_k), 0)

    edges = cv2.Canny(blurred, config.canny_low, config.canny_high)

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)

    contours, hierarchy = cv2.findContours(
        edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )

    wall_segments = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < config.min_area:
            continue

        perimeter = cv2.arcLength(contour, True)
        epsilon = config.approx_epsilon * perimeter
        approx = cv2.approxPolyDP(contour, epsilon, True)

        points = approx.reshape(-1, 2)
        if len(points) < 2:
            continue

        for i in range(len(points)):
            p1 = points[i]
            p2 = points[(i + 1) % len(points)]
            seg_len = np.linalg.norm(p2 - p1)
            if seg_len >= config.min_wall_length:
                wall_segments.append({
                    "start": [float(p1[0]), float(p1[1])],
                    "end": [float(p2[0]), float(p2[1])],
                })

    wall_segments = _merge_nearby_segments(wall_segments, config.merge_distance)

    doors = _detect_doors(wall_segments, config)

    wall_segments = _normalize_segments(wall_segments, w, h)
    doors = _normalize_doors(doors, w, h)

    return {
        "walls": wall_segments,
        "doors": doors,
        "image_size": {"width": w, "height": h},
        "wall_count": len(wall_segments),
        "door_count": len(doors),
    }


def _merge_nearby_segments(segments: list, merge_distance: float) -> list:
    """Merge wall segments that are close together and roughly collinear."""
    if not segments:
        return segments

    merged = []
    used = set()

    for i, seg_i in enumerate(segments):
        if i in used:
            continue

        chain = [seg_i]
        used.add(i)

        changed = True
        while changed:
            changed = False
            for j, seg_j in enumerate(segments):
                if j in used:
                    continue
                for existing in chain:
                    if _segments_close(existing, seg_j, merge_distance):
                        chain.append(seg_j)
                        used.add(j)
                        changed = True
                        break

        if len(chain) == 1:
            merged.append(chain[0])
        else:
            points = []
            for s in chain:
                points.append(s["start"])
                points.append(s["end"])
            points = _dedupe_points(points, merge_distance)
            if len(points) >= 2:
                simplified = _simplify_chain(points, merge_distance)
                for k in range(len(simplified) - 1):
                    merged.append({
                        "start": simplified[k],
                        "end": simplified[k + 1],
                    })

    return merged


def _segments_close(s1: dict, s2: dict, dist: float) -> bool:
    """Check if two segments have endpoints within distance."""
    for p1 in [s1["start"], s1["end"]]:
        for p2 in [s2["start"], s2["end"]]:
            d = ((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2) ** 0.5
            if d < dist:
                return True
    return False


def _dedupe_points(points: list, dist: float) -> list:
    """Remove duplicate points within distance."""
    result = []
    for p in points:
        is_dup = False
        for r in result:
            d = ((p[0] - r[0]) ** 2 + (p[1] - r[1]) ** 2) ** 0.5
            if d < dist:
                is_dup = True
                break
        if not is_dup:
            result.append(p)
    return result


def _simplify_chain(points: list, merge_distance: float) -> list:
    """Simplify a chain of points by removing collinear intermediates."""
    if len(points) <= 2:
        return points

    result = [points[0]]
    for i in range(1, len(points) - 1):
        prev = np.array(result[-1])
        curr = np.array(points[i])
        nxt = np.array(points[i + 1])

        d1 = curr - prev
        d2 = nxt - curr

        len1 = np.linalg.norm(d1)
        len2 = np.linalg.norm(d2)

        if len1 < 1e-6 or len2 < 1e-6:
            continue

        cross = abs(d1[0] * d2[1] - d1[1] * d2[0]) / (len1 * len2)

        if cross > 0.15:
            result.append(points[i])

    result.append(points[-1])
    return result


def _detect_doors(segments: list, config: WallDetectionConfig) -> list:
    """Detect potential doors as gaps between wall segment endpoints."""
    endpoints = []
    for seg in segments:
        endpoints.append({"point": seg["start"], "seg_idx": len(endpoints)})
        endpoints.append({"point": seg["end"], "seg_idx": len(endpoints)})

    doors = []
    used = set()

    for i in range(len(endpoints)):
        if i in used:
            continue
        for j in range(i + 1, len(endpoints)):
            if j in used:
                continue

            p1 = endpoints[i]["point"]
            p2 = endpoints[j]["point"]
            d = ((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2) ** 0.5

            if config.min_door_width <= d <= config.max_door_width:
                mid_x = (p1[0] + p2[0]) / 2
                mid_y = (p1[1] + p2[1]) / 2
                doors.append({
                    "x": mid_x,
                    "y": mid_y,
                    "width": d,
                })
                used.add(i)
                used.add(j)
                break

    return doors


def _normalize_segments(segments: list, img_w: int, img_h: int) -> list:
    """Normalize pixel coordinates to 0-1 range, centered at 0.5, 0.5."""
    result = []
    for seg in segments:
        result.append({
            "start": [
                seg["start"][0] / img_w,
                seg["start"][1] / img_h,
            ],
            "end": [
                seg["end"][0] / img_w,
                seg["end"][1] / img_h,
            ],
        })
    return result


def _normalize_doors(doors: list, img_w: int, img_h: int) -> list:
    """Normalize pixel coordinates to 0-1 range."""
    result = []
    for door in doors:
        result.append({
            "x": door["x"] / img_w,
            "y": door["y"] / img_h,
            "width": door["width"] / max(img_w, img_h),
        })
    return result


def scene_items_from_detection(detection_result: dict, campaign_id: str) -> list:
    """
    Convert detection results to SceneItem dicts ready for the frontend.

    Wall coordinates are in normalized 0-1 space relative to image dimensions.
    The frontend will multiply by mapScale * 10 to get 3D world coordinates.
    """
    import time
    import random

    items = []
    base_time = int(time.time() * 1000)

    for i, wall in enumerate(detection_result["walls"]):
        item_id = f"wall-auto-{base_time}-{i}-{random.randint(1000, 9999)}"

        sx = wall["start"][0]
        sy = wall["start"][1]
        ex = wall["end"][0]
        ey = wall["end"][1]

        items.append({
            "id": item_id,
            "type": "shape",
            "shape": {
                "type": "line",
                "points": [sx, sy, ex, ey],
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
                "thickness": 10,
                "opacity": 0.0,
                "lineOfSight": True,
                "movement": True,
                "soundOcclusion": 0.8,
            },
        })

    for i, door in enumerate(detection_result["doors"]):
        item_id = f"door-auto-{base_time}-{i}-{random.randint(1000, 9999)}"

        items.append({
            "id": item_id,
            "type": "shape",
            "shape": {
                "type": "rectangle",
                "width": door["width"],
                "height": door["width"] * 0.4,
            },
            "position": {"x": door["x"], "y": 0, "z": door["y"]},
            "rotation": 0,
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
            },
        })

    return items
