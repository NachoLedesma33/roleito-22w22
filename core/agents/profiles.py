"""Perfiles de proveedor: a quién le pregunto.

Un perfil es "a quién le pregunto": el adapter (familia de API), la URL, el
modelo y el **nombre** de la clave en el vault (`key_ref`). El secreto nunca
vive en la config ni vuelve en una respuesta.

- Un perfil por defecto + overrides por agente.
- `mock` sigue siendo un perfil: los tests no cambian.
- Agregar un proveedor OpenAI-compatible es configuración, no código.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

from infrastructure.ai import AIProvider, build_provider

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))

ADAPTERS: dict[str, dict[str, Any]] = {
    "openai_compatible": {
        "label": "OpenAI-compatible",
        "covers": "OpenAI, OpenRouter, Groq, Together, Fireworks, DeepSeek, opencode serve, LiteLLM, vLLM, LM Studio",
        "vision": True,
        "external": True,
    },
    "anthropic": {
        "label": "Anthropic (Claude)",
        "covers": "Claude — Messages API (no es OpenAI-compatible)",
        "vision": True,
        "external": True,
    },
    "ollama": {
        "label": "Ollama (local)",
        "covers": "Modelos en la propia máquina",
        "vision": True,
        "external": False,
    },
    "mock": {
        "label": "Mock (sin IA real)",
        "covers": "Tests y desarrollo: responde siempre lo mismo",
        "vision": False,
        "external": False,
    },
}

LEGACY_ADAPTERS = {"remote": "openai_compatible", "local": "ollama"}

# Los agentes que pueden tener su propio perfil.
AGENT_IDS = [
    "session-processor",
    "lore",
    "narrator",
    "recap",
    "world-state",
    "scene",
    "ingestion",
    "narrative-parser",
    "wall-detection",
]


def adapters_catalog() -> list[dict]:
    """El catalogo de adapters (lo que la UI muestra para elegir)."""
    return [
        {"id": key, **meta}
        for key, meta in ADAPTERS.items()
    ]


def normalize_adapter(adapter: str) -> str:
    """Los nombres viejos (`remote`, `local`) siguen funcionando."""
    return LEGACY_ADAPTERS.get(adapter, adapter)


def profiles_from_config(config: dict) -> dict[str, dict]:
    """Los perfiles de la config (sin inventar ninguno)."""
    raw = config.get("profiles")
    if not isinstance(raw, dict):
        return {}
    out: dict[str, dict] = {}
    for pid, profile in raw.items():
        if isinstance(profile, dict):
            out[str(pid)] = dict(profile)
    return out


def legacy_profile(config: dict) -> dict | None:
    """La config vieja (`provider`/`remote_base_url`/`model`) como un perfil.

    Es el puente con lo que habia antes de los perfiles (A5 lo migra de
    verdad; esto solo permite que la app siga andando mientras tanto).
    """
    provider = config.get("provider")
    if not provider:
        return None
    adapter = normalize_adapter(str(provider))
    base_url = config.get("remote_base_url") if adapter == "openai_compatible" else config.get("local_base_url")
    return {
        "adapter": adapter,
        "base_url": base_url or "",
        "model": config.get("model"),
        "label": f"Migrado de la config anterior ({provider})",
    }


def all_profiles(config: dict) -> dict[str, dict]:
    """Los perfiles de la config + (si no hay) el perfil heredado."""
    profiles = profiles_from_config(config)
    if profiles:
        return profiles
    legacy = legacy_profile(config)
    if legacy:
        return {"default": legacy}
    return {"mock": {"adapter": "mock", "label": "Mock (sin IA real)"}}


def default_profile_id(config: dict) -> str:
    profiles = all_profiles(config)
    configured = config.get("default_profile")
    if isinstance(configured, str) and configured in profiles:
        return configured
    return next(iter(profiles))


def profile_for_agent(agent_id: str, config: dict) -> tuple[str, dict]:
    """El perfil de un agente: el override si hay, si no el default."""
    profiles = all_profiles(config)
    overrides = config.get("agents")
    if isinstance(overrides, dict):
        chosen = overrides.get(agent_id)
        if isinstance(chosen, str) and chosen in profiles:
            return chosen, profiles[chosen]
    pid = default_profile_id(config)
    return pid, profiles[pid]


def build_provider_for_profile(profile: dict) -> AIProvider:
    """El provider de un perfil. La key sale del vault por su `key_ref`."""
    adapter = normalize_adapter(str(profile.get("adapter", "mock")))
    key_ref = profile.get("key_ref")
    api_key = None
    if key_ref:
        try:
            from vault import get_api_key
            api_key = get_api_key(str(key_ref))
        except Exception:
            api_key = None
    provider = build_provider(
        adapter,
        base_url=profile.get("base_url"),
        api_key=api_key,
        key_ref=str(key_ref) if key_ref else None,
    )
    # El modelo del perfil: el que se usa si la llamada no pasa uno.
    provider.default_model = profile.get("model")
    return provider


def public_profile(profile_id: str, profile: dict) -> dict:
    """El perfil como se ve desde la UI: **sin la key**, con si hay."""
    adapter = normalize_adapter(str(profile.get("adapter", "mock")))
    meta = ADAPTERS.get(adapter, {})
    key_ref = profile.get("key_ref")
    has_key = False
    if key_ref:
        try:
            from vault import get_api_key
            has_key = bool(get_api_key(str(key_ref)))
        except Exception:
            has_key = False
    return {
        "id": profile_id,
        "adapter": adapter,
        "base_url": profile.get("base_url") or "",
        "model": profile.get("model"),
        "label": profile.get("label") or profile_id,
        "key_ref": key_ref,
        "has_key": has_key,
        "external": bool(meta.get("external", True)),
        "supports_vision": bool(meta.get("vision", False)),
    }
