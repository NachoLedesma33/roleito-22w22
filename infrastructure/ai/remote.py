import os

import httpx

from .base import AIProvider

DEFAULT_REMOTE_BASE_URL = "https://api.groq.com/openai/v1"
DEFAULT_REMOTE_MODEL = "llama-3.1-8b-instant"
REQUEST_TIMEOUT = 60.0


class RemoteProvider(AIProvider):
    """OpenAI-compatible chat API (Groq, OpenRouter, OpenAI, LM Studio, etc.).

    The API key is read from the REMOTE_API_KEY environment variable; it is
    never persisted to disk by this app.
    """

    name = "remote"

    def __init__(self, base_url: str = DEFAULT_REMOTE_BASE_URL, api_key: str | None = None):
        self.base_url = (base_url or DEFAULT_REMOTE_BASE_URL).rstrip("/")
        self.api_key = api_key if api_key is not None else os.environ.get("REMOTE_API_KEY", "")

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
                "REMOTE_API_KEY no configurada (definila en backend/.env)"
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
