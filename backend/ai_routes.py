import json
import sys
import time
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_session
from models import Campaign

sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.ai.remote import estimate_usage  # noqa: E402
from core.agents.audit import audited_call  # noqa: E402
from core.agents.provider import (  # noqa: E402
    config_path,
    get_ai_config as load_ai_config,
    save_ai_config,
)
from auth import require_dm, AuthSession  # noqa: E402

from schemas import (  # noqa: E402
    AIAgentModels,
    AIBillingCheckout,
    AIBillingPlan,
    AIBillingUpdate,
    AIProfileCreate,
    AIProfileUpdate,
    AISettingsResponse,
    AISettingsUpdate,
    AITestRequest,
    AITestResponse,
    TokenUsage,
)

router = APIRouter()

DEFAULTS = AISettingsUpdate()


def _load_settings() -> AISettingsUpdate:
    path = config_path()
    if not path.exists():
        return DEFAULTS.model_copy()
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return DEFAULTS.model_copy()
    try:
        return AISettingsUpdate(**data)
    except Exception:
        return DEFAULTS.model_copy()


def _save_settings(settings: AISettingsUpdate) -> None:
    path = config_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(settings.model_dump(), indent=2), encoding="utf-8"
    )


@router.get("/ai/config", response_model=AISettingsResponse)
async def get_ai_config(_session: AuthSession = Depends(require_dm)):
    return _load_settings()


@router.put("/ai/config", response_model=AISettingsResponse)
async def update_ai_config(data: AISettingsUpdate, _session: AuthSession = Depends(require_dm)):
    current = _load_settings()
    if current.model and data.model is None:
        data.model = current.model
    _save_settings(data)
    return data


@router.get("/ai/billing")
async def get_billing(
    campaign_id: str | None = None,
    db: AsyncSession = Depends(get_session),
    _session: AuthSession = Depends(require_dm),
):
    """El estado de la monetizacion (M0).

    Apagada por defecto: `enabled: false` y ningun camino de cobro existe.
    """
    from services.billing import billing_config, plan_of, plan_info, quota_of

    config = load_ai_config()
    billing = billing_config(config)

    plan = None
    if campaign_id:
        campaign = (await db.execute(
            select(Campaign).where(Campaign.id == campaign_id)
        )).scalar_one_or_none()
        plan = plan_of(config, campaign.settings_json if campaign else None)

    usage = None
    if campaign_id:
        from core.agents.budget import usage_today

        usage = usage_today(campaign_id)

    return {
        "enabled": billing["enabled"],
        "currency": billing["currency"],
        "plans": billing["plans"],
        "plan": plan,
        "quota": quota_of(config, plan) if plan else None,
        "usage": usage,
        "plan_info": plan_info(config, plan) if plan else None,
    }


@router.put("/ai/billing")
async def update_billing(
    body: AIBillingUpdate,
    _session: AuthSession = Depends(require_dm),
):
    """Enciende o apaga la monetizacion y ajusta los precios.

    Con `enabled: false` (el default) no cambia nada: es el candado.
    """
    config = load_ai_config()
    billing = config.get("billing")
    if not isinstance(billing, dict):
        billing = {}
    billing.update(body.model_dump(exclude_unset=True))
    config["billing"] = billing
    save_ai_config(config)
    return {"status": "updated", "enabled": bool(billing.get("enabled"))}


@router.put("/ai/billing/plan")
async def update_billing_plan(
    body: AIBillingPlan,
    db: AsyncSession = Depends(get_session),
    _session: AuthSession = Depends(require_dm),
):
    """El plan de una campana."""
    from services.billing import billing_config

    config = load_ai_config()
    plans = billing_config(config)["plans"]
    if body.plan not in plans:
        raise HTTPException(status_code=404, detail="Plan no encontrado")

    campaign = (await db.execute(
        select(Campaign).where(Campaign.id == body.campaign_id)
    )).scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    settings = dict(campaign.settings_json or {})
    settings["billing_plan"] = body.plan
    campaign.settings_json = settings
    await db.commit()
    return {"status": "updated", "campaign_id": body.campaign_id, "plan": body.plan}


