"""Shared helpers for agent routes — avoids provider instantiation duplication."""

import json
from pathlib import Path

from infrastructure.ai import build_provider, AIProvider
from vault import get_api_key


def get_provider_for_agent() -> AIProvider:
    """Load AI config and build provider with vault key support."""
    config_path = Path("data/ai_config.json")
    if config_path.exists():
        try:
            config = json.loads(config_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            config = {"provider": "mock"}
    else:
        config = {"provider": "mock"}

    provider_name = config.get("provider", "mock")
    api_key = get_api_key("remote") if provider_name == "remote" else None

    return build_provider(
        provider_name,
        local_base_url=config.get("local_base_url"),
        remote_base_url=config.get("remote_base_url"),
        api_key=api_key,
    )
