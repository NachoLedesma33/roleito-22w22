"""Main detection pipeline."""

import cv2
import numpy as np
from typing import List, Optional
from .types import DetectedMap, DetectedWall, DetectedDoor
from .preprocessing import DetectionMode, preprocess_image
from .wall_detector import detect_walls
from .door_detector import detect_doors


def detect_map(
    image_path: str,
    mode: DetectionMode = DetectionMode.BLUEPRINT,
    grid_size: int = 0,
) -> DetectedMap:
    """Run full detection pipeline on an image."""
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not load image: {image_path}")

    h, w = img.shape[:2]

    binary = preprocess_image(img, mode)

    if grid_size > 0:
        from .preprocessing import remove_grid
        binary = remove_grid(binary, grid_size)

    walls = detect_walls(binary, min_area=500, min_wall_length=10.0)

    doors = detect_doors(walls, binary)

    overall_confidence = _compute_overall_confidence(walls, doors)

    return DetectedMap(
        width=w,
        height=h,
        walls=walls,
        doors=doors,
        confidence=overall_confidence,
        mode=mode.value,
    )


def _compute_overall_confidence(walls: List[DetectedWall], doors: List[DetectedDoor]) -> float:
    """Compute overall detection confidence."""
    all_conf = [w.confidence for w in walls] + [d.confidence for d in doors]
    if not all_conf:
        return 0.0
    return sum(all_conf) / len(all_conf)
