"""La dependencia que declara de que campaña es la llamada a la IA.

El tope de uso (C8) es por campaña: la ruta dice de cuál es, y el contador
sabe a quién cargarle el consumo. Y si la monetización está encendida (M0),
acá se revisa el plan de la campaña.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

from fastapi import Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.agents.budget import campaign_scope
from database import get_session
from models import Campaign
from services.billing import QuotaExceeded, check_quota, is_enabled


async def campaign_budget(
    campaign_id: str,
    db: AsyncSession = Depends(get_session),
) -> AsyncIterator[None]:
    """La campaña a la que pertenece la llamada mientras dura la request."""
    from core.agents.provider import get_ai_config

    config = get_ai_config()
    campaign = (await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )).scalar_one_or_none()
    settings = campaign.settings_json if campaign else None

    if is_enabled(config):
        try:
            check_quota(config, campaign_id, settings)
        except QuotaExceeded as e:
            raise HTTPException(status_code=402, detail=str(e))

    # Una campaña marcada como sensible ("solo local") no puede mandar sus
    # datos a un proveedor externo (C6).
    if isinstance(settings, dict) and settings.get("local_only"):
        from core.agents.profiles import is_external, profile_for_agent

        _, profile = profile_for_agent("", config)
        if is_external(profile):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Esta campaña está marcada como 'solo local' y el perfil "
                    "elegido manda el texto a un proveedor externo. "
                    "Elegí un perfil local (Ollama)."
                ),
            )

    with campaign_scope(campaign_id):
        yield
