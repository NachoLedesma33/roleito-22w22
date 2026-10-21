"""Shared helpers for agent routes — avoids provider instantiation duplication."""

import json
import os
from pathlib import Path

from infrastructure.ai import build_provider, AIProvider

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


def save_ai_config(config: dict) -> None:
    """Guarda la config de IA."""
    path = config_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(config, indent=2), encoding="utf-8")


def migrate_ai_config() -> bool:
    """Migra la config vieja a perfiles. Devuelve True si migro algo.

    La config anterior (`provider`/`remote_base_url`/`model`) era un unico
    provider global. Ahora es un perfil. Migrarla es lo que hace que lo que
    el DM ya habia configurado no se pierda.
    """
    from core.agents.profiles import legacy_profile

    config = get_ai_config()
    if config.get("profiles"):
        return False
    legacy = legacy_profile(config)
    if not legacy:
        return False

    profile_id = "default"
    migrated = dict(config)
    migrated["profiles"] = {profile_id: legacy}
    migrated["default_profile"] = profile_id
    for key in ("provider", "local_base_url", "remote_base_url", "model"):
        migrated.pop(key, None)
    save_ai_config(migrated)
    return True


def get_provider_for_agent(agent_id: str = "") -> AIProvider:
    """El provider del agente: su perfil (o el default) y la key del vault.

    El perfil decide el adapter, la URL y el modelo. La key sale del vault
    por el `key_ref` del perfil: el secreto nunca esta en la config.
    """
    from core.agents.profiles import build_provider_for_profile, profile_for_agent

    config = get_ai_config()
    _, profile = profile_for_agent(agent_id, config)
    return build_provider_for_profile(profile)


def get_model_for_agent(agent_id: str = "") -> str | None:
    """El modelo del perfil del agente (o el default de la config)."""
    from core.agents.profiles import profile_for_agent

    config = get_ai_config()
    _, profile = profile_for_agent(agent_id, config)
    return profile.get("model") or config.get("model")
