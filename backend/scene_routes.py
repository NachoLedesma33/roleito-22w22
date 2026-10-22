from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_session
from models import Scene, SceneCharacter, Campaign
from schemas import (
    SceneCreate, SceneUpdate, SceneResponse,
    SceneCharacterPosition, SceneCharacterResponse,
)
from services.assets import ASSETS_DIR
from services.item_validation import ItemValidationError, assert_valid_scene_items
from triggers import fire_zone_triggers
import logging
import math
import os
import time
import json
from pathlib import Path

logger = logging.getLogger("roleito.scenes")

from routes import broadcast_positions, broadcast_revision
from auth import require_dm, AuthSession

router = APIRouter(tags=["scenes"])

# Prioridad DM: si el DM movio un token hace poco, se ignoran los moves
# del jugador sobre ese mismo token (condicion de carrera).
_LAST_DM_MOVE: dict = {}


def _sc_response(sc: SceneCharacter) -> SceneCharacterResponse:
    try:
        statuses = json.loads(sc.statuses_json or "[]")
    except ValueError:
        statuses = []
    return SceneCharacterResponse(
        id=sc.id,
        scene_id=sc.scene_id,
        entity_type=sc.entity_type,
        entity_id=sc.entity_id,
        x=sc.x,
        y=sc.y,
        z=sc.z,
        visible=bool(sc.visible),
        order=sc.order,
        rotation=sc.rotation,
        token_scale=sc.token_scale,
        move_speed=sc.move_speed,
        brightness=sc.brightness,
        vx=sc.vx,
        vz=sc.vz,
        vrot=sc.vrot,
        last_move_at=sc.last_move_at,
        facing_offset=sc.facing_offset,
        vision_type=sc.vision_type,
        vision_range=sc.vision_range,
        statuses=statuses,
    )


def _load_ai_settings() -> dict:
    """Load AI config from data/ai_config.json."""
    config_path = Path(__file__).parent.parent / "data" / "ai_config.json"
    if not config_path.exists():
        return {"provider": "mock", "remote_base_url": "", "model": ""}
    try:
        return json.loads(config_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {"provider": "mock", "remote_base_url": "", "model": ""}


@router.post("/campaigns/{campaign_id}/scenes", response_model=SceneResponse)
async def create_scene(
    campaign_id: str,
    data: SceneCreate,
    db: AsyncSession = Depends(get_session),
    _auth: AuthSession = Depends(require_dm),

):
    result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Campaign not found")

    scene = Scene(
        campaign_id=campaign_id,
        name=data.name,
        description=data.description,
        lighting=data.lighting,
        weather=data.weather,
        weather_intensity=data.weather_intensity,
    )
    db.add(scene)
    await db.commit()
    await db.refresh(scene)
    return scene


@router.get("/campaigns/{campaign_id}/scenes", response_model=list[SceneResponse])
async def list_scenes(
    campaign_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Scene).where(Scene.campaign_id == campaign_id)
    )
    return result.scalars().all()


@router.get("/campaigns/{campaign_id}/scenes/{scene_id}", response_model=SceneResponse)
async def get_scene(
    campaign_id: str,
    scene_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Scene).where(
            Scene.id == scene_id,
            Scene.campaign_id == campaign_id,
        )
    )
    scene = result.scalar_one_or_none()
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    return scene


@router.put("/campaigns/{campaign_id}/scenes/{scene_id}", response_model=SceneResponse)
async def update_scene(
    campaign_id: str,
    scene_id: str,
    data: SceneUpdate,
    db: AsyncSession = Depends(get_session),
    _auth: AuthSession = Depends(require_dm),

):
    result = await db.execute(
        select(Scene).where(
            Scene.id == scene_id,
            Scene.campaign_id == campaign_id,
        )
    )
    scene = result.scalar_one_or_none()
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")

    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(scene, field, value)

    await db.commit()
    await db.refresh(scene)
    await broadcast_revision(db, campaign_id)
    return scene


@router.post("/campaigns/{campaign_id}/scenes/{scene_id}/sync", response_model=SceneResponse)
async def sync_scene(
    campaign_id: str,
    scene_id: str,
    db: AsyncSession = Depends(get_session),
    _auth: AuthSession = Depends(require_dm),

):
    result = await db.execute(
        select(Scene).where(
            Scene.id == scene_id,
            Scene.campaign_id == campaign_id,
        )
    )
    scene = result.scalar_one_or_none()
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")

    all_scenes_r = await db.execute(
        select(Scene).where(Scene.campaign_id == campaign_id)
    )
    for s in all_scenes_r.scalars().all():
        s.status = "active" if s.id == scene_id else "inactive"

    await db.commit()
    await db.refresh(scene)
    await broadcast_revision(db, campaign_id)
    return scene


