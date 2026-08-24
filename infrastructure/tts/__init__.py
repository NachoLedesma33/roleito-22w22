"""TTS infrastructure — text-to-speech providers."""

from .base import TTSProvider, TTSResult
from .factory import build_tts_provider

__all__ = ["TTSProvider", "TTSResult", "build_tts_provider"]
