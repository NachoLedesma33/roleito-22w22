"""TTS provider factory — creates TTS providers by name."""

from .base import TTSProvider
from .mock import MockTTSProvider


def build_tts_provider(provider_name: str, **kwargs) -> TTSProvider:
    """Build a TTS provider by name."""
    if provider_name == "mock":
        return MockTTSProvider()
    return MockTTSProvider()
