import httpx

from .base import AIProvider

DEFAULT_LOCAL_BASE_URL = "http://localhost:11434"
REQUEST_TIMEOUT = 60.0


class LocalProvider(AIProvider):
    """Ollama-compatible local server (http://localhost:11434)."""

    name = "local"

    def __init__(self, base_url: str = DEFAULT_LOCAL_BASE_URL):
        self.base_url = (base_url or DEFAULT_LOCAL_BASE_URL).rstrip("/")

    async def complete(
        self,
        prompt: str,
        *,
        system: str = "",
        model: str | None = None,
        max_tokens: int = 512,
        temperature: float = 0.7,
    ) -> str:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": model or "llama3",
            "messages": messages,
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
