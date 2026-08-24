"""Base TTS provider — abstract interface for text-to-speech."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class TTSResult:
    audio_data: bytes
    content_type: str = "audio/mpeg"
    duration_ms: int | None = None


class TTSProvider(ABC):
    """Abstract base class for TTS providers."""

    name: str = "base"

    @abstractmethod
    async def synthesize(
        self,
        text: str,
        *,
        voice: str | None = None,
        speed: float = 1.0,
        language: str = "es",
    ) -> TTSResult:
        """Convert text to speech audio."""
        ...

    @abstractmethod
    async def list_voices(self, language: str = "es") -> list[dict[str, str]]:
        """List available voices for a language."""
        ...
