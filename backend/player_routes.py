from fastapi import APIRouter, Depends, HTTPException
from fastapi import UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_session
from models import Player, Map, Asset, Campaign
from schemas import PlayerCreate, PlayerUpdate, PlayerResponse, MapCreate, MapResponse, AssetResponse
import os
import uuid

router = APIRouter(tags=["players", "maps", "assets"])

ASSETS_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "assets")


# ── Player CRUD ─────────────────────────────────────────────


@router.post("/campaigns/{campaign_id}/players", response_model=PlayerResponse)
async def create_player(
    campaign_id: str,
    data: PlayerCreate,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Campaign not found")

    player = Player(
        campaign_id=campaign_id,
        name=data.name,
        character_id=data.character_id,
        role=data.role,
        notes=data.notes,
    )
    db.add(player)
    await db.commit()
    await db.refresh(player)
    return player


@router.get("/campaigns/{campaign_id}/players", response_model=list[PlayerResponse])
async def list_players(
    campaign_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Player).where(Player.campaign_id == campaign_id)
    )
    return result.scalars().all()


@router.get("/campaigns/{campaign_id}/players/{player_id}", response_model=PlayerResponse)
async def get_player(
    campaign_id: str,
    player_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Player).where(
            Player.id == player_id,
            Player.campaign_id == campaign_id,
        )
    )
    player = result.scalar_one_or_none()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player


@router.put("/campaigns/{campaign_id}/players/{player_id}", response_model=PlayerResponse)
async def update_player(
    campaign_id: str,
    player_id: str,
    data: PlayerUpdate,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Player).where(
            Player.id == player_id,
            Player.campaign_id == campaign_id,
        )
    )
    player = result.scalar_one_or_none()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(player, field, value)

    await db.commit()
    await db.refresh(player)
    return player


@router.delete("/campaigns/{campaign_id}/players/{player_id}")
async def delete_player(
    campaign_id: str,
    player_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Player).where(
            Player.id == player_id,
            Player.campaign_id == campaign_id,
        )
    )
    player = result.scalar_one_or_none()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    await db.delete(player)
    await db.commit()
    return {"status": "deleted", "id": player_id}


# ── Map CRUD ────────────────────────────────────────────────


@router.post("/campaigns/{campaign_id}/maps", response_model=MapResponse)
async def create_map(
    campaign_id: str,
    data: MapCreate,
    db: AsyncSession = Depends(get_session),
):
    campaign_r = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )
    if not campaign_r.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Campaign not found")

    map_id = str(uuid.uuid4())
    campaign_dir = os.path.join(ASSETS_DIR, campaign_id, "maps", map_id)
    os.makedirs(campaign_dir, exist_ok=True)

    map_record = Map(
        id=map_id,
        campaign_id=campaign_id,
        name=data.name,
        description=data.description,
        file_path="",
        map_type=data.map_type,
    )
    db.add(map_record)
    await db.commit()
    await db.refresh(map_record)
    return map_record


@router.post("/campaigns/{campaign_id}/maps/{map_id}/upload", response_model=MapResponse)
async def upload_map_image(
    campaign_id: str,
    map_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Map).where(
            Map.id == map_id,
            Map.campaign_id == campaign_id,
        )
    )
    map_record = result.scalar_one_or_none()
    if not map_record:
        raise HTTPException(status_code=404, detail="Map not found")

    ext = os.path.splitext(file.filename or "map.png")[1] or ".png"
    campaign_dir = os.path.join(ASSETS_DIR, campaign_id, "maps", map_id)
    os.makedirs(campaign_dir, exist_ok=True)
    file_path = os.path.join(campaign_dir, f"map{ext}")

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    map_record.file_path = file_path
    await db.commit()
    await db.refresh(map_record)
    return map_record


@router.get("/campaigns/{campaign_id}/maps", response_model=list[MapResponse])
async def list_maps(
    campaign_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Map).where(Map.campaign_id == campaign_id)
    )
    return result.scalars().all()


@router.delete("/campaigns/{campaign_id}/maps/{map_id}")
async def delete_map(
    campaign_id: str,
    map_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Map).where(
            Map.id == map_id,
            Map.campaign_id == campaign_id,
        )
    )
    map_record = result.scalar_one_or_none()
    if not map_record:
        raise HTTPException(status_code=404, detail="Map not found")

    if map_record.file_path and os.path.exists(map_record.file_path):
        os.remove(map_record.file_path)

    await db.delete(map_record)
    await db.commit()
    return {"status": "deleted", "id": map_id}


# ── Asset Upload ────────────────────────────────────────────


@router.post("/campaigns/{campaign_id}/assets/upload", response_model=AssetResponse)
async def upload_asset(
    campaign_id: str,
    file: UploadFile = File(...),
    name: str = "",
    asset_type: str = "image",
    entity_type: str | None = None,
    entity_id: str | None = None,
    db: AsyncSession = Depends(get_session),
):
    campaign_r = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )
    if not campaign_r.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Campaign not found")

    asset_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename or "asset")[1] or ".png"
    campaign_dir = os.path.join(ASSETS_DIR, campaign_id, "assets")
    os.makedirs(campaign_dir, exist_ok=True)
    file_path = os.path.join(campaign_dir, f"{asset_id}{ext}")

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    asset = Asset(
        id=asset_id,
        campaign_id=campaign_id,
        name=name or file.filename or "Untitled",
        file_path=file_path,
        asset_type=asset_type,
        entity_type=entity_type,
        entity_id=entity_id,
    )
    db.add(asset)
    await db.commit()
    await db.refresh(asset)
    return asset


@router.get("/campaigns/{campaign_id}/assets", response_model=list[AssetResponse])
async def list_assets(
    campaign_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Asset).where(Asset.campaign_id == campaign_id)
    )
    return result.scalars().all()


@router.delete("/campaigns/{campaign_id}/assets/{asset_id}")
async def delete_asset(
    campaign_id: str,
    asset_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Asset).where(
            Asset.id == asset_id,
            Asset.campaign_id == campaign_id,
        )
    )
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    if asset.file_path and os.path.exists(asset.file_path):
        os.remove(asset.file_path)

    await db.delete(asset)
    await db.commit()
    return {"status": "deleted", "id": asset_id}
