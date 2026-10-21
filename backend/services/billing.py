"""La monetizacion, con candado (M0 del plan).

**NO esta activa.** La flag `billing.enabled` vive en la config de IA y
arranca en `false`: mientras este apagado, ninguna ruta de cobro existe y
nada cambia para el DM.

La idea es que, si algun dia hay financiamiento, se active la flag y el
backend ya sepa que planes hay, cuanto vale cada uno y a quien se le cobra,
sin tener que rehacerlo. El "checkout" (el pago de verdad) es el unico
pedazo que falta: no hay proveedor de pagos conectado, y el endpoint lo
dice claro (501) en vez de fingir que cobro.

OJO: esto NO es el tope de uso por campana (C8, en `core/agents/budget.py`).
Ese protege la API key del DM y no tiene nada que ver con cobrar: el DM lo
configura para si mismo, gratis, y va apagado por default tambien.
"""

from __future__ import annotations

from typing import Any

# Planes por defecto: los que el DM puede asignar a una campana.
DEFAULT_PLANS: dict[str, dict[str, Any]] = {
    "free": {
        "label": "Free",
        "calls_per_day": 20,
        "price": 0.0,
    },
    "pro": {
        "label": "Pro",
        "calls_per_day": 500,
        "price": 9.99,
    },
}

DEFAULT_BILLING: dict[str, Any] = {
    "enabled": False,
    "currency": "USD",
    "plans": DEFAULT_PLANS,
}


class QuotaExceeded(RuntimeError):
    """La campana se paso de las llamadas que da su plan."""


def billing_config(config: dict) -> dict:
    """La seccion de billing de la config (con los defaults)."""
    raw = config.get("billing")
    if not isinstance(raw, dict):
        raw = {}
    plans = raw.get("plans")
    if not isinstance(plans, dict) or not plans:
        plans = DEFAULT_PLANS
    return {
        "enabled": bool(raw.get("enabled", False)),
        "currency": raw.get("currency") or "USD",
        "plans": plans,
    }


def is_enabled(config: dict) -> bool:
    return billing_config(config)["enabled"]


def plan_of(config: dict, campaign_settings: dict | None) -> str:
    """El plan de la campana (`campaign.settings_json['billing_plan']`)."""
    if not isinstance(campaign_settings, dict):
        return "free"
    plan = campaign_settings.get("billing_plan")
    if isinstance(plan, str) and plan:
        return plan
    return "free"


def plan_info(config: dict, plan: str) -> dict:
    plans = billing_config(config)["plans"]
    return plans.get(plan) or plans.get("free") or DEFAULT_PLANS["free"]


def quota_of(config: dict, plan: str) -> int:
    """Las llamadas por dia que da el plan. 0 = sin limite."""
    try:
        return max(0, int(plan_info(config, plan).get("calls_per_day", 0)))
    except (TypeError, ValueError):
        return 0


def check_quota(config: dict, campaign_id: str, campaign_settings: dict | None) -> None:
    """Si la campana se paso de su plan, la llamada no sale.

    Solo cuando la monetizacion esta ENCENDIDA: apagada, no mira nada.
    """
    if not is_enabled(config):
        return
    plan = plan_of(config, campaign_settings)
    quota = quota_of(config, plan)
    if quota <= 0:
        return
    from core.agents.budget import usage_today

    used = usage_today(campaign_id)["attempts"]
    if used >= quota:
        raise QuotaExceeded(
            f"La campana se paso de las {quota} llamadas por dia del plan {plan}."
        )
