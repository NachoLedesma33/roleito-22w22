from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_session
from models import Campaign, Session
from schemas import SessionCreate, SessionUpdate, SessionResponse

router = APIRouter(tags=["sessions"])


@router.post(
    "/campaigns/{campaign_id}/sessions",
    response_model=SessionResponse,
)
async def create_session(
    campaign_id: str,
    data: SessionCreate,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Campaign not found")

    sess = Session(
        campaign_id=campaign_id,
        number=data.number,
        date=data.date,
        title=data.title,
        raw_notes=data.raw_notes,
        summary=data.summary,
    )
    db.add(sess)
    await db.commit()
    await db.refresh(sess)
    return sess


@router.get(
    "/campaigns/{campaign_id}/sessions",
    response_model=list[SessionResponse],
)
async def list_sessions(
    campaign_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Session)
        .where(Session.campaign_id == campaign_id)
        .order_by(Session.number.desc())
    )
    return result.scalars().all()


@router.get(
    "/campaigns/{campaign_id}/sessions/current",
    response_model=SessionResponse,
)
async def get_current_session(
    campaign_id: str,
    db: AsyncSession = Depends(get_session),
):
    campaign_r = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )
    campaign = campaign_r.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if not campaign.current_session_id:
        raise HTTPException(status_code=404, detail="No active session")

    result = await db.execute(
        select(Session).where(Session.id == campaign.current_session_id)
    )
    sess = result.scalar_one_or_none()
    if not sess:
        raise HTTPException(status_code=404, detail="Current session not found")
    return sess


@router.get(
    "/campaigns/{campaign_id}/sessions/{session_id}",
    response_model=SessionResponse,
)
async def get_session_by_id(
    campaign_id: str,
    session_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Session).where(
            Session.id == session_id,
            Session.campaign_id == campaign_id,
        )
    )
    sess = result.scalar_one_or_none()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    return sess


@router.put(
    "/campaigns/{campaign_id}/sessions/{session_id}",
    response_model=SessionResponse,
)
async def update_session(
    campaign_id: str,
    session_id: str,
    data: SessionUpdate,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Session).where(
            Session.id == session_id,
            Session.campaign_id == campaign_id,
        )
    )
    sess = result.scalar_one_or_none()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(sess, field, value)

    await db.commit()
    await db.refresh(sess)
    return sess


@router.delete("/campaigns/{campaign_id}/sessions/{session_id}")
async def delete_session(
    campaign_id: str,
    session_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Session).where(
            Session.id == session_id,
            Session.campaign_id == campaign_id,
        )
    )
    sess = result.scalar_one_or_none()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    await db.delete(sess)
    await db.commit()
    return {"status": "deleted", "id": session_id}


@router.post(
    "/campaigns/{campaign_id}/sessions/{session_id}/start",
    response_model=SessionResponse,
)
async def start_session(
    campaign_id: str,
    session_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Session).where(
            Session.id == session_id,
            Session.campaign_id == campaign_id,
        )
    )
    sess = result.scalar_one_or_none()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    campaign_r = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )
    campaign = campaign_r.scalar_one_or_none()

    if campaign.current_session_id and campaign.current_session_id != session_id:
        raise HTTPException(
            status_code=400,
            detail=f"Campaign already has active session: {campaign.current_session_id}",
        )

    sess.status = "ACTIVE"
    campaign.current_session_id = session_id

    await db.commit()
    await db.refresh(sess)
    return sess


@router.post(
    "/campaigns/{campaign_id}/sessions/{session_id}/end",
    response_model=SessionResponse,
)
async def end_session(
    campaign_id: str,
    session_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Session).where(
            Session.id == session_id,
            Session.campaign_id == campaign_id,
        )
    )
    sess = result.scalar_one_or_none()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    campaign_r = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )
    campaign = campaign_r.scalar_one_or_none()

    sess.status = "COMPLETED"
    if campaign.current_session_id == session_id:
        campaign.current_session_id = None

    await db.commit()
    await db.refresh(sess)
    return sess
