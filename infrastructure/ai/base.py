from abc import ABC, abstractmethod


class AIProvider(ABC):
    """Base contract for LLM providers.

    Runtime stays deterministic: nothing here writes to the DB or touches
    world state. Callers decide what to do with the returned text.
    """

    name: str

    @abstractmethod
    async def complete(
        self,
        prompt: str,
        *,
        system: str = "",
        model: str | None = None,
        max_tokens: int = 512,
        temperature: float = 0.7,
    ) -> str:
        """Send a prompt and return the model's text response."""
        raise NotImplementedError
