"""Adapter Ollama: el provider local (modelos en la propia maquina).

La API de Ollama es distinta de la de OpenAI: `POST {base}/api/chat`, con
`options` en vez de `max_tokens`, y las imagenes van aparte (`images`).
"""

import httpx

from .base import AIProvider, AIMessage

DEFAULT_LOCAL_BASE_URL = "http://localhost:11434"
REQUEST_TIMEOUT = 60.0


class OllamaProvider(AIProvider):
    """Ollama-compatible local server (http://localhost:11434)."""

    name = "ollama"
    supports_vision = True

    def __init__(self, base_url: str = DEFAULT_LOCAL_BASE_URL):
        self.base_url = (base_url or DEFAULT_LOCAL_BASE_URL).rstrip("/")

    async def complete(
        self,
        messages: list[AIMessage],
        *,
        model: str | None = None,
        max_tokens: int = 512,
        temperature: float = 0.7,
    ) -> str:
        payload_messages = []
        for m in messages:
            entry: dict = {"role": m.role, "content": m.text}
            if m.image_base64:
                entry["images"] = [m.image_base64]
            payload_messages.append(entry)

        payload = {
            "model": model or self.default_model or "llama3",
            "messages": payload_messages,
            "stream": False,
            "options": {"temperature": temperature, "num_predict": max_tokens},
        }

        try:
            async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
                res = await client.post(f"{self.base_url}/api/chat", json=payload)
                res.raise_for_status()
                data = res.json()
        except httpx.HTTPError as e:
            raise RuntimeError(
                f"No se pudo conectar con Ollama en {self.base_url}: {e}"
            ) from e

        try:
            return data["message"]["content"]
        except (KeyError, TypeError) as e:
            raise RuntimeError(f"Respuesta de Ollama con formato inesperado: {data}") from e
