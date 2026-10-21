import json
import sys
import time
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException

sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.ai import build_provider  # noqa: E402
from infrastructure.ai.remote import estimate_usage  # noqa: E402
from core.agents.audit import audited_call  # noqa: E402
from core.agents.provider import config_path  # noqa: E402
from auth import require_dm, AuthSession  # noqa: E402
from vault import get_api_key  # noqa: E402

from schemas import (  # noqa: E402
    AISettingsResponse,
    AISettingsUpdate,
    AITestRequest,
    AITestResponse,
    TokenUsage,
)

router = APIRouter()

CONFIG_PATH = config_path()

DEFAULTS = AISettingsUpdate()


def _load_settings() -> AISettingsUpdate:
    if not CONFIG_PATH.exists():
        return DEFAULTS.model_copy()
    try:
        data = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return DEFAULTS.model_copy()
    try:
        return AISettingsUpdate(**data)
    except Exception:
        return DEFAULTS.model_copy()


def _save_settings(settings: AISettingsUpdate) -> None:
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    CONFIG_PATH.write_text(
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
    settings = _load_settings()
    api_key = get_api_key("remote") if settings.provider == "remote" else None
    provider = build_provider(
        settings.provider,
        local_base_url=settings.local_base_url,
        remote_base_url=settings.remote_base_url,
        api_key=api_key,
    )
    start = time.perf_counter()
    try:
        # Tambien auditada: es una llamada que cuesta tokens.
        response = await audited_call(
            agent_id="ai-test",
            provider=provider,
            prompt=data.prompt,
            model=settings.model,
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
        model=settings.model,
        response=response,
        latency_ms=latency_ms,
        usage=usage,
    )
