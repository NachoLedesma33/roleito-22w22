"""TTS routes — text-to-speech API endpoints."""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from infrastructure.tts import build_tts_provider
from auth import require_dm, AuthSession

router = APIRouter(tags=["tts"])

CONFIG_PATH = Path("data/tts_config.json")

DEFAULTS = {
    "provider": "edge",
    "voice": "es-AR-TomasNeural",
    "speed": 1.0,
    "language": "es-AR",
}


def _load_config() -> dict:
    if not CONFIG_PATH.exists():
        return DEFAULTS.copy()
    try:
        return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return DEFAULTS.copy()


def _save_config(config: dict) -> None:
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    CONFIG_PATH.write_text(
        json.dumps(config, indent=2), encoding="utf-8"
    )


class TTSGenerateRequest(BaseModel):
    text: str
    voice: str | None = None
    speed: float | None = None
    language: str | None = None


class TTSConfigResponse(BaseModel):
    provider: str
    voice: str
    speed: float
    language: str


class TTSConfigUpdate(BaseModel):
    provider: str | None = None
    voice: str | None = None
    speed: float | None = None
    language: str | None = None


class TTSVoiceResponse(BaseModel):
    id: str
    name: str
    language: str


@router.get("/tts/config", response_model=TTSConfigResponse)
async def get_tts_config(_session: AuthSession = Depends(require_dm)):
    return _load_config()


@router.put("/tts/config", response_model=TTSConfigResponse)
async def update_tts_config(data: TTSConfigUpdate, _session: AuthSession = Depends(require_dm)):
    config = _load_config()
    if data.provider is not None:
        config["provider"] = data.provider
    if data.voice is not None:
        config["voice"] = data.voice
    if data.speed is not None:
        config["speed"] = data.speed
    if data.language is not None:
        config["language"] = data.language
    _save_config(config)
    return config


@router.get("/tts/voices", response_model=list[TTSVoiceResponse])
async def list_tts_voices(_session: AuthSession = Depends(require_dm)):
    config = _load_config()
    provider = build_tts_provider(config["provider"])
    voices = await provider.list_voices(config.get("language", "es"))
    return voices


@router.post("/tts/generate")
async def generate_tts(body: TTSGenerateRequest):
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="Text is required")

    config = _load_config()
    provider = build_tts_provider(config["provider"])

    result = await provider.synthesize(
        body.text,
        voice=body.voice or config.get("voice"),
        speed=body.speed or config.get("speed", 1.0),
        language=body.language or config.get("language", "es"),
    )

    return Response(
        content=result.audio_data,
        media_type=result.content_type,
        headers={
            "X-TTS-Duration-Ms": str(result.duration_ms or 0),
            "X-TTS-Provider": provider.name,
        },
    )
