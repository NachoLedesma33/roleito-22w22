"""TTS provider factory — creates TTS providers by name."""

from .base import TTSProvider
from .mock import MockTTSProvider


def build_tts_provider(provider_name: str, **kwargs) -> TTSProvider:
    """Build a TTS provider by name."""
    if provider_name == "edge":
        try:
            from .edge import EdgeTTSProvider
            return EdgeTTSProvider()
        except ImportError:
            import logging
            logging.getLogger("roleito").warning("edge-tts not installed, falling back to mock")
            return MockTTSProvider()
    return MockTTSProvider()
