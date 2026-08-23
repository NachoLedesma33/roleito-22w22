import hashlib

from .base import AIProvider


class MockProvider(AIProvider):
    """Deterministic provider for dev and E2E tests. Never calls the network."""

    name = "mock"

    async def complete(
        self,
        prompt: str,
        *,
        system: str = "",
        model: str | None = None,
        max_tokens: int = 512,
        temperature: float = 0.7,
    ) -> str:
        digest = hashlib.sha1(f"{system}|{prompt}".encode()).hexdigest()[:8]
        return f"[mock:{model or 'mock-1'}:{digest}] {prompt[:120]}"
