"""Mock TTS provider — generates silent audio for testing."""

from __future__ import annotations

import struct

from .base import TTSProvider, TTSResult


def _generate_silence_wav(duration_ms: int = 1000) -> bytes:
    """Generate a minimal silent WAV file."""
    sample_rate = 22050
    num_samples = int(sample_rate * duration_ms / 1000)
    data_size = num_samples * 2  # 16-bit mono

    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",
        36 + data_size,
        b"WAVE",
        b"fmt ",
        16,
        1,  # PCM
        1,  # mono
        sample_rate,
        sample_rate * 2,
        2,
        16,
        b"data",
        data_size,
    )

    silence = b"\x00\x00" * num_samples
    return header + silence


class MockTTSProvider(TTSProvider):
    """Mock provider for dev and E2E tests. Returns silent WAV."""

    name = "mock"

    async def synthesize(
        self,
        text: str,
        *,
        voice: str | None = None,
        speed: float = 1.0,
        language: str = "es",
    ) -> TTSResult:
        duration = min(len(text) * 50, 10000)
        audio = _generate_silence_wav(duration)
        return TTSResult(
            audio_data=audio,
            content_type="audio/wav",
            duration_ms=duration,
        )

    async def list_voices(self, language: str = "es") -> list[dict[str, str]]:
        return [
            {"id": "mock-voice-1", "name": "Mock Voice 1", "language": language},
            {"id": "mock-voice-2", "name": "Mock Voice 2", "language": language},
        ]
