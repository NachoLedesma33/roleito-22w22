import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_session
from models import Campaign, Quest
from schemas import ObjectiveItem, QuestIn, QuestOut
from routes import broadcast_revision

router = APIRouter(tags=["quests"])


def _to_out(q: Quest) -> QuestOut:
    try:
        objectives = json.loads(q.objectives_json or "[]")
    except ValueError:
        objectives = []
    return QuestOut(
        id=q.id,
        campaign_id=q.campaign_id,
        title=q.title,
        description=q.description,
        status=q.status,
        objectives=[ObjectiveItem(**o) for o in objectives],
        reward=q.reward,
        visible_to_players=bool(q.visible_to_players),
        created_at=q.created_at,
        updated_at=q.updated_at,
    )


async def _get_quest(db: AsyncSession, campaign_id: str, quest_id: str) -> Quest:
    result = await db.execute(
        select(Quest).where(
            Quest.id == quest_id,
            Quest.campaign_id == campaign_id,
        )
    )
    quest = result.scalar_one_or_none()
    if not quest:
        raise HTTPException(status_code=404, detail="Quest not found")
    return quest


@router.get("/campaigns/{campaign_id}/quests", response_model=list[QuestOut])
async def list_quests(campaign_id: str, db: AsyncSession = Depends(get_session)):
    result = await db.execute(
        select(Quest)
        .where(Quest.campaign_id == campaign_id)
        .order_by(Quest.created_at.desc())
    )
    return [_to_out(q) for q in result.scalars().all()]


@router.post("/campaigns/{campaign_id}/quests", response_model=QuestOut)
async def create_quest(
    campaign_id: str,
    data: QuestIn,
    db: AsyncSession = Depends(get_session),
):
    camp_r = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    if not camp_r.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Campaign not found")

    quest = Quest(
        campaign_id=campaign_id,
        title=data.title,
        description=data.description,
        status=data.status,
        objectives_json=json.dumps([o.model_dump() for o in data.objectives]),
        reward=data.reward,
        visible_to_players=1 if data.visible_to_players else 0,
    )
    db.add(quest)
    await db.commit()
    await db.refresh(quest)
    await broadcast_revision(db, campaign_id)
    return _to_out(quest)


@router.put("/campaigns/{campaign_id}/quests/{quest_id}", response_model=QuestOut)
async def update_quest(
    campaign_id: str,
    quest_id: str,
    data: QuestIn,
    db: AsyncSession = Depends(get_session),
):
    quest = await _get_quest(db, campaign_id, quest_id)
    quest.title = data.title
    quest.description = data.description
    quest.status = data.status
    quest.objectives_json = json.dumps([o.model_dump() for o in data.objectives])
    quest.reward = data.reward
    quest.visible_to_players = 1 if data.visible_to_players else 0
    await db.commit()
    await db.refresh(quest)
    await broadcast_revision(db, campaign_id)
    return _to_out(quest)


@router.delete("/campaigns/{campaign_id}/quests/{quest_id}")
async def delete_quest(
    campaign_id: str,
    quest_id: str,
    db: AsyncSession = Depends(get_session),
):
    quest = await _get_quest(db, campaign_id, quest_id)
    await db.delete(quest)
    await db.commit()
    await broadcast_revision(db, campaign_id)
    return {"ok": True}