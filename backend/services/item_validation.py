"""Limites de lo que entra al grafo de la escena.

Por donde entran los items:
- `PUT /campaigns/{id}/scenes/{sid}/items` (el frontend guarda el grafo del DM)
- el import de una campaña
- la deteccion automatica (el backend genera items)

Todos son rutas por las que puede pasar algo que rompa la partida:

- Un `NaN` o un `Infinity` en cualquier numero: `json.dumps` los escribe (no
  son JSON valido) y el `JSON.parse` del navegador los RECHAZA con un
  SyntaxError -> el snapshot entero falla y el jugador se queda sin vista.
- Una `image` con URL absoluta: el navegador del DM la carga (tracking, y el
  item puede acabar en un export/import). Solo se admiten assets locales.
- Textos o poligonos sin limite: cuelgan el render.

Los limites son de defensa, no de estilo: acotan lo que un dato (humano o de
una IA) puede hacer con la mesa.
"""

from __future__ import annotations

import math
from typing import Any

MAX_ITEMS = 1000
MAX_ID_LEN = 128
MAX_NAME_LEN = 200
MAX_DESCRIPTION_LEN = 2000
MAX_POINTS = 2000


class ItemValidationError(ValueError):
    """Los items no cumplen los limites. El mensaje va al DM."""


def _is_finite_number(value: Any) -> bool:
    if isinstance(value, bool):
        return True
    if isinstance(value, (int, float)):
        return math.isfinite(value)
    return True


def _find_non_finite(value: Any, path: str = "") -> str | None:
    """La ruta del primer numero no finito (NaN / Infinity)."""
    if isinstance(value, dict):
        for key, sub in value.items():
            found = _find_non_finite(sub, f"{path}.{key}" if path else str(key))
            if found:
                return found
        return None
    if isinstance(value, list):
        for i, sub in enumerate(value):
            found = _find_non_finite(sub, f"{path}[{i}]")
            if found:
                return found
        return None
    if not _is_finite_number(value):
        return path or "valor"
    return None


def _check_text(item: dict, errors: list[str]) -> None:
    item_id = str(item.get("id", "?"))[:24]
    name = item.get("name")
    if isinstance(name, str) and len(name) > MAX_NAME_LEN:
        errors.append(f"item {item_id}: nombre de {len(name)} caracteres (max {MAX_NAME_LEN})")
    description = item.get("description")
    if isinstance(description, str) and len(description) > MAX_DESCRIPTION_LEN:
        errors.append(
            f"item {item_id}: descripcion de {len(description)} caracteres (max {MAX_DESCRIPTION_LEN})"
        )


def _check_image(item: dict, errors: list[str]) -> None:
    image = item.get("image")
    if not isinstance(image, str) or not image:
        return
    if image.startswith(("http://", "https://", "//")):
        errors.append(
            f"item {str(item.get('id', '?'))[:24]}: la imagen tiene que ser un asset local, no una URL"
        )


def _check_shape(item: dict, errors: list[str]) -> None:
    shape = item.get("shape")
    if not isinstance(shape, dict):
        return
    points = shape.get("points")
    if isinstance(points, list) and len(points) > MAX_POINTS:
        errors.append(
            f"item {str(item.get('id', '?'))[:24]}: poligono de {len(points)} puntos (max {MAX_POINTS})"
        )


def validate_scene_items(items: Any) -> list[str]:
    """Devuelve la lista de problemas. Vacia = los items son guardables.

    No lanza: el que decide que hacer con los problemas es el que llama
    (el PUT rechaza con 422; el import puede limpiar).
    """
    errors: list[str] = []
    if not isinstance(items, list):
        return ["los items tienen que ser una lista"]
    if len(items) > MAX_ITEMS:
        errors.append(f"{len(items)} items (max {MAX_ITEMS})")

    for item in items:
        if not isinstance(item, dict):
            errors.append("un item no es un objeto")
            continue
        item_id = item.get("id")
        if not isinstance(item_id, str) or not item_id:
            errors.append("un item no tiene id")
        elif len(item_id) > MAX_ID_LEN:
            errors.append(f"id de {len(item_id)} caracteres (max {MAX_ID_LEN})")
        non_finite = _find_non_finite(item)
        if non_finite:
            errors.append(f"item {str(item_id)[:24]}: '{non_finite}' no es un numero finito")
        _check_text(item, errors)
        _check_image(item, errors)
        _check_shape(item, errors)
    return errors


def assert_valid_scene_items(items: Any) -> None:
    """Lanza `ItemValidationError` si los items no cumplen los limites."""
    errors = validate_scene_items(items)
    if errors:
        raise ItemValidationError("; ".join(errors[:10]))
