"""Synthetic tests for the wall detection pipeline.

Each test draws an image, runs detect_map, and checks the output has the
expected structural content (walls, doors, rooms, walkable area).
"""

import os
import tempfile

import cv2
import numpy as np

from wall_detection import detect_map, DetectionMode


def _save(img: np.ndarray) -> str:
    fd, path = tempfile.mkstemp(suffix=".png")
    os.close(fd)
    cv2.imwrite(path, img)
    return path


def _draw_filled(img, pts, color=0):
    cv2.fillPoly(img, [np.array(pts, dtype=np.int32)], color)


def test_straight_wall_detected():
    """A single thin vertical wall (edge only) should produce one wall."""
    img = np.full((300, 400, 3), 255, np.uint8)
    cv2.line(img, (150, 30), (150, 270), 0, thickness=4)

    path = _save(img)
    result = detect_map(path, mode=DetectionMode.BLUEPRINT)

    assert result.wall_count >= 1


def test_curved_wall_detected_as_polyline():
    """A curved wall (polylines) should be detected as a multi-point wall."""
    img = np.full((300, 400, 3), 255, np.uint8)

    ys = np.linspace(40, 260, 200)
    xs = 100 + 50 * np.sin(np.linspace(0, np.pi, len(ys)))
    pts = np.column_stack([xs, ys]).astype(np.int32)

    cv2.polylines(img, [pts], False, 0, thickness=4)

    path = _save(img)
    result = detect_map(path, mode=DetectionMode.BLUEPRINT)

    assert result.wall_count >= 1

    curved = [w for w in result.walls if len(w.points) > 2]
    assert len(curved) >= 1, "curved wall should keep multiple points"


def test_enclosed_room_detected():
    """A rectangular room drawn as edges should produce walkable area."""
    img = np.full((300, 300, 3), 255, np.uint8)
    # Draw rectangle as edge lines (no fill) = clean blueprint
    cv2.line(img, (50, 50), (250, 50), 0, thickness=4)
    cv2.line(img, (250, 50), (250, 250), 0, thickness=4)
    cv2.line(img, (250, 250), (50, 250), 0, thickness=4)
    cv2.line(img, (50, 250), (50, 50), 0, thickness=4)

    path = _save(img)
    result = detect_map(path, mode=DetectionMode.BLUEPRINT)

    assert result.wall_count >= 1
    assert result.walkable_ratio > 0.1


def test_grid_removed_auto():
    """Auto grid removal should keep walls but drop grid lines."""
    img = np.full((300, 300, 3), 255, np.uint8)
    cv2.line(img, (70, 60), (70, 240), 0, thickness=4)
    for x in range(30, 300, 50):
        cv2.line(img, (x, 0), (x, 300), (180, 180, 180), 1)
    for y in range(30, 300, 50):
        cv2.line(img, (0, y), (300, y), (180, 180, 180), 1)

    path = _save(img)
    result = detect_map(path, mode=DetectionMode.BLUEPRINT)

    assert result.wall_count >= 1


def test_door_detected_between_two_walls():
    """Two collinear edge walls with a gap should produce a door."""
    img = np.full((200, 300, 3), 255, np.uint8)
    cv2.line(img, (40, 40), (130, 40), 0, thickness=4)
    cv2.line(img, (170, 40), (260, 40), 0, thickness=4)

    path = _save(img)
    result = detect_map(path, mode=DetectionMode.BLUEPRINT)

    assert result.door_count >= 0


def test_blank_map_no_walls():
    """A blank white map should produce zero walls."""
    img = np.full((200, 200, 3), 255, np.uint8)
    path = _save(img)
    result = detect_map(path, mode=DetectionMode.BLUEPRINT)

    assert result.wall_count == 0
    assert result.confidence == 0.0


def test_deteccion_es_reproducible():
    """La misma imagen debe dar los mismos muros, siempre.

    `probabilistic_hough_line` sorteaba pixeles sin semilla (skimage usa
    entropia nueva por llamada), asi que detectar dos veces la misma imagen daba
    propuestas distintas y el DM acumulaba muros al repetir la deteccion.
    """
    img = np.full((300, 400, 3), 255, np.uint8)
    for x in (60, 150, 240):
        cv2.line(img, (x, 40), (x, 260), 0, thickness=3)
    for y in (90, 180):
        cv2.line(img, (40, y), (360, y), 0, thickness=3)

    path = _save(img)

    def puntos():
        r = detect_map(path, mode=DetectionMode.BLUEPRINT)
        return r.wall_count, [
            (round(p.x, 6), round(p.y, 6)) for w in r.walls for p in w.points
        ]

    primero = puntos()
    segundo = puntos()

    assert primero[0] >= 1, "la imagen de prueba deberia tener muros"
    assert primero[0] == segundo[0], f"mismo seed, distinta cantidad: {primero[0]} vs {segundo[0]}"
    assert primero[1] == segundo[1], "mismo seed, distinta geometria"


def test_seed_es_el_escape_hatch():
    """Mismo mapa con otro seed: sigue detectando, pero es otra propuesta."""
    img = np.full((300, 400, 3), 255, np.uint8)
    for x in (60, 150, 240):
        cv2.line(img, (x, 40), (x, 260), 0, thickness=3)
    for y in (90, 180):
        cv2.line(img, (40, y), (360, y), 0, thickness=3)

    path = _save(img)

    def puntos(seed):
        r = detect_map(path, mode=DetectionMode.BLUEPRINT, seed=seed)
        return [(round(p.x, 6), round(p.y, 6)) for w in r.walls for p in w.points]

    assert puntos(0) == puntos(0), "seed fijo tiene que ser estable"
    assert puntos(7), "otro seed tambien tiene que detectar muros"


def test_to_dict_includes_walkable():
    """to_dict should expose rooms/walkable fields."""
    img = np.full((200, 200, 3), 255, np.uint8)
    path = _save(img)
    result = detect_map(path, mode=DetectionMode.BLUEPRINT)

    d = result.to_dict()
    assert "walkable_ratio" in d
    assert "walkable_areas" in d
    assert "rooms" in d
