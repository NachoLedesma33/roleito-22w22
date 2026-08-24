"""Edge TTS provider — free Microsoft neural voices."""

from __future__ import annotations

import io

import edge_tts

from .base import TTSProvider, TTSResult

ARGENTINE_VOICES = {
    "es-AR-TomasNeural": {
        "id": "es-AR-TomasNeural",
        "name": "Tomas (Masculino)",
        "gender": "Male",
        "language": "es-AR",
    },
    "es-AR-ElenaNeural": {
        "id": "es-AR-ElenaNeural",
        "name": "Elena (Femenino)",
        "gender": "Female",
        "language": "es-AR",
    },
}


class EdgeTTSProvider(TTSProvider):
    """Provider using Microsoft Edge's free neural TTS service."""

    name = "edge"

    async def synthesize(
        self,
        text: str,
        *,
        voice: str | None = None,
        speed: float = 1.0,
        language: str = "es",
    ) -> TTSResult:
        voice_id = voice or "es-AR-TomasNeural"

        rate = f"+{int((speed - 1) * 100)}%" if speed >= 1 else f"{int((speed - 1) * 100)}%"

        communicate = edge_tts.Communicate(text, voice_id, rate=rate)

        audio_chunks = []
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_chunks.append(chunk["data"])

        audio_data = b"".join(audio_chunks)

        return TTSResult(
            audio_data=audio_data,
            content_type="audio/mpeg",
            duration_ms=None,
        )

    async def list_voices(self, language: str = "es") -> list[dict[str, str]]:
        return list(ARGENTINE_VOICES.values())
