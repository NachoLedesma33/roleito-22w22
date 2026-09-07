"""Main detection pipeline."""

import cv2
import numpy as np
from typing import List, Optional

from .types import DetectedMap, DetectedWall, DetectedDoor
from .preprocessing import DetectionMode, preprocess_image, remove_grid, remove_grid_auto
from .wall_detector import detect_walls
from .door_detector import detect_doors
from .geometry import detect_rooms, compute_walkable_areas


def classify_image(img: np.ndarray) -> DetectionMode:
    """Heuristic to decide blueprint vs textured from color variance.

    Blueprints are mostly grayscale with low saturation. Textured maps
    have high color variance and saturation.
    """
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    mean_sat = float(hsv[:, :, 1].mean())
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    std_val = float(gray.std())

    if mean_sat < 40 and std_val < 80:
        return DetectionMode.BLUEPRINT
    return DetectionMode.TEXTURED


def detect_map(
    image_path: str,
    mode: Optional[DetectionMode] = None,
    grid_size: int = 0,
    auto_grid: bool = True,
    min_wall_length: float = 10.0,
    max_dim: int = 1200,
    use_ai: bool = False,
    ai_base_url: str = "",
    ai_api_key: str = "",
    ai_model: str = "gpt-4o",
) -> DetectedMap:
    """Run full detection pipeline on an image.

    Pipeline:
        image -> (classify if mode=None) -> (downscale if huge)
               -> CV preprocess or AI detect -> rooms -> walkable areas

    Large images are downscaled internally for speed; detected coordinates
    are rescaled back to the original image space before returning.

    When use_ai=True and credentials are provided, textured maps are
    sent to a VLM for wall proposal (much better accuracy).
    """
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not load image: {image_path}")

    h, w = img.shape[:2]

    if mode is None:
        mode = classify_image(img)

    ai_used = False
    if use_ai and mode == DetectionMode.TEXTURED and ai_api_key:
        try:
            from .ai_detector import detect_walls_ai_sync
            detection = detect_walls_ai_sync(
                image_path,
                base_url=ai_base_url or "https://api.openai.com/v1",
                api_key=ai_api_key,
                model=ai_model,
            )
            from .refine import refine_ai_detection
            detection = refine_ai_detection(detection)
            ai_used = True
        except Exception as e:
            import logging
            logging.getLogger("roleito.wall_detection").warning(
                "AI detection failed, falling back to CV: %s", e
            )

    if not ai_used:
        detection = _detect_map_cv(
            img, h, w, mode, grid_size, auto_grid, min_wall_length, max_dim
        )

    from .geometry import detect_rooms as _detect_rooms, compute_walkable_areas as _compute_wa

    rooms = _detect_rooms(detection.walls, detection.width, detection.height)
    walkable_areas, walkable_ratio = _compute_wa(detection.walls, detection.width, detection.height)

    _link_doors_to_rooms(detection.doors, rooms)

    detection.rooms = rooms
    detection.walkable_areas = walkable_areas
    detection.walkable_ratio = walkable_ratio

    return detection


def _detect_map_cv(
    img: np.ndarray,
    h: int,
    w: int,
    mode: DetectionMode,
    grid_size: int,
    auto_grid: bool,
    min_wall_length: float,
    max_dim: int,
) -> DetectedMap:
    """CV-only detection path (blueprint or textured fallback)."""
    scale = min(1.0, max_dim / max(h, w)) if max_dim > 0 else 1.0

    if scale < 1.0:
        img = cv2.resize(img, (max(1, int(w * scale)), max(1, int(h * scale))),
                         interpolation=cv2.INTER_AREA)
        h, w = img.shape[:2]

    binary = preprocess_image(img, mode)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    if grid_size > 0:
        binary = remove_grid(binary, grid_size)
    elif auto_grid:
        binary = remove_grid_auto(binary, gray=gray)

    length_floor = max(15.0, 0.025 * max(h, w)) if mode == DetectionMode.BLUEPRINT else 25.0
    walls = detect_walls(binary, mode=mode, min_area=500, min_wall_length=length_floor)
    doors = detect_doors(walls, binary)

    overall_confidence = _compute_overall_confidence(walls, doors)

    detection = DetectedMap(
        width=w,
        height=h,
        walls=walls,
        doors=doors,
        confidence=overall_confidence,
        mode=mode.value,
    )

    if scale < 1.0:
        _rescale_detection(detection, 1.0 / scale)

    return detection


def _rescale_detection(detection: DetectedMap, factor: float) -> None:
    """Rescale all coordinates back to the original image space."""
    detection.width = int(detection.width * factor)
    detection.height = int(detection.height * factor)

    for wall in detection.walls:
        for p in wall.points:
            p.x = p.x * factor
            p.y = p.y * factor

    for door in detection.doors:
        door.position.x = door.position.x * factor
        door.position.y = door.position.y * factor
        door.width = door.width * factor

    for room in detection.rooms:
        for p in room.polygon:
            p.x = p.x * factor
            p.y = p.y * factor
        room.area = room.area * (factor * factor)

    for area in detection.walkable_areas:
        for p in area.polygon:
            p.x = p.x * factor
            p.y = p.y * factor
        area.area = area.area * (factor * factor)


def _link_doors_to_rooms(doors: List[DetectedDoor], rooms: list) -> None:
    """Attach door ids to the rooms whose boundary they sit on."""
    from shapely.geometry import Point as SPoint, Polygon

    for door in doors:
        p = SPoint(door.position.x, door.position.y)
        for room in rooms:
            pts = [(pt.x, pt.y) for pt in room.polygon]
            if len(pts) < 3:
                continue
            if Polygon(pts).dwithin(p, 15.0):
                room.door_ids.append(door.id)


def _compute_overall_confidence(walls: List[DetectedWall], doors: List[DetectedDoor]) -> float:
    """Compute overall detection confidence."""
    all_conf = [w.confidence for w in walls] + [d.confidence for d in doors]
    if not all_conf:
        return 0.0
    return sum(all_conf) / len(all_conf)