@router.delete("/campaigns/{campaign_id}/scenes/{scene_id}")
async def delete_scene(
    campaign_id: str,
    scene_id: str,
    db: AsyncSession = Depends(get_session),
    _auth: AuthSession = Depends(require_dm),

):
    result = await db.execute(
        select(Scene).where(
            Scene.id == scene_id,
            Scene.campaign_id == campaign_id,
        )
    )
    scene = result.scalar_one_or_none()
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")

    chars_r = await db.execute(
        select(SceneCharacter).where(SceneCharacter.scene_id == scene_id)
    )
    for sc in chars_r.scalars().all():
        await db.delete(sc)

    if scene.background_path and os.path.exists(scene.background_path):
        os.remove(scene.background_path)

    await db.delete(scene)
    await db.commit()
    return {"status": "deleted", "id": scene_id}


@router.put("/campaigns/{campaign_id}/scenes/{scene_id}/items", response_model=SceneResponse)
async def save_scene_items(
    campaign_id: str,
    scene_id: str,
    data: dict,
    db: AsyncSession = Depends(get_session),
    _auth: AuthSession = Depends(require_dm),

):
    result = await db.execute(
        select(Scene).where(
            Scene.id == scene_id,
            Scene.campaign_id == campaign_id,
        )
    )
    scene = result.scalar_one_or_none()
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")

    import json
    items = data.get("items", [])
    # Un NaN o una URL absoluta en un item rompe el snapshot del jugador (el
    # JSON.parse del navegador los rechaza) o hace que el navegador del DM
    # cargue un host ajeno. Se rechaza antes de guardar.
    try:
        assert_valid_scene_items(items)
    except ItemValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))

    scene.items_json = json.dumps(items)
    await db.commit()
    await db.refresh(scene)
    await broadcast_revision(db, campaign_id)
    return scene


@router.get("/campaigns/{campaign_id}/scenes/{scene_id}/items")
async def get_scene_items(
    campaign_id: str,
    scene_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Scene).where(
            Scene.id == scene_id,
            Scene.campaign_id == campaign_id,
        )
    )
    scene = result.scalar_one_or_none()
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")

    import json
    items = json.loads(scene.items_json) if scene.items_json else []
    return {"items": items}