@router.post("/ai/billing/checkout")
async def billing_checkout(
    body: AIBillingCheckout,
    _session: AuthSession = Depends(require_dm),
):
    """El pago de verdad: NO hay proveedor de pagos conectado.

    La mecanica esta (planes, precios, a quien se le cobra) pero el cobro
    mismo es el pedazo que falta. Decirlo claro es mejor que fingir.
    """
    from services.billing import billing_config, is_enabled, plan_info

    config = load_ai_config()
    if not is_enabled(config):
        raise HTTPException(
            status_code=501,
            detail="La monetizacion esta apagada (billing.enabled = false)",
        )
    info = plan_info(config, body.plan)
    raise HTTPException(
        status_code=501,
        detail=(
            "No hay proveedor de pagos conectado. "
            f"El plan {info.get('label', body.plan)} cuesta "
            f"{info.get('price', 0)} {billing_config(config)['currency']}."
        ),
    )


@router.get("/ai/adapters")
async def get_adapters(_session: AuthSession = Depends(require_dm)):
    """El catalogo de adapters: que familia de API cubre cada uno."""
    from core.agents.profiles import adapters_catalog

    return {"adapters": adapters_catalog()}


@router.get("/ai/profiles")
async def list_profiles(_session: AuthSession = Depends(require_dm)):
    """Los perfiles de proveedor. **Ninguna key**: solo el `key_ref` y si hay."""
    from core.agents.profiles import all_profiles, public_profile

    config = load_ai_config()
    profiles = all_profiles(config)
    return {
        "profiles": [public_profile(pid, p) for pid, p in profiles.items()],
        "default_profile": config.get("default_profile") or next(iter(profiles)),
    }


@router.post("/ai/profiles", status_code=201)
async def create_profile(
    body: AIProfileCreate,
    _session: AuthSession = Depends(require_dm),
):
    """Un perfil nuevo: a quien le pregunto."""
    from core.agents.profiles import normalize_adapter

    adapter = normalize_adapter(body.adapter)
    if adapter not in {"openai_compatible", "anthropic", "ollama", "mock"}:
        raise HTTPException(status_code=422, detail=f"Adapter desconocido: {body.adapter}")

    config = load_ai_config()
    profiles = config.setdefault("profiles", {})
    if body.id in profiles:
        raise HTTPException(status_code=409, detail="Ya existe un perfil con ese nombre")
    profiles[body.id] = {
        "adapter": adapter,
        "base_url": body.base_url,
        "model": body.model,
        "label": body.label or body.id,
        "key_ref": body.key_ref or body.id,
    }
    if not config.get("default_profile"):
        config["default_profile"] = body.id
    save_ai_config(config)
    return {"status": "created", "id": body.id}


@router.put("/ai/profiles/{profile_id}")
async def update_profile(
    profile_id: str,
    body: AIProfileUpdate,
    _session: AuthSession = Depends(require_dm),
):
    """Edita un perfil. La key no pasa por aca: vive en el vault."""
    from core.agents.profiles import normalize_adapter

    config = load_ai_config()
    profiles = config.setdefault("profiles", {})
    if profile_id not in profiles:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")

    updates = body.model_dump(exclude_unset=True)
    if "adapter" in updates and updates["adapter"]:
        updates["adapter"] = normalize_adapter(updates["adapter"])
        if updates["adapter"] not in {"openai_compatible", "anthropic", "ollama", "mock"}:
            raise HTTPException(status_code=422, detail=f"Adapter desconocido: {updates['adapter']}")
    profiles[profile_id].update(updates)
    save_ai_config(config)
    return {"status": "updated", "id": profile_id}


@router.delete("/ai/profiles/{profile_id}")
async def delete_profile(profile_id: str, _session: AuthSession = Depends(require_dm)):
    """Borra un perfil (la key del vault se borra aparte)."""
    config = load_ai_config()
    profiles = config.get("profiles", {})
    if profile_id not in profiles:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    profiles.pop(profile_id)
    if config.get("default_profile") == profile_id:
        config["default_profile"] = next(iter(profiles), None)
    for agent_id, chosen in list((config.get("agents") or {}).items()):
        if chosen == profile_id:
            config["agents"].pop(agent_id, None)
    save_ai_config(config)
    return {"status": "deleted", "id": profile_id}


@router.get("/ai/models")
async def get_models(
    profile: str | None = None,
    _session: AuthSession = Depends(require_dm),
):
    """Los modelos que expone el provider.

    `source: discovered` si el provider los expone; `manual` si no (el DM
    escribe el id a mano). Nunca se rompe el flujo.
    """
    from core.agents.discovery import discover_models
    from core.agents.profiles import all_profiles, profile_for_agent

    config = load_ai_config()
    profiles = all_profiles(config)
    if profile:
        chosen = profiles.get(profile)
        if not chosen:
            raise HTTPException(status_code=404, detail="Perfil no encontrado")
    else:
        _, chosen = profile_for_agent("", config)

    models = await discover_models(chosen)
    return {
        "models": models,
        "source": "discovered" if models else "manual",
        "profile": profile,
    }


