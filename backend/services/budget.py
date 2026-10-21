"""La dependencia que declara de que campaña es la llamada a la IA.

El tope de uso (C8) es por campaña: la ruta dice de cuál es, y el contador
sabe a quién cargarle el consumo.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

from core.agents.budget import campaign_scope


async def campaign_budget(campaign_id: str) -> AsyncIterator[None]:
    """La campaña a la que pertenece la llamada mientras dura la request."""
    with campaign_scope(campaign_id):
        yield