@router.post("/campaigns/{campaign_id}/scenes/{scene_id}/detect-walls")
async def detect_walls(
    campaign_id: str,
    scene_id: str,
    mode: str = "blueprint",
    seed: int = 0,
    db: AsyncSession = Depends(get_session),
    _auth: AuthSession = Depends(require_dm),

):
    result = await db.execute(
        select(Scene).where(
            Scene.id == scene_id,
            Scene.campaign_id == campaign_id,
        )
    )
    scene = result.scalar_one_or_none()
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    if not scene.background_path or not os.path.exists(scene.background_path):
        raise HTTPException(status_code=400, detail="No background image to analyze")

    from wall_detection import detect_map, scene_items_from_detection, DetectionMode
    from starlette.concurrency import run_in_threadpool

    use_ai = mode == "ai"
    ai_provider = None
    ai_model = None
    detection_mode = None
    if use_ai:
        # La deteccion con IA usa el perfil "wall-detection" (o el default):
        # el provider que ve la imagen sale de ahi, con su key y su modelo.
        from core.agents.provider import get_model_for_agent, get_provider_for_agent

        ai_provider = get_provider_for_agent("wall-detection")
        if getattr(ai_provider, "name", "") == "mock":
            raise HTTPException(
                status_code=400,
                detail=(
                    "La deteccion con IA necesita un perfil con vision "
                    "(configuralo en el panel de IA)"
                ),
            )
        ai_model = get_model_for_agent("wall-detection")
    else:
        detection_mode = DetectionMode.TEXTURED if mode == "textured" else DetectionMode.BLUEPRINT

    try:
        detection = await run_in_threadpool(
            detect_map,
            scene.background_path,
            detection_mode,
            use_ai=use_ai,
            ai_provider=ai_provider,
            ai_model=ai_model,
            seed=seed,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")

    new_items = scene_items_from_detection(detection)

    # La detección NO escribe en la escena: devuelve una PROPUESTA. El DM la
    # revisa y la aprueba en la UI, y es el frontend (PUT /items) quien guarda
    # el grafo. Antes el endpoint appendeaba a items_json y ese write se pisaba
    # con el save del frontend; si ese save fallaba, la escena quedaba con los
    # muros duplicados (una copia por intento de detección).
    return {
        "items": new_items,
        "wall_count": detection.wall_count,
        "door_count": detection.door_count,
        "confidence": detection.confidence,
        "mode": detection.mode,
        # False = la propuesta la hizo OpenCV, no la IA (plano clasificado como
        # blueprint, o la IA caida). El frontend lo muestra al DM.
        "ai_used": detection.ai_used,
        # Las salas que la deteccion encontro. Antes se descartaban en
        # silencio: el DM veia muros sin saber que el detector tambien habia
        # encontrado rooms.
        "rooms": [
            {
                "id": room.id,
                "label": room.label,
                "area": room.area,
                "polygon": [{"x": p.x, "y": p.y} for p in room.polygon],
                "door_ids": room.door_ids,
            }
            for room in detection.rooms
        ],
        "image_size": {"width": detection.width, "height": detection.height},
    }


@router.post("/campaigns/{campaign_id}/scenes/{scene_id}/detect-grid")
async def detect_scene_grid(
    campaign_id: str,
    scene_id: str,
    db: AsyncSession = Depends(get_session),
    _auth: AuthSession = Depends(require_dm),

):
    """Detecta la grilla regular del fondo de la escena, en PIXELES.

    La conversion a unidades del mundo la hace el frontend (que es quien sabe
    el tamano del mundo de la escena): aca todo es px de la imagen.

    Si no encuentra grilla devuelve `type: none` con confianza 0: el DM ajusta
    a mano (ver `docs/MAP-ANALYSIS.md`, Stage 2).
    """
    import cv2
    from wall_detection.preprocessing import detect_grid, grid_binary

    scene = (await db.execute(
        select(Scene).where(
            Scene.id == scene_id,
            Scene.campaign_id == campaign_id,
        )
    )).scalar_one_or_none()
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    if not scene.background_path or not os.path.exists(scene.background_path):
        raise HTTPException(status_code=400, detail="No background image to analyze")

    img = cv2.imread(scene.background_path)
    if img is None:
        raise HTTPException(status_code=400, detail="Could not read background image")

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # Binario suave: las lineas finas de la grilla no sobreviven al
    # preprocesado de muros (el opening de 1px las borra).
    grid = detect_grid(grid_binary(gray), gray)

    return {
        "grid": grid.to_dict(),
        "image_size": {"width": img.shape[1], "height": img.shape[0]},
    }


@router.post("/campaigns/{campaign_id}/scenes/{scene_id}/upload-background", response_model=SceneResponse)
async def upload_scene_background(
    campaign_id: str,
    scene_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_session),
    _auth: AuthSession = Depends(require_dm),

):
    result = await db.execute(
        select(Scene).where(
            Scene.id == scene_id,
            Scene.campaign_id == campaign_id,
        )
    )
    scene = result.scalar_one_or_none()
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")

    ext = os.path.splitext(file.filename or "background.png")[1] or ".png"
    scene_dir = os.path.join(ASSETS_DIR, campaign_id, "scenes", scene_id)
    os.makedirs(scene_dir, exist_ok=True)
    file_path = os.path.join(scene_dir, f"background{ext}")

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    scene.background_path = file_path
    await db.commit()
    await db.refresh(scene)
    return scene


@router.post("/campaigns/{campaign_id}/scenes/{scene_id}/upload-audio", response_model=SceneResponse)
async def upload_scene_audio(
    campaign_id: str,
    scene_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_session),
    _auth: AuthSession = Depends(require_dm),

):
    result = await db.execute(
        select(Scene).where(
            Scene.id == scene_id,
            Scene.campaign_id == campaign_id,
        )
    )
    scene = result.scalar_one_or_none()
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")

    ext = os.path.splitext(file.filename or "audio.mp3")[1] or ".mp3"
    scene_dir = os.path.join(ASSETS_DIR, campaign_id, "scenes", scene_id)
    os.makedirs(scene_dir, exist_ok=True)
    file_path = os.path.join(scene_dir, f"audio{ext}")

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    scene.audio_path = file_path
    await db.commit()
    await db.refresh(scene)
    await broadcast_revision(db, campaign_id)
    return scene


