"""Tests for AI-assisted wall detection.

Uses synthetic images and mocked VLM responses to validate parsing
and integration without calling real APIs.
"""

import json
import os
import tempfile
from unittest.mock import patch, AsyncMock

import cv2
import numpy as np
import pytest

from wall_detection.ai_detector import (
    _parse_ai_response,
    _build_detected_map,
    _parse_thickness,
    detect_walls_ai,
)
from wall_detection.types import DetectedMap


MOCK_VLM_RESPONSE = json.dumps({
    "walls": [
        {
            "points": [{"x": 0.1, "y": 0.1}, {"x": 0.1, "y": 0.9}],
            "thickness": "medium",
            "confidence": 0.9,
        },
        {
            "points": [{"x": 0.1, "y": 0.9}, {"x": 0.9, "y": 0.9}],
            "thickness": "thick",
            "confidence": 0.85,
        },
    ],
    "doors": [
        {
            "position": {"x": 0.5, "y": 0.9},
            "rotation": 0,
            "width": 0.05,
            "confidence": 0.7,
        }
    ],
    "rooms": [
        {
            "polygon": [
                {"x": 0.1, "y": 0.1},
                {"x": 0.9, "y": 0.1},
                {"x": 0.9, "y": 0.9},
                {"x": 0.1, "y": 0.9},
            ],
            "label": "Main Hall",
        }
    ],
})


def _save(img: np.ndarray) -> str:
    fd, path = tempfile.mkstemp(suffix=".png")
    os.close(fd)
    cv2.imwrite(path, img)
    return path


def test_parse_json_direct():
    data = _parse_ai_response(MOCK_VLM_RESPONSE)
    assert len(data["walls"]) == 2
    assert len(data["doors"]) == 1


def test_parse_json_with_markdown_fences():
    fenced = f"```json\n{MOCK_VLM_RESPONSE}\n```"
    data = _parse_ai_response(fenced)
    assert len(data["walls"]) == 2


def test_parse_json_with_explanation():
    wrapped = f"Here is the analysis:\n{MOCK_VLM_RESPONSE}\nDone."
    data = _parse_ai_response(wrapped)
    assert len(data["walls"]) == 2


def test_parse_json_invalid():
    with pytest.raises(ValueError):
        _parse_ai_response("not json at all {{{")


def test_build_detected_map():
    data = json.loads(MOCK_VLM_RESPONSE)
    result = _build_detected_map(data, 1000, 800)

    assert isinstance(result, DetectedMap)
    assert result.width == 1000
    assert result.height == 800
    assert result.wall_count == 2
    assert result.door_count == 1
    assert result.room_count == 1
    assert result.mode == "ai"

    wall0 = result.walls[0]
    assert wall0.points[0].x == pytest.approx(100.0)
    assert wall0.points[0].y == pytest.approx(80.0)
    assert wall0.points[1].x == pytest.approx(100.0)
    assert wall0.points[1].y == pytest.approx(720.0)


def test_build_skips_short_walls():
    data = {
        "walls": [
            {"points": [{"x": 0.1, "y": 0.1}], "thickness": "thin", "confidence": 0.5},
            {"points": [{"x": 0.1, "y": 0.1}, {"x": 0.2, "y": 0.2}], "thickness": "medium", "confidence": 0.8},
        ],
        "doors": [],
        "rooms": [],
    }
    result = _build_detected_map(data, 500, 500)
    assert result.wall_count == 1


def test_build_skips_short_rooms():
    data = {
        "walls": [],
        "doors": [],
        "rooms": [
            {"polygon": [{"x": 0, "y": 0}, {"x": 1, "y": 0}], "label": "tiny"},
            {"polygon": [{"x": 0, "y": 0}, {"x": 1, "y": 0}, {"x": 1, "y": 1}], "label": "ok"},
        ],
    }
    result = _build_detected_map(data, 500, 500)
    assert result.room_count == 1


def test_parse_thickness():
    assert _parse_thickness("thin") == 5.0
    assert _parse_thickness("medium") == 10.0
    assert _parse_thickness("thick") == 20.0
    assert _parse_thickness("unknown") == 10.0


@pytest.mark.asyncio
async def test_detect_walls_ai_mock():
    img = np.full((300, 400, 3), 255, np.uint8)
    cv2.line(img, (100, 50), (100, 250), 0, thickness=4)
    path = _save(img)

    mock_response = AsyncMock()
    mock_response.status_code = 200
    mock_response.raise_for_status = lambda: None
    mock_response.json = lambda: {
        "choices": [{"message": {"content": MOCK_VLM_RESPONSE}}]
    }

    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=mock_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("wall_detection.ai_detector.httpx.AsyncClient", return_value=mock_client):
        result = await detect_walls_ai(path, api_key="test-key")

    assert isinstance(result, DetectedMap)
    assert result.wall_count == 2
    assert result.door_count == 1
    assert result.room_count == 1
    assert result.mode == "ai"

    os.unlink(path)


def test_classify_image():
    from wall_detection.pipeline import classify_image
    from wall_detection.preprocessing import DetectionMode

    blueprint = np.full((100, 100, 3), 255, np.uint8)
    cv2.line(blueprint, (10, 10), (10, 90), 0, thickness=2)
    assert classify_image(blueprint) == DetectionMode.BLUEPRINT

    textured = np.zeros((100, 100, 3), np.uint8)
    textured[:, :, 0] = 50
    textured[:, :, 1] = 150
    textured[:, :, 2] = 100
    textured[20:30, 20:30] = [200, 50, 50]
    assert classify_image(textured) == DetectionMode.TEXTURED
