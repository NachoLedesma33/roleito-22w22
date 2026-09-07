"""AI-assisted wall detection using Vision Language Models.

Sends the battle map image to a VLM (GPT-4o, Gemini, etc.) and parses
the structured JSON response into DetectedMap.

Supports any OpenAI-compatible vision endpoint.
"""

import asyncio
import base64
import json
import logging
import re
from pathlib import Path
from typing import Optional

import httpx

from .types import DetectedMap, DetectedWall, DetectedDoor, DetectedRoom, Point

logger = logging.getLogger("roleito.wall_detection.ai")

DEFAULT_BASE_URL = "https://api.openai.com/v1"
DEFAULT_MODEL = "gpt-4o"
REQUEST_TIMEOUT = 60.0

VISION_PROMPT = """Analyze this battle map image and extract the architectural layout.

Return ONLY a JSON object (no markdown, no explanation) with this exact structure:
{
  "walls": [
    {
      "points": [{"x": 0.0-1.0, "y": 0.0-1.0}, ...],
      "thickness": "thin|medium|thick",
      "confidence": 0.0-1.0
    }
  ],
  "doors": [
    {
      "position": {"x": 0.0-1.0, "y": 0.0-1.0},
      "rotation": 0-360,
      "width": 0.0-0.1,
      "confidence": 0.0-1.0
    }
  ],
  "rooms": [
    {
      "polygon": [{"x": 0.0-1.0, "y": 0.0-1.0}, ...],
      "label": "room name or empty"
    }
  ]
}

Rules:
- Coordinates normalized 0-1 relative to image dimensions (0,0 = top-left)
- ONLY detect walls and partitions that BLOCK MOVEMENT: building walls, room dividers, fences, balustrades, columns that are tall and solid
- IGNORE everything else: furniture, beds, tables, chairs, vegetation (bushes, trees, plants, grass, hedges), rocks, statues, barrels, debris, rugs, floor markings, painted patterns, shadows, gradients, tiles, character tokens, stairs (unless fully enclosed)
- When in doubt, DO NOT include the wall — better to miss a false positive than add noise
- Walls follow the building's straight lines. Do not return wavy or slightly diagonal segments for walls that are actually straight
- Prefer axis-aligned walls (horizontal/vertical/45-degree). Return each wall as EXACTLY 2 points unless it is genuinely curved
- Mark confidence 0.9+ only for clear, complete walls; 0.5-0.7 for partially visible or uncertain; <0.5 for very uncertain (still return them, they will be filtered)
- Doors = openings in walls or visible door objects
- Rooms = enclosed areas bounded by walls
- Return valid JSON only, no markdown fences"""


def _encode_image(image_path: str) -> str:
    """Read image file and return base64-encoded string."""
    data = Path(image_path).read_bytes()
    return base64.b64encode(data).decode()


def _get_mime(image_path: str) -> str:
    """Detect MIME type from extension."""
    ext = Path(image_path).suffix.lower()
    mime_map = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".gif": "image/gif",
    }
    return mime_map.get(ext, "image/png")


def _parse_thickness(val: str) -> float:
    """Convert thickness string to pixel estimate."""
    return {"thin": 5.0, "medium": 10.0, "thick": 20.0}.get(val, 10.0)


def _parse_ai_response(raw: str) -> dict:
    """Extract JSON from VLM response, handling markdown fences and truncation."""
    text = raw.strip()

    fence_match = re.search(r"```(?:json)?\s*\n?(.*?)\n?\s*```", text, re.DOTALL)
    if fence_match:
        text = fence_match.group(1).strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    first_brace = text.find("{")
    last_brace = text.rfind("}")
    candidates = []
    if first_brace != -1 and last_brace > first_brace:
        candidates.append(text[first_brace:last_brace + 1])
        for candidate in _truncation_recovery(text, first_brace, last_brace):
            candidates.append(candidate)
    for candidate in candidates:
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            continue
    raise ValueError(f"Could not parse JSON from VLM response: {raw[:300]}")


def _truncation_recovery(text: str, first_brace: int, last_brace: int):
    """Yield progressively longer valid-looking JSON slices for truncated output.

    Gemini sometimes cuts JSON mid-array (missing closing brackets/elements).
    Windows over the tail of the response: a token is junk if it is an
    incomplete array element (line with a dangling comma or an unclosed
    string/object) immediately followed by nothing. We rescan from the last
    complete '}' backwards, trimming trailing incomplete array items.
    """
    tail = text[first_brace:last_brace + 1]
    depth = 0
    cut = -1
    for i in range(len(tail) - 1, -1, -1):
        ch = tail[i]
        if ch == "}":
            depth += 1
        elif ch == "{":
            depth -= 1
            if depth == 0:
                cut = i
                break
    if cut == -1:
        return []
    if cut < len(tail) - 1:
        yield tail[:cut + 1]