@router.delete("/campaigns/{campaign_id}/scenes/{scene_id}/audio", response_model=SceneResponse)
async def clear_scene_audio(
    campaign_id: str,
    scene_id: str,
    db: AsyncSession = Depends(get_session),
    _auth: AuthSession = Depends(require_dm),

):
    result = await db.execute(
        select(Scene).where(
            Scene.id == scene_id,
            Scene.campaign_id == campaign_id,
        )
    )
    scene = result.scalar_one_or_none()
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")

    scene.audio_path = None
    await db.commit()
    await db.refresh(scene)
    await broadcast_revision(db, campaign_id)
    return scene


@router.post("/campaigns/{campaign_id}/scenes/{scene_id}/classify")
async def classify_scene_endpoint(
    campaign_id: str,
    scene_id: str,
    db: AsyncSession = Depends(get_session),
    _auth: AuthSession = Depends(require_dm),

):
    result = await db.execute(
        select(Scene).where(
            Scene.id == scene_id,
            Scene.campaign_id == campaign_id,
        )
    )
    scene = result.scalar_one_or_none()
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    if not scene.background_path or not os.path.exists(scene.background_path):
        raise HTTPException(status_code=400, detail="No background image to classify")

    from scene_classifier import classify_scene
    from starlette.concurrency import run_in_threadpool

    classification = await run_in_threadpool(classify_scene, scene.background_path)

    return {
        "scene_type": classification.scene_type,
        "confidence": classification.confidence,
        "dominant_colors": classification.dominant_colors,
        "suggested_backgrounds": classification.suggested_backgrounds,
    }


def get_scene_static_url(file_path: str) -> str | None:
    if not file_path:
        return None
    normalized = file_path.replace("\\", "/")
    idx = normalized.lower().find("/assets/")
    if idx == -1:
        return None
    return normalized[idx + 1:]


def _normalize_rotation(r: float | None) -> float:
    if r is None:
        return 0.0
    return round(r % (2 * math.pi) + math.pi, 6) % (2 * math.pi) - math.pi


