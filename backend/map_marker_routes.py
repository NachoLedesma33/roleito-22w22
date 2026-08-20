from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_session
from models import MapMarker
from schemas import MapMarkerCreate, MapMarkerUpdate, MapMarkerResponse

router = APIRouter(tags=["map-markers"])


@router.get(
    "/maps/{map_id}/markers",
    response_model=list[MapMarkerResponse],
)
async def list_markers(
    map_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(MapMarker)
        .where(MapMarker.map_id == map_id)
        .order_by(MapMarker.created_at)
    )
    return result.scalars().all()


@router.post(
    "/maps/{map_id}/markers",
    response_model=MapMarkerResponse,
)
async def create_marker(
    map_id: str,
    data: MapMarkerCreate,
    db: AsyncSession = Depends(get_session),
):
    marker = MapMarker(
        map_id=map_id,
        label=data.label,
        marker_type=data.marker_type,
        x=data.x,
        y=data.y,
        color=data.color,
        description=data.description,
    )
    db.add(marker)
    await db.commit()
    await db.refresh(marker)
    return marker


@router.put(
    "/markers/{marker_id}",
    response_model=MapMarkerResponse,
)
async def update_marker(
    marker_id: str,
    data: MapMarkerUpdate,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(select(MapMarker).where(MapMarker.id == marker_id))
    marker = result.scalar_one_or_none()
    if not marker:
        raise HTTPException(status_code=404, detail="Marker not found")

    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(marker, field, value)

    await db.commit()
    await db.refresh(marker)
    return marker


@router.delete("/markers/{marker_id}")
async def delete_marker(
    marker_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(select(MapMarker).where(MapMarker.id == marker_id))
    marker = result.scalar_one_or_none()
    if not marker:
        raise HTTPException(status_code=404, detail="Marker not found")

    await db.delete(marker)
    await db.commit()
    return {"status": "deleted", "id": marker_id}
