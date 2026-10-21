"""El digest de lo que espera la decision del DM.

**Determinista**: lo cuenta el codigo (una consulta y el archivo de canon),
no el modelo. Por eso es gratis: se puede preguntar cada cuantos segundos
sin gastar un solo token de la API key del DM.

Es la version corta de "cambio algo en mi campana?": el advisor avisa sin
llamar al modelo (docs/engineering/PLAN-PROVEEDORES-IA-Y-SEGURIDAD.md, J3).
"""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.canon.manager import CanonManager
from models import Event


async def build_pending_digest(db: AsyncSession, campaign_id: str) -> dict:
    """Que espera la decision del DM: propuestas de evento y canon en revision.

    Solo cuenta: no escribe nada, no llama al modelo y no depende de ningun
    proveedor. El DM sigue siendo el unico que autoriza (C4).
    """
    proposals = (
        await db.execute(
            select(func.count(Event.id)).where(
                Event.campaign_id == campaign_id,
                Event.status == "PROPOSED",
            )
        )
    ).scalar_one()

    canon_review = len(await CanonManager(db).list_entries(campaign_id, "REVIEW"))

    return {
        "proposals": int(proposals),
        "canon_review": canon_review,
        "pending": int(proposals) + canon_review,
    }
