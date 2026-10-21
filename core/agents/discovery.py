"""Descubrimiento de modelos: que modelos expone el provider.

- OpenAI-compatible y Anthropic: `GET {base}/models` (o `{base}/v1/models`).
- Ollama: `GET {base}/api/tags`.

La lista descubierta **no se persiste**: se pide al provider cuando hace
falta (un id de modelo puede desaparecer: OpenRouter rota modelos). El perfil
guarda el modelo ELEGIDO, no "el primero de la lista".

Cache en memoria 10 minutos por `base_url`: los listados no cambian cada
minuto y pegarle al provider en cada render es una llamada de mas.
"""

from __future__ import annotations

import time
from typing import Any

import httpx

REQUEST_TIMEOUT = 20.0
CACHE_TTL = 600  # 10 minutos

_cache: dict[str, tuple[float, list[dict]]] = {}


def _cache_get(base_url: str) -> list[dict] | None:
    hit = _cache.get(base_url)
    if not hit:
        return None
    saved_at, models = hit
    if time.time() - saved_at > CACHE_TTL:
        _cache.pop(base_url, None)
        return None
    return models


def _cache_put(base_url: str, models: list[dict]) -> None:
    _cache[base_url] = (time.time(), models)


def clear_cache() -> None:
    """Olvida los listados (lo usa el test)."""
    _cache.clear()


def _normalize_openai(data: Any) -> list[dict]:
    items = data.get("data") if isinstance(data, dict) else None
    out = []
    for item in items or []:
        if not isinstance(item, dict):
            continue
        model_id = item.get("id")
        if not model_id:
            continue
        out.append({
            "id": model_id,
            "display_name": item.get("name") or item.get("display_name") or model_id,
            "context_length": item.get("context_length") or item.get("context_window"),
        })
    return out


def _normalize_ollama(data: Any) -> list[dict]:
    items = data.get("models") if isinstance(data, dict) else None
    out = []
    for item in items or []:
        if not isinstance(item, dict):
            continue
        model_id = item.get("name") or item.get("model")
        if not model_id:
            continue
        out.append({
            "id": model_id,
            "display_name": item.get("display_name") or model_id,
            "context_length": None,
        })
    return out


async def discover_models(profile: dict) -> list[dict]:
    """Los modelos que expone el provider. `[]` si no los expone o falla.

    Nunca tira: el que llama decide que mostrar cuando no hay lista.
    """
    from core.agents.profiles import normalize_adapter

    adapter = normalize_adapter(str(profile.get("adapter", "mock")))
    base_url = (profile.get("base_url") or "").rstrip("/")
    if adapter == "mock" or not base_url:
        return []

    cached = _cache_get(base_url)
    if cached is not None:
        return cached

    key_ref = profile.get("key_ref")
    headers = {}
    if key_ref:
        try:
            from vault import get_api_key
            key = get_api_key(str(key_ref))
        except Exception:
            key = None
        if key:
            if adapter == "anthropic":
                headers["x-api-key"] = key
                headers["anthropic-version"] = "2023-06-01"
            else:
                headers["Authorization"] = f"Bearer {key}"

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            if adapter == "ollama":
                res = await client.get(f"{base_url}/api/tags", headers=headers)
                models = _normalize_ollama(res.json()) if res.status_code == 200 else []
            elif adapter == "anthropic":
                res = await client.get(f"{base_url}/v1/models", headers=headers)
                models = _normalize_openai(res.json()) if res.status_code == 200 else []
            else:
                res = await client.get(f"{base_url}/models", headers=headers)
                models = _normalize_openai(res.json()) if res.status_code == 200 else []
    except (httpx.HTTPError, ValueError):
        return []

    if models:
        _cache_put(base_url, models)
    return models
