import json
import sys
import time
from pathlib import Path

from fastapi import APIRouter, HTTPException

sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.ai import build_provider  # noqa: E402

from schemas import (  # noqa: E402
    AISettingsResponse,
    AISettingsUpdate,
    AITestRequest,
    AITestResponse,
)

router = APIRouter()

CONFIG_PATH = Path(__file__).parent.parent / "data" / "ai_config.json"

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
async def get_ai_config():
    return _load_settings()


@router.put("/ai/config", response_model=AISettingsResponse)
async def update_ai_config(data: AISettingsUpdate):
    _save_settings(data)
    return data


@router.post("/ai/test", response_model=AITestResponse)
async def test_ai(data: AITestRequest):
    settings = _load_settings()
    provider = build_provider(
        settings.provider,
        local_base_url=settings.local_base_url,
        remote_base_url=settings.remote_base_url,
    )
    start = time.perf_counter()
    try:
        response = await provider.complete(
            data.prompt,
            model=settings.model,
            max_tokens=settings.max_tokens,
            temperature=settings.temperature,
        )
    except RuntimeError as e:
        return AITestResponse(ok=False, provider=provider.name, error=str(e))
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Error inesperado del provider: {e}")
    latency_ms = int((time.perf_counter() - start) * 1000)
    return AITestResponse(
        ok=True,
        provider=provider.name,
        model=settings.model,
        response=response,
        latency_ms=latency_ms,
    )
