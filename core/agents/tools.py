"""Las tools de los agentes: acciones de DOMINIO sobre la campana (B5).

**El perimetro** (esto es lo que hace que sea seguro):

1. La lista es **cerrada y esta en el repo**: el modelo *elige* una tool, no
   escribe una. No hay forma de que invoque algo que no este aqui.
2. No hay **FS, ni shell, ni red, ni SQL libre**. Las tools son funciones del
   repo con argumentos validados.
3. Cada tool escribe **propuestas** (PROPOSED), no estado: el DM autoriza
   (la regla C4 del plan de seguridad). Hoy la unica que escribe es
   `proponer_evento`: deja el evento PROPOSED en la DB y el DM lo aprueba
   con el mismo boton que usa el session processor.
4. Los argumentos se validan con **pydantic** y `extra="forbid"`: un campo que
   no existe se rechaza.
5. Cada llamada queda **auditada** (agente, tool, hash de los argumentos) y
   cuenta contra el **presupuesto** de la campana.

Lo que el modelo NO puede hacer aca: tocar el codigo del front o del back,
escribir archivos, ejecutar procesos o salir a la red. El modelo devuelve
texto; el backend decide que se guarda. Eso no lo cambia B5: lo unico que
agrega es que el modelo pueda **preguntar** por datos de la campana y
**proponer** un evento que el DM autoriza.

La geometria NO se propone todavia: el grafo de la escena lo escribe el
frontend (PUT /items con el grafo entero), asi que una tool que escribiera
items_json se perderia en el proximo guardado del DM. Proponer geometria
necesita el camino de la deteccion (una PROPUESTA que el frontend mete en el
grafo con `pendingReview`), no un write del backend.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Callable, Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError

MAX_TOOL_ITERATIONS = 3
MAX_TOOL_RESULT_CHARS = 4000


class ToolError(Exception):
    """La tool no se pudo ejecutar (argumentos invalidos o error)."""


@dataclass
class ToolContext:
    """Lo que una tool puede tocar: la campana y nada mas.

    El `campaign_id` es la autoridad: toda query se scopea a esa campana.
    """

    campaign_id: str
    db: Any = None
    extra: dict = field(default_factory=dict)


@dataclass
class ToolSpec:
    name: str
    description: str
    parameters: dict
    handler: Callable[[ToolContext, dict], Any]
    writes: bool = False
    """True = propone cambios (el DM los autoriza). False = solo lectura."""


TOOLS: dict[str, ToolSpec] = {}


def register(spec: ToolSpec) -> ToolSpec:
    TOOLS[spec.name] = spec
    return spec


def tool_specs(names: list[str] | None = None) -> list[dict]:
    """Las tools en el formato que espera la API (OpenAI-compatible)."""
    chosen = names if names is not None else list(TOOLS)
    out = []
    for name in chosen:
        spec = TOOLS.get(name)
        if not spec:
            continue
        out.append({
            "type": "function",
            "function": {
                "name": spec.name,
                "description": spec.description,
                "parameters": spec.parameters,
            },
        })
    return out


def parse_tool_call(raw: str) -> dict | None:
    """Si el modelo pidio una tool, la devuelve. Si no, None.

    La convencion: el adapter serializa la tool call del provider como un
    JSON `{"tool_call": {...}}`. Asi el contrato de `AIProvider` sigue siendo
    texto->texto y el bucle de tools es el unico que lo interpreta.
    """
    if not raw:
        return None
    text = raw.strip()
    if not text.startswith("{"):
        return None
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return None
    if isinstance(data, dict) and isinstance(data.get("tool_call"), dict):
        return data["tool_call"]
    return None


async def run_tool(name: str, arguments: dict, ctx: ToolContext) -> str:
    """Ejecuta una tool: valida los argumentos, la ejecuta, la audita.

    Devuelve el resultado como texto (lo que se le vuelve a pasar al modelo).
    """
    spec = TOOLS.get(name)
    if not spec:
        raise ToolError(f"Tool desconocida: {name}")

    from core.agents.audit import record_call

    try:
        result = await spec.handler(ctx, arguments or {})
    except ToolError:
        raise
    except ValidationError as e:
        raise ToolError(f"Argumentos invalidos para {name}: {e}") from e
    except Exception as e:  # noqa: BLE001
        raise ToolError(f"La tool {name} fallo: {e}") from e

    text = result if isinstance(result, str) else json.dumps(result, ensure_ascii=False, default=str)
    text = text[:MAX_TOOL_RESULT_CHARS]
    record_call(
        agent_id="tool",
        provider="tool",
        model=name,
        prompt=json.dumps(arguments or {}, ensure_ascii=False, default=str),
        system="",
        status="ok",
        latency_ms=0,
        usage=None,
    )
    return text


# ── Las tools de dominio ───────────────────────────────────────────────


class ConsultarEstadoArgs(BaseModel):
    """Que parte de la campana quiere ver. `extra=forbid`: campos de mas, error."""

    model_config = ConfigDict(extra="forbid")

    entidad: Literal["personaje", "npc", "mision", "evento", "notas"]
    nombre: str = ""


async def _consultar_estado(ctx: ToolContext, args: dict) -> str:
    """Una parte puntual de la campana (lo que el contexto resumido no trae)."""
    parsed = ConsultarEstadoArgs(**(args or {}))
    db = ctx.db
    if db is None:
        return "No hay base de datos para consultar."

    from sqlalchemy import select

    from backend.models import Character, Event, NPC, Quest, Session

    if parsed.entidad == "personaje":
        rows = (await db.execute(
            select(Character).where(Character.campaign_id == ctx.campaign_id)
        )).scalars().all()
        picked = [c for c in rows if not parsed.nombre or parsed.nombre.lower() in c.name.lower()]
        return "\n".join(
            f"{c.name}: {c.description or 'sin descripcion'} "
            f"(clase: {c.class_ or '-'}, raza: {c.race or '-'}, estado: {c.status})"
            for c in picked[:10]
        ) or "No hay personajes con ese nombre."

    if parsed.entidad == "npc":
        rows = (await db.execute(
            select(NPC).where(NPC.campaign_id == ctx.campaign_id)
        )).scalars().all()
        picked = [n for n in rows if not parsed.nombre or parsed.nombre.lower() in n.name.lower()]
        return "\n".join(
            f"{n.name}: {n.description or 'sin descripcion'} (estado: {n.status})"
            for n in picked[:10]
        ) or "No hay NPCs con ese nombre."

    if parsed.entidad == "mision":
        rows = (await db.execute(
            select(Quest).where(Quest.campaign_id == ctx.campaign_id)
        )).scalars().all()
        picked = [q for q in rows if not parsed.nombre or parsed.nombre.lower() in q.title.lower()]
        return "\n".join(
            f"{q.title} ({q.status}): {q.description or 'sin descripcion'}"
            for q in picked[:10]
        ) or "No hay misiones con ese nombre."

    if parsed.entidad == "evento":
        rows = (await db.execute(
            select(Event)
            .where(Event.campaign_id == ctx.campaign_id)
            .order_by(Event.id.desc())
            .limit(30)
        )).scalars().all()
        picked = [e for e in rows if not parsed.nombre or parsed.nombre.lower() in e.description.lower()]
        return "\n".join(
            f"[{e.type}] {e.description} (estado: {e.status})" for e in picked[:15]
        ) or "No hay eventos con ese texto."

    # notas: las notas crudas de las sesiones.
    rows = (await db.execute(
        select(Session)
        .where(Session.campaign_id == ctx.campaign_id)
        .order_by(Session.number.desc())
        .limit(3)
    )).scalars().all()
    picked = [s for s in rows if not parsed.nombre or parsed.nombre.lower() in (s.title or "").lower()]
    return "\n\n".join(
        f"--- Sesion {s.number}: {s.title} ---\n{s.raw_notes or s.summary or 'sin notas'}"
        for s in picked[:3]
    ) or "No hay notas de sesion."


register(
    ToolSpec(
        name="consultar_estado",
        description=(
            "Consulta una parte puntual de la campana que no esta en el resumen: "
            "un personaje, un NPC, una mision, un evento o las notas de las sesiones."
        ),
        parameters=ConsultarEstadoArgs.model_json_schema(),
        handler=_consultar_estado,
        writes=False,
    )
)


class ProponerEventoArgs(BaseModel):
    """Un evento propuesto. Nace PROPOSED: el DM lo autoriza (o lo rechaza).

    NO lleva `session_id`: la sesion la resuelve la tool (la actual de la
    campana). Si el modelo pudiera elegirla, podria colgar un evento de la
    sesion de OTRA campana.
    """

    model_config = ConfigDict(extra="forbid")

    description: str = Field(min_length=3, max_length=500)
    type: str = Field(default="DIALOGUE", max_length=40, pattern=r"^[A-Z][A-Z0-9_]*$")
    # Nombres, no ids: el resolver los busca DENTRO de la campana (los que no
    # existen quedan como aviso, no como error).
    actor: str = Field(default="", max_length=120)
    target: str = Field(default="", max_length=120)
    location: str = Field(default="", max_length=120)


async def _proponer_evento(ctx: ToolContext, args: dict) -> str:
    """Propone un evento. Queda PROPOSED: el DM lo autoriza.

    Es el mismo camino que el session processor (`propose_session_events`): el
    canon no lo escribe la IA, lo propone.
    """
    parsed = ProponerEventoArgs(**(args or {}))
    db = ctx.db
    if db is None:
        raise ToolError("No hay base de datos para proponer el evento.")

    session_id = await _current_session_id(db, ctx.campaign_id)
    if not session_id:
        raise ToolError(
            "La campana no tiene sesiones: el DM tiene que crear una antes "
            "de que el advisor proponga eventos."
        )

    from core.agents.proposals import propose_session_events

    proposals, warnings = await propose_session_events(
        db,
        ctx.campaign_id,
        session_id,
        [
            {
                "type": parsed.type,
                "description": parsed.description.strip(),
                "actors": [parsed.actor] if parsed.actor else [],
                "targets": [parsed.target] if parsed.target else [],
                "location": parsed.location,
            }
        ],
    )
    if not proposals:
        return "No se pudo proponer el evento: " + ("; ".join(warnings) or "sin detalle")
    lines = [
        f"Evento propuesto (PROPOSED, lo autoriza el DM): {p.description}"
        for p in proposals
    ]
    lines += [f"Aviso: {w}" for w in warnings]
    return "\n".join(lines)


async def _current_session_id(db, campaign_id: str) -> str:
    """La sesion donde colgar un evento propuesto: la actual de la campana.

    La resuelve el backend, no el modelo: el modelo no conoce ids de sesion
    y, si pudiera elegir, podria apuntar a otra campana.
    """
    from sqlalchemy import select

    from backend.models import Campaign, Session

    campaign = (await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )).scalar_one_or_none()
    if campaign and campaign.current_session_id:
        session = (await db.execute(
            select(Session).where(
                Session.id == campaign.current_session_id,
                Session.campaign_id == campaign_id,
            )
        )).scalar_one_or_none()
        if session:
            return session.id

    # Sin sesion activa: la ultima de la campana.
    session = (await db.execute(
        select(Session)
        .where(Session.campaign_id == campaign_id)
        .order_by(Session.number.desc())
        .limit(1)
    )).scalar_one_or_none()
    return session.id if session else ""


register(
    ToolSpec(
        name="proponer_evento",
        description=(
            "Propone un evento para la sesion (lo que paso, a quien, donde). "
            "Nace PROPOSED: el DM lo autoriza. No escribe el canon."
        ),
        parameters=ProponerEventoArgs.model_json_schema(),
        handler=_proponer_evento,
        writes=True,
    )
)