def _build_detected_map(data: dict, img_w: int, img_h: int) -> DetectedMap:
    """Convert parsed JSON dict into DetectedMap with pixel coordinates."""
    walls = []
    for i, w in enumerate(data.get("walls", [])):
        points = [
            Point(x=p["x"] * img_w, y=p["y"] * img_h)
            for p in w.get("points", [])
        ]
        if len(points) < 2:
            continue
        walls.append(DetectedWall(
            id=f"ai-wall-{i}",
            points=points,
            thickness=_parse_thickness(w.get("thickness", "medium")),
            confidence=float(w.get("confidence", 0.8)),
        ))

    doors = []
    for i, d in enumerate(data.get("doors", [])):
        pos = d.get("position", {})
        doors.append(DetectedDoor(
            id=f"ai-door-{i}",
            position=Point(x=pos.get("x", 0) * img_w, y=pos.get("y", 0) * img_h),
            rotation=float(d.get("rotation", 0)),
            width=float(d.get("width", 0.03)) * max(img_w, img_h),
            confidence=float(d.get("confidence", 0.8)),
        ))

    rooms = []
    for i, r in enumerate(data.get("rooms", [])):
        polygon = [
            Point(x=p["x"] * img_w, y=p["y"] * img_h)
            for p in r.get("polygon", [])
        ]
        if len(polygon) < 3:
            continue
        rooms.append(DetectedRoom(
            id=f"ai-room-{i}",
            polygon=polygon,
            label=r.get("label", ""),
        ))

    all_conf = [w.confidence for w in walls] + [d.confidence for d in doors]
    overall = sum(all_conf) / len(all_conf) if all_conf else 0.0

    return DetectedMap(
        width=img_w,
        height=img_h,
        walls=walls,
        doors=doors,
        rooms=rooms,
        confidence=overall,
        mode="ai",
    )


async def detect_walls_ai(
    image_path: str,
    *,
    base_url: str = DEFAULT_BASE_URL,
    api_key: str = "",
    model: str = DEFAULT_MODEL,
    max_tokens: int = 4096,
    temperature: float = 0.2,
) -> DetectedMap:
    """Detect walls/doors/rooms using a Vision Language Model.

    Args:
        image_path: Path to the battle map image.
        base_url: OpenAI-compatible API base URL.
        api_key: API key for the provider.
        model: Model ID (e.g. "gpt-4o", "gemini-2.0-flash").
        max_tokens: Max response tokens.
        temperature: Lower = more deterministic.

    Returns:
        DetectedMap with walls, doors, rooms from VLM analysis.
    """
    import cv2

    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not load image: {image_path}")
    h, w = img.shape[:2]

    img_b64 = _encode_image(image_path)
    mime = _get_mime(image_path)

    url = f"{base_url.rstrip('/')}/chat/completions"
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    payload = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": VISION_PROMPT},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime};base64,{img_b64}",
                            "detail": "high",
                        },
                    },
                ],
            }
        ],
        "max_tokens": max_tokens,
        "temperature": temperature,
        "response_format": {"type": "json_object"},
    }

    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        last_raw = ""
        for attempt in range(3):
            res = None
            for http_attempt in range(3):
                res = await client.post(url, json=payload, headers=headers)
                if res.status_code not in {429, 500, 502, 503, 504} or http_attempt == 2:
                    break
                await asyncio.sleep(1.5 * (2 ** http_attempt))
            res.raise_for_status()
            data = res.json()
            last_raw = data["choices"][0]["message"]["content"]
            try:
                parsed = _parse_ai_response(last_raw)
                return _build_detected_map(parsed, w, h)
            except (ValueError, json.JSONDecodeError, KeyError, IndexError, TypeError):
                if attempt == 2:
                    raise
                await asyncio.sleep(1.5)


def detect_walls_ai_sync(
    image_path: str,
    *,
    base_url: str = DEFAULT_BASE_URL,
    api_key: str = "",
    model: str = DEFAULT_MODEL,
    max_tokens: int = 4096,
    temperature: float = 0.2,
) -> DetectedMap:
    """Synchronous wrapper for detect_walls_ai."""
    return asyncio.run(detect_walls_ai(
        image_path,
        base_url=base_url,
        api_key=api_key,
        model=model,
        max_tokens=max_tokens,
        temperature=temperature,
    ))
