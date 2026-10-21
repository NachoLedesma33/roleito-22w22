"""El estado vivo de la campana, en texto compacto.

**Determinista**: lo arma el motor de World State (codigo), no el modelo. Por
eso es barato: se calcula cuando el DM pregunta, no en cada evento (llamar al
modelo en cada evento quemaria la API key).

Es lo que le da al advisor una foto de "como esta la campana ahora" sin que
nadie tenga que pegarle el contexto a mano.
"""

from __future__ import annotations

MAX_PER_SECTION = 25
MAX_LINE = 400


def _where(locations: dict, entity) -> str:
    loc = locations.get(entity.current_location_id or "")
    return loc.name if loc else "sin ubicacion"


def format_live_state(state) -> str:
    """El estado del World State como texto compacto."""
    locations = state.locations
    lines: list[str] = []

    if state.current_date or state.current_session_id:
        lines.append(
            f"Fecha: {state.current_date or 'desconocida'} | "
            f"Sesion activa: {state.current_session_id or 'ninguna'}"
        )

    if state.characters:
        people = [
            f"{e.name} ({_where(locations, e)}, {e.status}"
            + (f", {e.hp}/{e.max_hp} PV" if e.hp is not None and e.max_hp else "")
            + ")"
            for e in list(state.characters.values())[:MAX_PER_SECTION]
        ]
        lines.append("Personajes: " + ", ".join(people))

    if state.npcs:
        npcs = [
            f"{e.name} ({_where(locations, e)}, {e.status})"
            for e in list(state.npcs.values())[:MAX_PER_SECTION]
        ]
        lines.append("NPCs: " + ", ".join(npcs))

    if state.quests:
        quests = [
            f"{q.name} ({q.status})" for q in list(state.quests.values())[:MAX_PER_SECTION]
        ]
        lines.append("Misiones: " + ", ".join(quests))

    if state.active_threads:
        lines.append(
            "Hilos abiertos: "
            + ", ".join(str(t) for t in state.active_threads[:MAX_PER_SECTION])
        )

    return "\n".join(line[:MAX_LINE] for line in lines)


async def build_live_state(db, campaign_id: str) -> str:
    """El estado vivo de la campana (texto). Vacio si no se puede calcular."""
    try:
        from core.world.engine import WorldStateEngine

        state = await WorldStateEngine(db).compute(campaign_id)
        text = format_live_state(state)

        # Las misiones que el DM creo y todavia no Gamificaron: el World State
        # solo trackea las que nacieron de eventos.
        quests = await _db_quests(db, campaign_id)
        if quests:
            line = "Misiones (del DM): " + ", ".join(
                f"{q['title']} ({q['status']})" for q in quests[:MAX_PER_SECTION]
            )
            text = f"{text}\n{line}" if text else line
        return text
    except Exception:  # noqa: BLE001
        # El estado vivo es un extra: si falla, el advisor sigue funcionando
        # con el lore de la campana.
        return ""


async def _db_quests(db, campaign_id: str) -> list[dict]:
    """Las misiones de la campana (tabla `quests`)."""
    from sqlalchemy import select

    from backend.models import Quest

    rows = (await db.execute(
        select(Quest).where(Quest.campaign_id == campaign_id)
    )).scalars().all()
    return [{"title": q.title, "status": q.status} for q in rows]
