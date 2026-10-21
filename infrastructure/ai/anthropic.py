"""Adapter Anthropic (Claude).

La API de Claude NO es OpenAI-compatible: el `system` va aparte (no es un
mensaje), la key va en el header `x-api-key` (no `Authorization: Bearer`) y
las imagenes van como bloques `source: {type: base64}`.
"""

import asyncio
import logging

import httpx

from .base import AIProvider, AIMessage

logger = logging.getLogger("roleito.ai.anthropic")

DEFAULT_ANTHROPIC_BASE_URL = "https://api.anthropic.com"
ANTHROPIC_VERSION = "2023-06-01"
REQUEST_TIMEOUT = 60.0
MAX_RETRIES = 3
RETRY_BASE_DELAY = 1.0

_RETRYABLE_STATUS = {429, 500, 502, 503, 504}


class AnthropicProvider(AIProvider):
    """Claude via the Messages API."""

    name = "anthropic"
    supports_vision = True

    def __init__(
        self,
        base_url: str = DEFAULT_ANTHROPIC_BASE_URL,
        api_key: str | None = None,
        version: str = ANTHROPIC_VERSION,
    ):
        self.base_url = (base_url or DEFAULT_ANTHROPIC_BASE_URL).rstrip("/")
        self.api_key = api_key or ""
        self.version = version
        self.last_usage: dict | None = None
        self.last_attempts = 0

    def _payload(
        self, messages: list[AIMessage], model: str, max_tokens: int, temperature: float
    ) -> dict:
        system_parts = [m.text for m in messages if m.role == "system" and m.text]
        user_messages: list[dict] = []
        for m in messages:
            if m.role == "system":
                continue
            blocks: list[dict] = []
            if m.text:
                blocks.append({"type": "text", "text": m.text})
            if m.image_base64:
                blocks.append({
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": m.image_mime or "image/png",
                        "data": m.image_base64,
                    },
                })
            if not blocks:
                continue
            user_messages.append({"role": m.role, "content": blocks})

        payload: dict = {
            "model": model,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": user_messages,
        }
        if system_parts:
            # El system va aparte: es codigo, no un mensaje del chat.
            payload["system"] = "\n\n".join(system_parts)
        return payload

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
                "API key de Anthropic no configurada (guardala en el Vault con el nombre del perfil)"
            )
        if not model:
            model = self.default_model
        if not model:
            raise RuntimeError(
                "El perfil de Anthropic necesita un modelo (ej. claude-sonnet-4-5)"
            )

        payload = self._payload(messages, model, max_tokens, temperature)
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": self.version,
            "content-type": "application/json",
        }

        last_error: Exception | None = None
        for attempt in range(MAX_RETRIES):
            self.last_attempts = attempt + 1
            try:
                async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
                    res = await client.post(
                        f"{self.base_url}/v1/messages",
                        json=payload,
                        headers=headers,
                    )

                    if res.status_code in _RETRYABLE_STATUS and attempt < MAX_RETRIES - 1:
                        delay = RETRY_BASE_DELAY * (2 ** attempt)
                        logger.warning(
                            "Retryable status %d from Anthropic, attempt %d/%d, waiting %.1fs",
                            res.status_code, attempt + 1, MAX_RETRIES, delay,
                        )
                        await asyncio.sleep(delay)
                        last_error = RuntimeError(f"HTTP {res.status_code}")
                        continue

                    res.raise_for_status()
                    data = res.json()
            except httpx.HTTPStatusError as e:
                raise RuntimeError(
                    f"Error HTTP {e.response.status_code} de {self.base_url}: {e}"
                ) from e
            except httpx.HTTPError as e:
                if attempt < MAX_RETRIES - 1:
                    delay = RETRY_BASE_DELAY * (2 ** attempt)
                    await asyncio.sleep(delay)
                    last_error = e
                    continue
                raise RuntimeError(f"Error llamando a {self.base_url}: {e}") from e
            else:
                usage = data.get("usage") or {}
                self.last_usage = (
                    {
                        "prompt_tokens": usage.get("input_tokens", 0),
                        "completion_tokens": usage.get("output_tokens", 0),
                        "total_tokens": usage.get("input_tokens", 0)
                        + usage.get("output_tokens", 0),
                    }
                    if usage
                    else None
                )
                try:
                    blocks = data["content"]
                    text = "".join(
                        b.get("text", "") for b in blocks if b.get("type") == "text"
                    )
                    return text
                except (KeyError, IndexError, TypeError) as e:
                    raise RuntimeError(
                        f"Respuesta de Anthropic con formato inesperado: {data}"
                    ) from e

        raise RuntimeError(f"Fallo tras {MAX_RETRIES} reintentos: {last_error}")
