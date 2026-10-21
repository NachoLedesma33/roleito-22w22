"""The factory: an adapter name -> a provider.

Un adapter por FAMILIA de API, no uno por proveedor: agregar un proveedor
OpenAI-compatible es configuracion (un perfil), no codigo.
"""

from .anthropic import AnthropicProvider
from .base import AIProvider, AIMessage
from .local import OllamaProvider
from .mock import MockProvider
from .remote import OpenAICompatibleProvider

# Los nombres viejos siguen funcionando (config de antes, tests).
LEGACY_ADAPTERS = {"remote": "openai_compatible", "local": "ollama"}


def build_provider(
    adapter: str,
    *,
    base_url: str | None = None,
    api_key: str | None = None,
    key_ref: str | None = None,
) -> AIProvider:
    """El provider de un adapter. `key_ref` es el nombre de la clave en el
    vault (el secreto nunca viaja en la config)."""
    name = LEGACY_ADAPTERS.get(adapter, adapter)
    if name == "mock":
        return MockProvider()
    if name == "anthropic":
        return AnthropicProvider(base_url=base_url or "", api_key=api_key)
    if name == "ollama":
        return OllamaProvider(base_url=base_url or "")
    if name == "openai_compatible":
        return OpenAICompatibleProvider(
            base_url=base_url or "", api_key=api_key, key_ref=key_ref
        )
    raise ValueError(f"Adapter desconocido: {adapter}")


__all__ = [
    "AIProvider",
    "AIMessage",
    "AnthropicProvider",
    "MockProvider",
    "OllamaProvider",
    "OpenAICompatibleProvider",
    "build_provider",
]
