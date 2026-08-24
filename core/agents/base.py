"""Base agent — abstract base class for all AI agents."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

from infrastructure.ai import AIProvider


@dataclass
class AgentResult:
    status: str
    data: Any = None
    error: str | None = None
    agent_id: str = ""
    version: str = "1.0"


class BaseAgent(ABC):
    """Base class for all AI agents in Roleito."""

    agent_id: str = "base"
    version: str = "1.0"
    description: str = ""

    def __init__(self, provider: AIProvider):
        self.provider = provider

    @abstractmethod
    async def run(self, **kwargs: Any) -> AgentResult:
        """Execute the agent's task."""
        ...

    def _ok(self, data: Any) -> AgentResult:
        return AgentResult(
            status="success",
            data=data,
            agent_id=self.agent_id,
            version=self.version,
        )

    def _error(self, msg: str) -> AgentResult:
        return AgentResult(
            status="error",
            error=msg,
            agent_id=self.agent_id,
            version=self.version,
        )
