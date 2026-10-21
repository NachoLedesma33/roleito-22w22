"""Limites de lo que entra al grafo de la escena.

Un `NaN` en un item rompe el snapshot del jugador (el `JSON.parse` del
navegador rechaza `NaN`: no es JSON valido) y una `image` con URL absoluta
hace que el navegador del DM cargue un host ajeno.
"""

import math

import pytest

from services.item_validation import (
    MAX_POINTS,
    ItemValidationError,
    assert_valid_scene_items,
    validate_scene_items,
)


def item(**overrides):
    base = {
        "id": "wall-1",
        "name": "Muro",
        "x": 0.0,
        "y": 0.0,
        "rotation": 0.0,
        "scale": 1.0,
        "width": 0.0,
        "height": 0.0,
        "zIndex": 0,
        "layer": 1,
        "visible": True,
        "locked": False,
        "metadata": {"type": "wall"},
        "shape": {"type": "line", "points": [0.2, 0.5, 0.8, 0.5]},
    }
    base.update(overrides)
    return base


def test_un_item_normal_pasa():
    assert validate_scene_items([item()]) == []
    assert_valid_scene_items([item()])


def test_un_nan_no_pasa():
    # json.dumps lo escribe como NaN y el JSON.parse del navegador lo rechaza.
    bad = item()
    bad["x"] = float("nan")
    errors = validate_scene_items([bad])
    assert errors
    assert "finito" in errors[0]
    with pytest.raises(ItemValidationError):
        assert_valid_scene_items([bad])


def test_un_infinity_no_pasa():
    bad = item()
    bad["shape"] = {"type": "line", "points": [0.0, 0.0, math.inf, 0.5]}
    assert validate_scene_items([bad])


def test_una_url_externa_no_pasa():
    # El navegador del DM la cargaria (tracking) y el item puede acabar en un
    # export/import.
    errors = validate_scene_items([item(image="https://ejemplo.com/img.png")])
    assert errors
    assert "asset local" in errors[0]
    # Un asset local si pasa.
    assert validate_scene_items([item(image="/api/static/assets/x/scene/y.png")]) == []


def test_un_poligono_enorme_no_pasa():
    puntos = [0.5, 0.5] * (MAX_POINTS + 10)
    errors = validate_scene_items([item(shape={"type": "polygon", "points": puntos})])
    assert errors
    assert "puntos" in errors[0]


def test_un_nombre_largo_no_pasa():
    errors = validate_scene_items([item(name="x" * 5000)])
    assert errors
    assert "nombre" in errors[0]


def test_demasiados_items_no_pasan():
    errors = validate_scene_items([item(id=f"i{i}") for i in range(1200)])
    assert errors
