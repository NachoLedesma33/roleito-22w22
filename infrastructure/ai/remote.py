"""Adapter OpenAI-compatible: OpenAI, OpenRouter, Groq, Together, Fireworks,
DeepSeek, opencode `serve`, LiteLLM, vLLM, LM Studio... cualquier proxy que
hable `POST {base}/chat/completions`.

Agregar un proveedor compatible es CONFIGURACION, no codigo: se crea un
perfil con esta base y ya.
"""

import asyncio
import logging
import os
import sys
from pathlib import Path

import httpx

from .base import AIProvider, AIMessage

logger = logging.getLogger("roleito.ai.remote")

DEFAULT_REMOTE_BASE_URL = "https://api.groq.com/openai/v1"
DEFAULT_REMOTE_MODEL = "llama-3.1-8b-instant"
REQUEST_TIMEOUT = 60.0
MAX_RETRIES = 3
RETRY_BASE_DELAY = 1.0

_RETRYABLE_STATUS = {429, 500, 502, 503, 504}


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


def _estimate_tokens(text: str) -> int:
    """Rough token estimate: ~4 chars per token for English, ~2 for CJK. Use 1.3 tokens/word."""
    return max(1, int(len(text.split()) * 1.3))


class OpenAICompatibleProvider(AIProvider):
    """OpenAI-compatible chat API.

    API key priority: constructor arg > vault (por `key_ref`) > REMOTE_API_KEY
    env var. Includes automatic retry with exponential backoff on 429/5xx.
    """

    name = "openai_compatible"
    supports_vision = True

    def __init__(
        self,
        base_url: str = DEFAULT_REMOTE_BASE_URL,
        api_key: str | None = None,
        key_ref: str | None = None,
    ):
        self.base_url = (base_url or DEFAULT_REMOTE_BASE_URL).rstrip("/")
        if api_key is not None:
            self.api_key = api_key
        elif key_ref:
            self.api_key = _get_vault_key(key_ref)
        else:
            self.api_key = _get_vault_key()
        self.last_usage: dict | None = None
        # Cuantos requests HTTP se hicieron de verdad (los reintentos cuentan):
        # el presupuesto de la campana los ve.
        self.last_attempts = 0

    def _payload_messages(self, messages: list[AIMessage]) -> list[dict]:
        """Los mensajes al formato de la API (con imagenes como `image_url`)."""
        out: list[dict] = []
        for m in messages:
            if m.role == "system":
                out.append({"role": "system", "content": m.text})
                continue
            if m.image_base64:
                mime = m.image_mime or "image/png"
                out.append({
                    "role": m.role,
                    "content": [
                        {"type": "text", "text": m.text},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime};base64,{m.image_base64}",
                                "detail": "high",
                            },
                        },
                    ],
                })
            else:
                out.append({"role": m.role, "content": m.text})
        return out

    async def complete(
        self,
        messages: list[AIMessage],
        *,
        model: str | None = None,
        max_tokens: int = 512,
        temperature: float = 0.7,
    ) -> str:
        if not self.api_key:
            raise RuntimeError(
                "API key no configurada (guardala en Vault o define REMOTE_API_KEY en .env)"
            )

        payload = {
            "model": model or self.default_model or DEFAULT_REMOTE_MODEL,
            "messages": self._payload_messages(messages),
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        headers = {"Authorization": f"Bearer {self.api_key}"}

        last_error: Exception | None = None
        for attempt in range(MAX_RETRIES):
            self.last_attempts = attempt + 1
            try:
                async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
                    res = await client.post(
                        f"{self.base_url}/chat/completions",
                        json=payload,
                        headers=headers,
                    )

                    if res.status_code in _RETRYABLE_STATUS:
                        retry_after = res.headers.get("retry-after")
                        if retry_after:
                            delay = float(retry_after)
                        else:
                            delay = RETRY_BASE_DELAY * (2 ** attempt)
                        if attempt < MAX_RETRIES - 1:
                            logger.warning(
                                "Retryable status %d from %s, attempt %d/%d, waiting %.1fs",
                                res.status_code, self.base_url, attempt + 1, MAX_RETRIES, delay,
                            )
                            await asyncio.sleep(delay)
                            continue

                    res.raise_for_status()
                    data = res.json()

            except httpx.HTTPStatusError as e:
                if e.response.status_code in _RETRYABLE_STATUS and attempt < MAX_RETRIES - 1:
                    delay = RETRY_BASE_DELAY * (2 ** attempt)
                    logger.warning(
                        "Retryable HTTP %d, attempt %d/%d, waiting %.1fs",
                        e.response.status_code, attempt + 1, MAX_RETRIES, delay,
                    )
                    await asyncio.sleep(delay)
                    last_error = e
                    continue
                raise RuntimeError(
                    f"Error HTTP {e.response.status_code} de {self.base_url}: {e}"
                ) from e
            except httpx.HTTPError as e:
                if attempt < MAX_RETRIES - 1:
                    delay = RETRY_BASE_DELAY * (2 ** attempt)
                    logger.warning(
                        "Network error, attempt %d/%d, waiting %.1fs: %s",
                        attempt + 1, MAX_RETRIES, delay, e,
                    )
                    await asyncio.sleep(delay)
                    last_error = e
                    continue
                raise RuntimeError(f"Error llamando a {self.base_url}: {e}") from e
            else:
                self.last_usage = get_usage_info(data)
                try:
                    return data["choices"][0]["message"]["content"]
                except (KeyError, IndexError, TypeError) as e:
                    raise RuntimeError(f"Respuesta con formato inesperado: {data}") from e

        raise RuntimeError(
            f"Fallo tras {MAX_RETRIES} reintentos: {last_error}"
        )


def get_usage_info(data: dict) -> dict | None:
    """Extract token usage from OpenAI-compatible response. Returns None if unavailable."""
    usage = data.get("usage")
    if not usage:
        return None
    return {
        "prompt_tokens": usage.get("prompt_tokens", 0),
        "completion_tokens": usage.get("completion_tokens", 0),
        "total_tokens": usage.get("total_tokens", 0),
    }


def estimate_usage(prompt: str, response_text: str) -> dict:
    """Fallback token estimation when provider doesn't return usage."""
    return {
        "prompt_tokens": _estimate_tokens(prompt),
        "completion_tokens": _estimate_tokens(response_text),
        "total_tokens": _estimate_tokens(prompt) + _estimate_tokens(response_text),
    }
