"""Orchestrator API endpoint."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.agents.orchestrator import OrchestratorAgent, TaskType
from auth import require_dm, AuthSession
from database import get_session
from models import Campaign

router = APIRouter(prefix="/orchestrator", tags=["orchestrator"])


class OrchestratorRequest(BaseModel):
    task_type: str
    session_id: str | None = None
    session_number: int | None = None
    raw_notes: str = ""
    query: str = ""
    scene_description: str = ""
    mood: str = "neutral"


class AgentResultResponse(BaseModel):
    task_type: str
    status: str
    agent_results: dict
    summary: str
    errors: list[str]
    execution_time_ms: int


@router.post("/{campaign_id}/execute", response_model=AgentResultResponse)
async def execute_task(
    campaign_id: str,
    req: OrchestratorRequest,
    db: AsyncSession = Depends(get_session),
    _auth: AuthSession = Depends(require_dm),
):
    try:
        task_type = TaskType(req.task_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid task type: {req.task_type}")

    campaign = (await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )).scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Con la db: el orquestador arma el contexto de la campaña y se lo pasa a
    # los sub-agentes. Sin ella, responden al aire.
    orchestrator = OrchestratorAgent(db)
    result = await orchestrator.execute(
        task_type,
        campaign_id,
        session_id=req.session_id,
        session_number=req.session_number,
        raw_notes=req.raw_notes,
        query=req.query,
        scene_description=req.scene_description,
        mood=req.mood,
    )
    return AgentResultResponse(**vars(result))
