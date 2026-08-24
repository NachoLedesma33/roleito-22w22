"""TTS provider factory — creates TTS providers by name."""

from .base import TTSProvider
from .edge import EdgeTTSProvider
from .mock import MockTTSProvider


def build_tts_provider(provider_name: str, **kwargs) -> TTSProvider:
    """Build a TTS provider by name."""
    if provider_name == "edge":
        return EdgeTTSProvider()
    return MockTTSProvider()