@router.put("/campaigns/{campaign_id}/scenes/{scene_id}/characters", response_model=list[SceneCharacterResponse])
async def update_scene_characters(
    campaign_id: str,
    scene_id: str,
    characters: list[SceneCharacterPosition],
    db: AsyncSession = Depends(get_session),
    _auth: AuthSession = Depends(require_dm),

):
    result = await db.execute(
        select(Scene).where(
            Scene.id == scene_id,
            Scene.campaign_id == campaign_id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Scene not found")

    existing = await db.execute(
        select(SceneCharacter).where(SceneCharacter.scene_id == scene_id)
    )
    for sc in existing.scalars().all():
        await db.delete(sc)

    # Get scene for boundary clamping
    scene_result = await db.execute(
        select(Scene).where(Scene.id == scene_id, Scene.campaign_id == campaign_id)
    )
    scene = scene_result.scalar_one_or_none()
    map_scale = getattr(scene, 'map_scale', 1.0) if scene else 1.0
    map_h = 10 * (map_scale or 1.0)
    map_w = map_h
    token_radius = 0.4

    created = []
    for ch in characters:
        x = max(-map_w / 2 + token_radius, min(map_w / 2 - token_radius, ch.x))
        z = max(-map_h / 2 + token_radius, min(map_h / 2 - token_radius, ch.z))
        sc = SceneCharacter(
            id=ch.id if ch.id else None,
            scene_id=scene_id,
            entity_type=ch.entity_type,
            entity_id=ch.entity_id,
            x=x,
            y=ch.y,
            z=z,
            visible=1 if ch.visible else 0,
            order=ch.order,
            rotation=_normalize_rotation(ch.rotation),
            token_scale=ch.token_scale,
            move_speed=ch.move_speed,
            brightness=ch.brightness,
            facing_offset=ch.facing_offset,
            vision_type=ch.vision_type,
            vision_range=ch.vision_range,
            statuses_json=json.dumps(ch.statuses),
        )
        db.add(sc)
        created.append(sc)

    await db.commit()
    for sc in created:
        await db.refresh(sc)
    await broadcast_revision(db, campaign_id)
    return [_sc_response(sc) for sc in created]


@router.get("/campaigns/{campaign_id}/scenes/{scene_id}/characters", response_model=list[SceneCharacterResponse])
async def get_scene_characters(
    campaign_id: str,
    scene_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Scene).where(
            Scene.id == scene_id,
            Scene.campaign_id == campaign_id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Scene not found")

    chars_r = await db.execute(
        select(SceneCharacter).where(SceneCharacter.scene_id == scene_id)
    )
    return [_sc_response(sc) for sc in chars_r.scalars().all()]


# ── Player Movement ────────────────────────────────────────


class PlayerMoveRequest(BaseModel):
    character_id: str
    x: float
    z: float
    rotation: float = 0.0
    source: str = "player"


@router.patch("/campaigns/{campaign_id}/scenes/{scene_id}/move")
async def player_move_character(
    campaign_id: str,
    scene_id: str,
    data: PlayerMoveRequest,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Scene).where(
            Scene.id == scene_id,
            Scene.campaign_id == campaign_id,
        )
    )
    scene = result.scalar_one_or_none()
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")

    sc_r = await db.execute(
        select(SceneCharacter).where(
            SceneCharacter.scene_id == scene_id,
            SceneCharacter.entity_id == data.character_id,
            SceneCharacter.entity_type == "character",
        )
    )
    sc = sc_r.scalar_one_or_none()
    if not sc:
        raise HTTPException(status_code=404, detail="Character not on this scene")

    move_key = (campaign_id, scene_id, data.character_id)
    now = time.time()
    if data.source == "dm":
        _LAST_DM_MOVE[move_key] = now
    elif data.source == "player":
        last_dm = _LAST_DM_MOVE.get(move_key)
        if last_dm is not None and (now - last_dm) < 0.5:
            # El DM se movio hace menos de 500 ms: se ignora el move del jugador.
            return {
                "x": sc.x,
                "z": sc.z,
                "rotation": sc.rotation or 0.0,
                "ignored": True,
            }

    prev_x = sc.x
    prev_z = sc.z
    prev_rot = sc.rotation or 0.0
    new_rot = _normalize_rotation(data.rotation)

    sc.x = data.x
    sc.z = data.z
    sc.rotation = new_rot

    # Boundary collision: clamp to map bounds
    map_scale = getattr(scene, 'map_scale', 1.0) or 1.0
    map_h = 10 * map_scale
    map_w = map_h
    token_radius = 0.4
    sc.x = max(-map_w / 2 + token_radius, min(map_w / 2 - token_radius, sc.x))
    sc.z = max(-map_h / 2 + token_radius, min(map_h / 2 - token_radius, sc.z))

    # Grid snap
    grid_size = getattr(scene, 'grid_size', 0.0) or 0.0
    grid_snap = getattr(scene, 'grid_snap', 0)
    if grid_snap and grid_size > 0:
        sc.x = (math.floor(sc.x / grid_size) + 0.5) * grid_size
        sc.z = (math.floor(sc.z / grid_size) + 0.5) * grid_size

    # Velocity estimate for smooth client extrapolation
    now = time.time()
    dt = now - (sc.last_move_at or 0)
    max_v = 40.0
    if 0.016 <= dt <= 1.5:
        sc.vx = max(min((sc.x - prev_x) / dt, max_v), -max_v)
        sc.vz = max(min((sc.z - prev_z) / dt, max_v), -max_v)
        dr = new_rot - prev_rot
        sc.vrot = max(min(math.atan2(math.sin(dr), math.cos(dr)) / dt, max_v), -max_v)
    else:
        sc.vx = 0.0
        sc.vz = 0.0
        sc.vrot = 0.0
    sc.last_move_at = now

    await db.commit()
    # Los triggers de zona: si el token entro en una zona con trigger, se
    # dispara su evento en el bus de la campana (el DM lo ve en el monitor).
    try:
        await fire_zone_triggers(db, scene, sc.entity_id, prev_x, prev_z, sc.x, sc.z)
    except Exception:  # pragma: no cover - un trigger roto no rompe el movimiento
        logger.exception("No se pudieron disparar los triggers de zona")
    # Sin `db.refresh()`: el engine usa `expire_on_commit=False`, asi que los
    # atributos que acabamos de escribir siguen cargados y son los que devuelve la
    # respuesta. El refresh era un SELECT de mas por movimiento (medido: 14 ms).
    #
    # Y NO es `broadcast_revision`: mover un token no es un cambio de estado de
    # campana, es una posicion. Con revision, cada observador respondia bajando el
    # snapshot entero (~47 KB) por cada tick de teclado.
    await broadcast_positions(campaign_id, scene_id, [_sc_response(sc).model_dump()])
    return _sc_response(sc)
