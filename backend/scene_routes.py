from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_session
from models import Scene, SceneCharacter, Campaign
from schemas import (
    SceneCreate, SceneUpdate, SceneResponse,
    SceneCharacterPosition, SceneCharacterResponse,
)
import os
import uuid

router = APIRouter(tags=["scenes"])

ASSETS_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "assets")


@router.post("/campaigns/{campaign_id}/scenes", response_model=SceneResponse)
async def create_scene(
    campaign_id: str,
    data: SceneCreate,
    db: AsyncSession = Depends(get_session),
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
    return scene


@router.delete("/campaigns/{campaign_id}/scenes/{scene_id}")
async def delete_scene(
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


@router.post("/campaigns/{campaign_id}/scenes/{scene_id}/upload-background", response_model=SceneResponse)
async def upload_scene_background(
    campaign_id: str,
    scene_id: str,
    file: UploadFile = File(...),
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


def get_scene_static_url(file_path: str) -> str | None:
    if not file_path:
        return None
    normalized = file_path.replace("\\", "/")
    idx = normalized.lower().find("/assets/")
    if idx == -1:
        return None
    return normalized[idx + 1:]


@router.put("/campaigns/{campaign_id}/scenes/{scene_id}/characters", response_model=list[SceneCharacterResponse])
async def update_scene_characters(
    campaign_id: str,
    scene_id: str,
    characters: list[SceneCharacterPosition],
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

    existing = await db.execute(
        select(SceneCharacter).where(SceneCharacter.scene_id == scene_id)
    )
    for sc in existing.scalars().all():
        await db.delete(sc)

    created = []
    for ch in characters:
        sc = SceneCharacter(
            scene_id=scene_id,
            entity_type=ch.entity_type,
            entity_id=ch.entity_id,
            x=ch.x,
            y=ch.y,
            z=ch.z,
            visible=1 if ch.visible else 0,
            order=ch.order,
        )
        db.add(sc)
        created.append(sc)

    await db.commit()
    for sc in created:
        await db.refresh(sc)
    return created


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
    return chars_r.scalars().all()