@router.get("/ai/agent-models")
async def get_agent_models(_session: AuthSession = Depends(require_dm)):
    """Que perfil usa cada agente."""
    from core.agents.profiles import AGENT_IDS, all_profiles

    config = load_ai_config()
    profiles = all_profiles(config)
    agents = config.get("agents") or {}
    return {
        "default_profile": config.get("default_profile") or next(iter(profiles)),
        "agents": {agent_id: agents.get(agent_id) for agent_id in AGENT_IDS},
    }


@router.put("/ai/agent-models")
async def set_agent_models(
    body: AIAgentModels,
    _session: AuthSession = Depends(require_dm),
):
    """Elige el perfil de cada agente (vacio = el default)."""
    from core.agents.profiles import AGENT_IDS, all_profiles

    config = load_ai_config()
    profiles = all_profiles(config)
    for agent_id, profile_id in body.agents.items():
        if agent_id not in AGENT_IDS:
            raise HTTPException(status_code=422, detail=f"Agente desconocido: {agent_id}")
        if profile_id and profile_id not in profiles:
            raise HTTPException(status_code=404, detail=f"Perfil no encontrado: {profile_id}")
    config["agents"] = {
        agent_id: profile_id
        for agent_id, profile_id in body.agents.items()
        if profile_id
    }
    if body.default_profile:
        if body.default_profile not in profiles:
            raise HTTPException(status_code=404, detail="Perfil no encontrado")
        config["default_profile"] = body.default_profile
    save_ai_config(config)
    return {"status": "updated"}


@router.get("/ai/usage")
async def get_ai_usage(
    campaign_id: str | None = None,
    _session: AuthSession = Depends(require_dm),
):
    """El consumo de IA de hoy y el tope vigente.

    Es el consumo del DM (su API key), no un cobro al jugador: el tope lo
    pone el DM y 0 significa "sin tope".
    """
    from core.agents.budget import daily_limit, usage_today

    return {
        "usage": usage_today(campaign_id),
        "limit": daily_limit(),
        "campaign_id": campaign_id,
    }


@router.get("/ai/audit")
async def get_ai_audit(limit: int = 50, _session: AuthSession = Depends(require_dm)):
    """Las ultimas llamadas a la IA.

    El prompt NO se guarda: solo su hash. El log es local
    (`data/ai_audit.log`) y por eso no se sirve desde el repositorio.
    """
    from core.agents.audit import read_audit

    return {"entries": read_audit(limit=max(1, min(limit, 200)))}


@router.post("/ai/test", response_model=AITestResponse)
async def test_ai(data: AITestRequest, _session: AuthSession = Depends(require_dm)):
    """Prueba la conexion de un perfil (o del default).

    La key sale del vault por el `key_ref` del perfil: el backend la usa y
    no la devuelve.
    """
    from core.agents.profiles import all_profiles, build_provider_for_profile, profile_for_agent

    config = load_ai_config()
    profiles = all_profiles(config)
    if data.profile:
        profile = profiles.get(data.profile)
        if not profile:
            raise HTTPException(status_code=404, detail="Perfil no encontrado")
    else:
        _, profile = profile_for_agent("", config)

    provider = build_provider_for_profile(profile)
    model = profile.get("model") or config.get("model")
    settings = _load_settings()
    start = time.perf_counter()
    try:
        # Tambien auditada: es una llamada que cuesta tokens.
        response = await audited_call(
            agent_id="ai-test",
            provider=provider,
            prompt=data.prompt,
            model=model,
            max_tokens=settings.max_tokens,
            temperature=settings.temperature,
        )
    except RuntimeError as e:
        return AITestResponse(ok=False, provider=provider.name, error=str(e))
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Error inesperado del provider: {e}")
    latency_ms = int((time.perf_counter() - start) * 1000)

    usage_raw = getattr(provider, "last_usage", None)
    if usage_raw:
        usage = TokenUsage(**usage_raw)
    else:
        est = estimate_usage(data.prompt, response)
        usage = TokenUsage(**est)

    return AITestResponse(
        ok=True,
        provider=provider.name,
        model=model,
        response=response,
        latency_ms=latency_ms,
        usage=usage,
    )
