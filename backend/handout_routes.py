import os

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_session
from models import Campaign, Handout
from routes import broadcast_revision
from schemas import HandoutIn, HandoutOut

router = APIRouter(tags=["handouts"])

ASSETS_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "assets")


def _to_out(h: Handout) -> HandoutOut:
    return HandoutOut(
        id=h.id,
        campaign_id=h.campaign_id,
        title=h.title,
        content=h.content or "",
        image_path=h.image_path,
        visible_to_players=bool(h.visible_to_players),
        created_at=h.created_at,
        updated_at=h.updated_at,
    )


async def _get_handout(db: AsyncSession, campaign_id: str, handout_id: str) -> Handout:
    result = await db.execute(
        select(Handout).where(
            Handout.id == handout_id,
            Handout.campaign_id == campaign_id,
        )
    )
    handout = result.scalar_one_or_none()
    if not handout:
        raise HTTPException(status_code=404, detail="Handout not found")
    return handout


@router.get("/campaigns/{campaign_id}/handouts", response_model=list[HandoutOut])
async def list_handouts(campaign_id: str, db: AsyncSession = Depends(get_session)):
    result = await db.execute(
        select(Handout)
        .where(Handout.campaign_id == campaign_id)
        .order_by(Handout.created_at.desc())
    )
    return [_to_out(h) for h in result.scalars().all()]


@router.post("/campaigns/{campaign_id}/handouts", response_model=HandoutOut)
async def create_handout(
    campaign_id: str,
    data: HandoutIn,
    db: AsyncSession = Depends(get_session),
):
    camp_r = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    if not camp_r.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Campaign not found")

    handout = Handout(
        campaign_id=campaign_id,
        title=data.title,
        content=data.content,
        image_path=data.image_path,
        visible_to_players=1 if data.visible_to_players else 0,
    )
    db.add(handout)
    await db.commit()
    await db.refresh(handout)
    await broadcast_revision(db, campaign_id)
    return _to_out(handout)


@router.put("/campaigns/{campaign_id}/handouts/{handout_id}", response_model=HandoutOut)
async def update_handout(
    campaign_id: str,
    handout_id: str,
    data: HandoutIn,
    db: AsyncSession = Depends(get_session),
):
    handout = await _get_handout(db, campaign_id, handout_id)
    handout.title = data.title
    handout.content = data.content
    handout.image_path = data.image_path
    handout.visible_to_players = 1 if data.visible_to_players else 0
    await db.commit()
    await db.refresh(handout)
    await broadcast_revision(db, campaign_id)
    return _to_out(handout)


@router.delete("/campaigns/{campaign_id}/handouts/{handout_id}")
async def delete_handout(
    campaign_id: str,
    handout_id: str,
    db: AsyncSession = Depends(get_session),
):
    handout = await _get_handout(db, campaign_id, handout_id)
    await db.delete(handout)
    await db.commit()
    await broadcast_revision(db, campaign_id)
    return {"ok": True}


@router.post("/campaigns/{campaign_id}/handouts/{handout_id}/image", response_model=HandoutOut)
async def upload_handout_image(
    campaign_id: str,
    handout_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_session),
):
    handout = await _get_handout(db, campaign_id, handout_id)

    ext = os.path.splitext(file.filename or "handout.png")[1] or ".png"
    handout_dir = os.path.join(ASSETS_DIR, campaign_id, "handouts", handout_id)
    os.makedirs(handout_dir, exist_ok=True)
    file_path = os.path.join(handout_dir, f"image{ext}")

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    handout.image_path = file_path
    await db.commit()
    await db.refresh(handout)
    await broadcast_revision(db, campaign_id)
    return _to_out(handout)


@router.delete("/campaigns/{campaign_id}/handouts/{handout_id}/image", response_model=HandoutOut)
async def clear_handout_image(
    campaign_id: str,
    handout_id: str,
    db: AsyncSession = Depends(get_session),
):
    handout = await _get_handout(db, campaign_id, handout_id)
    handout.image_path = None
    await db.commit()
    await db.refresh(handout)
    await broadcast_revision(db, campaign_id)
    return _to_out(handout)