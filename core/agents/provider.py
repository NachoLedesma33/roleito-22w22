"""Shared helpers for agent routes — avoids provider instantiation duplication."""

import json
import os
from pathlib import Path

from infrastructure.ai import build_provider, AIProvider
from vault import get_api_key

DEFAULT_CONFIG: dict = {"provider": "mock"}


def config_path() -> Path:
    """Donde vive la config de IA.

    **Absoluta a proposito**: el backend corre desde `backend/` (el CWD), y un
    path relativo al CWD no encontraba el archivo: los agentes se caian al
    provider mock aunque el DM hubiera configurado Groq/OpenRouter/OpenAI en
    el panel. `ROLEITO_AI_CONFIG` lo sobreescribe (tests).
    """
    env = os.environ.get("ROLEITO_AI_CONFIG")
    if env:
        return Path(env)
    return Path(__file__).resolve().parents[2] / "data" / "ai_config.json"


def get_ai_config() -> dict:
    """La config de IA, o la de por defecto si no se puede leer."""
    path = config_path()
    if not path.exists():
        return dict(DEFAULT_CONFIG)
    try:
        config = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return dict(DEFAULT_CONFIG)
    return config if isinstance(config, dict) else dict(DEFAULT_CONFIG)


def get_provider_for_agent() -> AIProvider:
    """Load AI config and build provider with vault key support."""
    config = get_ai_config()

    provider_name = config.get("provider", "mock")
    api_key = get_api_key("remote") if provider_name == "remote" else None

    return build_provider(
        provider_name,
        local_base_url=config.get("local_base_url"),
        remote_base_url=config.get("remote_base_url"),
        api_key=api_key,
    )
