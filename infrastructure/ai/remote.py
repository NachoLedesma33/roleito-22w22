import os
import sys
from pathlib import Path

import httpx

from .base import AIProvider

DEFAULT_REMOTE_BASE_URL = "https://api.groq.com/openai/v1"
DEFAULT_REMOTE_MODEL = "llama-3.1-8b-instant"
REQUEST_TIMEOUT = 60.0


def _get_vault_key(provider: str = "remote") -> str:
    """Try vault first, then env var fallback."""
    try:
        sys.path.insert(0, str(Path(__file__).parent.parent.parent / "backend"))
        from vault import get_api_key
        key = get_api_key(provider)
        if key:
            return key
    except Exception:
        pass
    return os.environ.get("REMOTE_API_KEY", "")


class RemoteProvider(AIProvider):
    """OpenAI-compatible chat API (Groq, OpenRouter, OpenAI, LM Studio, etc.).

    API key priority: constructor arg > vault > REMOTE_API_KEY env var.
    """

    name = "remote"

    def __init__(self, base_url: str = DEFAULT_REMOTE_BASE_URL, api_key: str | None = None):
        self.base_url = (base_url or DEFAULT_REMOTE_BASE_URL).rstrip("/")
        self.api_key = api_key if api_key is not None else _get_vault_key()

    async def complete(
        self,
        prompt: str,
        *,
        system: str = "",
        model: str | None = None,
        max_tokens: int = 512,
        temperature: float = 0.7,
    ) -> str:
        if not self.api_key:
            raise RuntimeError(
                "API key no configurada (guardala en Vault o define REMOTE_API_KEY en .env)"
            )

        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": model or DEFAULT_REMOTE_MODEL,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        headers = {"Authorization": f"Bearer {self.api_key}"}

        try:
            async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
                res = await client.post(
                    f"{self.base_url}/chat/completions",
                    json=payload,
                    headers=headers,
                )
                res.raise_for_status()
                data = res.json()
        except httpx.HTTPError as e:
            raise RuntimeError(f"Error llamando a {self.base_url}: {e}") from e

        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as e:
            raise RuntimeError(f"Respuesta con formato inesperado: {data}") from e
