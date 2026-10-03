from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_session
from models import Combat, CombatCombatant, Scene
from schemas import CombatantIn, CombatResponse

router = APIRouter(tags=["combat"])


async def _get_combat(
    db: AsyncSession, campaign_id: str, combat_id: str
) -> Combat:
    result = await db.execute(
        select(Combat).where(
            Combat.id == combat_id,
            Combat.campaign_id == campaign_id,
        )
    )
    combat = result.scalar_one_or_none()
    if not combat:
        raise HTTPException(status_code=404, detail="Combat not found")
    return combat


async def _get_active(db: AsyncSession, campaign_id: str, scene_id: str) -> Optional[Combat]:
    result = await db.execute(
        select(Combat)
        .where(
            Combat.campaign_id == campaign_id,
            Combat.scene_id == scene_id,
            Combat.status == "active",
        )
        .order_by(Combat.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def _combatants(db: AsyncSession, combat_id: str) -> list[CombatCombatant]:
    result = await db.execute(
        select(CombatCombatant)
        .where(CombatCombatant.combat_id == combat_id)
        .order_by(
            CombatCombatant.initiative.desc().nullslast(),
            CombatCombatant.roll_seq.asc().nullslast(),
        )
    )
    return list(result.scalars().all())


async def _reserve_seq(db: AsyncSession, combat_id: str, n: int) -> int:
    """Reserva n slots de roll_seq de forma atómica (cola FIFO por llegada).

    SQLite serializa escritores; el UPDATE+RETURNING lee y escribe el counter en
    una sola transacción, así varias tiradas simultáneas obtienen seqs distintos
    en orden real de llegada. El MAX() con el máximo roll_seq existente protege
    combates creados antes de la migración del counter.
    """
    result = await db.execute(
        text(
            "UPDATE combats SET next_seq = "
            "MAX(next_seq, (SELECT COALESCE(MAX(roll_seq), 0) FROM combat_combatants "
            "WHERE combat_id = combats.id)) + :n "
            "WHERE id = :cid RETURNING next_seq"
        ),
        {"n": n, "cid": combat_id},
    )
    row = result.first()
    return (row[0] if row else 0) - n


def _to_response(
    combat: Combat, combatants: list[CombatCombatant]
) -> CombatResponse:
    n = len(combatants)
    if n == 0:
        round_, current_turn = 1, 0
    else:
        round_ = combat.finished_turns // n + 1
        current_turn = combat.finished_turns % n
    return CombatResponse(
        id=combat.id,
        campaign_id=combat.campaign_id,
        scene_id=combat.scene_id,
        status=combat.status,
        round=round_,
        current_turn=current_turn,
        combatants=combatants,
    )


@router.post(
    "/campaigns/{campaign_id}/scenes/{scene_id}/combat",
    response_model=CombatResponse,
)
async def start_combat(
    campaign_id: str,
    scene_id: str,
    db: AsyncSession = Depends(get_session),
):
    scene_r = await db.execute(
        select(Scene).where(
            Scene.id == scene_id,
            Scene.campaign_id == campaign_id,
        )
    )
    if not scene_r.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Scene not found")

    existing = await _get_active(db, campaign_id, scene_id)
    if existing:
        raise HTTPException(status_code=400, detail="Combat already active on this scene")

    combat = Combat(
        campaign_id=campaign_id,
        scene_id=scene_id,
        status="active",
        finished_turns=0,
        next_seq=0,
    )
    db.add(combat)
    await db.commit()
    await db.refresh(combat)
    return _to_response(combat, [])


@router.get(
    "/campaigns/{campaign_id}/scenes/{scene_id}/combat",
    response_model=Optional[CombatResponse],
)
async def get_active_combat(
    campaign_id: str,
    scene_id: str,
    db: AsyncSession = Depends(get_session),
):
    combat = await _get_active(db, campaign_id, scene_id)
    if not combat:
        return None
    combatants = await _combatants(db, combat.id)
    return _to_response(combat, combatants)


@router.post(
    "/campaigns/{campaign_id}/combat/{combat_id}/combatants",
    response_model=CombatResponse,
)
async def add_combatants(
    campaign_id: str,
    combat_id: str,
    data: list[CombatantIn],
    db: AsyncSession = Depends(get_session),
):
    combat = await _get_combat(db, campaign_id, combat_id)
    if combat.status != "active":
        raise HTTPException(status_code=400, detail="Combat is not active")

    existing_r = await db.execute(
        select(CombatCombatant).where(CombatCombatant.combat_id == combat_id)
    )
    existing = {(c.entity_type, c.entity_id): c for c in existing_r.scalars().all()}

    rolls = [i for i in data if i.initiative is not None]
    seq_base = await _reserve_seq(db, combat_id, len(rolls)) if rolls else 0

    for item in data:
        cc = existing.get((item.entity_type, item.entity_id))
        if cc is None:
            cc = CombatCombatant(
                combat_id=combat_id,
                entity_type=item.entity_type,
                entity_id=item.entity_id,
                initiative=None,
                roll_seq=None,
                pending_roll=0,
            )
            db.add(cc)
            existing[(item.entity_type, item.entity_id)] = cc
        if item.initiative is not None:
            cc.initiative = item.initiative
            seq_base += 1
            cc.roll_seq = seq_base
            cc.pending_roll = 0
        elif item.entity_type == "character":
            # Jugador seleccionado sin tirar: su POV recibe el prompt.
            cc.pending_roll = 1

    await db.commit()
    combatants = await _combatants(db, combat_id)
    return _to_response(combat, combatants)


@router.post(
    "/campaigns/{campaign_id}/combat/{combat_id}/initiative-roll",
    response_model=CombatResponse,
)
async def initiative_roll(
    campaign_id: str,
    combat_id: str,
    data: CombatantIn,
    db: AsyncSession = Depends(get_session),
):
    """Tirada de iniciativa desde el POV del jugador. Cola FIFO por llegada."""
    combat = await _get_combat(db, campaign_id, combat_id)
    if combat.status != "active":
        raise HTTPException(status_code=400, detail="Combat is not active")
    if data.entity_type != "character":
        raise HTTPException(status_code=400, detail="Only player characters roll from the player view")
    if data.initiative is None:
        raise HTTPException(status_code=400, detail="Initiative value required")

    result = await db.execute(
        select(CombatCombatant).where(
            CombatCombatant.combat_id == combat_id,
            CombatCombatant.entity_type == "character",
            CombatCombatant.entity_id == data.entity_id,
        )
    )
    cc = result.scalar_one_or_none()
    if not cc:
        raise HTTPException(status_code=404, detail="Combatant not found")
    if not cc.pending_roll:
        raise HTTPException(status_code=400, detail="No pending initiative roll for this combatant")

    seq_base = await _reserve_seq(db, combat_id, 1)
    cc.initiative = data.initiative
    cc.roll_seq = seq_base + 1
    cc.pending_roll = 0

    await db.commit()
    combatants = await _combatants(db, combat_id)
    return _to_response(combat, combatants)


@router.get(
    "/campaigns/{campaign_id}/scenes/{scene_id}/combat/pending/{character_id}",
)
async def get_pending_roll(
    campaign_id: str,
    scene_id: str,
    character_id: str,
    db: AsyncSession = Depends(get_session),
):
    """Prompt activo para el POV de un jugador: None si no hay nada que tirar."""
    combat = await _get_active(db, campaign_id, scene_id)
    if not combat or combat.status != "active":
        return None

    result = await db.execute(
        select(CombatCombatant).where(
            CombatCombatant.combat_id == combat.id,
            CombatCombatant.entity_type == "character",
            CombatCombatant.entity_id == character_id,
            CombatCombatant.pending_roll == 1,
        )
    )
    cc = result.scalar_one_or_none()
    if not cc:
        return None
    return {
        "combat_id": combat.id,
        "campaign_id": combat.campaign_id,
        "scene_id": combat.scene_id,
        "entity_type": cc.entity_type,
        "entity_id": cc.entity_id,
    }


@router.post(
    "/campaigns/{campaign_id}/combat/{combat_id}/next",
    response_model=CombatResponse,
)
async def next_turn(
    campaign_id: str,
    combat_id: str,
    db: AsyncSession = Depends(get_session),
):
    combat = await _get_combat(db, campaign_id, combat_id)
    if combat.status != "active":
        raise HTTPException(status_code=400, detail="Combat is not active")

    n_r = await db.execute(
        select(func.count()).select_from(CombatCombatant).where(
            CombatCombatant.combat_id == combat_id
        )
    )
    n = n_r.scalar() or 0
    if n == 0:
        raise HTTPException(status_code=400, detail="No combatants in combat")

    combat.finished_turns += 1
    await db.commit()
    combatants = await _combatants(db, combat_id)
    return _to_response(combat, combatants)


@router.post(
    "/campaigns/{campaign_id}/combat/{combat_id}/end",
    response_model=CombatResponse,
)
async def end_combat(
    campaign_id: str,
    combat_id: str,
    db: AsyncSession = Depends(get_session),
):
    combat = await _get_combat(db, campaign_id, combat_id)
    if combat.status != "active":
        raise HTTPException(status_code=400, detail="Combat is not active")

    combat.status = "ended"
    await db.commit()
    combatants = await _combatants(db, combat_id)
    return _to_response(combat, combatants)