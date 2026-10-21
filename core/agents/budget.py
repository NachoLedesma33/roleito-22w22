"""Presupuesto de uso de la IA (C8 del plan de seguridad).

**No es cobrarle al jugador**: es un tope al consumo de IA del propio DM (su
API key). Lo que evita es que un bucle de agentes se coma la cuota sin que
nadie lo note.

- El limite vive en la config de IA (`daily_call_limit`, 0 = sin tope: el
  default, para que no moleste a nadie).
- El contador vive en `data/ai_budget.json` (local, gitignored): por campaña
  y por día.
- El tope se aplica **antes de salir a internet**: si ya se alcanzó, la
  llamada se rechaza y no se gasta nada.
- Los **reintentos cuentan**: un provider que reintenta 3 veces son 3
  requests, y el tope los ve (si no, el tope se esquivaria solo).
"""

from __future__ import annotations

import json
from contextlib import contextmanager
from contextvars import ContextVar
from datetime import date
from pathlib import Path

BUDGET_PATH = Path(__file__).resolve().parents[2] / "data" / "ai_budget.json"
KEEP_DAYS = 7

_current_campaign: ContextVar[str | None] = ContextVar("roleito_ai_campaign", default=None)


class BudgetExceeded(RuntimeError):
    """La campaña alcanzó su tope diario de llamadas a la IA."""


@contextmanager
def campaign_scope(campaign_id: str | None):
    """La campaña a la que pertenece la llamada que se está haciendo."""
    token = _current_campaign.set(campaign_id)
    try:
        yield
    finally:
        _current_campaign.reset(token)


def current_campaign() -> str | None:
    return _current_campaign.get()


def daily_limit() -> int:
    """El tope diario de requests por campaña. 0 = sin tope."""
    from core.agents.provider import get_ai_config

    try:
        return max(0, int(get_ai_config().get("daily_call_limit", 0)))
    except (TypeError, ValueError):
        return 0


def _today() -> str:
    return date.today().isoformat()


def _load() -> dict:
    try:
        data = json.loads(BUDGET_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return data if isinstance(data, dict) else {}


def _save(data: dict) -> None:
    try:
        BUDGET_PATH.parent.mkdir(parents=True, exist_ok=True)
        BUDGET_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")
    except OSError:
        pass


def usage_today(campaign_id: str | None = None) -> dict:
    """El consumo de hoy: `{calls, attempts}` de la campaña (o de todas)."""
    today = _load().get(_today(), {})
    if campaign_id:
        entry = today.get(campaign_id, {})
        return {
            "calls": int(entry.get("calls", 0)),
            "attempts": int(entry.get("attempts", 0)),
        }
    return {
        "calls": sum(int(v.get("calls", 0)) for v in today.values()),
        "attempts": sum(int(v.get("attempts", 0)) for v in today.values()),
        "campaigns": len(today),
    }


def ensure_within_budget(campaign_id: str, limit: int | None = None) -> None:
    """Si el tope ya se alcanzó, la llamada NO sale. Lanza `BudgetExceeded`."""
    cap = daily_limit() if limit is None else limit
    if cap <= 0:
        return
    used = usage_today(campaign_id)["attempts"]
    if used >= cap:
        raise BudgetExceeded(
            f"tope diario de IA alcanzado para esta campaña ({used}/{cap}). "
            "Subilo en el panel de IA o espera al manana."
        )


def record_usage(campaign_id: str, attempts: int = 1) -> None:
    """Suma el consumo de hoy de la campaña (los reintentosincluded)."""
    data = _load()
    today = _today()
    days = data.get(today, {})
    entry = days.get(campaign_id, {})
    entry["calls"] = int(entry.get("calls", 0)) + 1
    entry["attempts"] = int(entry.get("attempts", 0)) + max(1, attempts)
    days[campaign_id] = entry
    data[today] = days
    # Solo los ultimos dias: el archivo no crece sin limite.
    old = sorted(d for d in data if d < today)
    for stale in old[:-KEEP_DAYS]:
        data.pop(stale, None)
    _save(data)
