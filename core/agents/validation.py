"""Limites de la salida de los agentes.

Un modelo puede devolver un texto de 1 MB (o un array de 10.000 elementos) y
eso se termina guardando en la DB o renderizando en el canvas. Los limites son
de defensa: acotan lo que un dato puede hacer con la mesa.
"""

from __future__ import annotations

from typing import Any

MAX_TEXT = 4000
MAX_LIST = 100
MAX_EVENTS = 200


def safe_text(value: Any, max_len: int = MAX_TEXT) -> str:
    """Texto acotado. Lo que no es string, es texto vacio."""
    if not isinstance(value, str):
        return ""
    return value[:max_len]


def safe_list(value: Any, max_items: int = MAX_LIST) -> list:
    """Lista acotada. Lo que no es lista, es lista vacia."""
    if not isinstance(value, list):
        return []
    return value[:max_items]


def safe_str_list(value: Any, max_items: int = MAX_LIST) -> list[str]:
    """Lista de strings acotada (y solo strings)."""
    return [s for s in safe_list(value, max_items) if isinstance(s, str)]
