from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from database import get_session
from models import Campaign, Session, Character, NPC, Location, Event, Relationship
from schemas import (
    CampaignCreate,
    CampaignUpdate,
    CampaignResponse,
    CampaignExport,
    CampaignImport,
)

campaigns_router = APIRouter(tags=["campaigns"])


@campaigns_router.post("/campaigns", response_model=CampaignResponse)
async def create_campaign(
    data: CampaignCreate,
    db: AsyncSession = Depends(get_session),
):
    campaign = Campaign(
        name=data.name,
        description=data.description,
        settings_json=data.settings_json,
    )
    db.add(campaign)
    await db.commit()
    await db.refresh(campaign)
    return campaign


@campaigns_router.get("/campaigns", response_model=list[CampaignResponse])
async def list_campaigns(db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(Campaign).order_by(Campaign.updated_at.desc()))
    return result.scalars().all()


@campaigns_router.get("/campaigns/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(
    campaign_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@campaigns_router.put("/campaigns/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    campaign_id: str,
    data: CampaignUpdate,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if data.name is not None:
        campaign.name = data.name
    if data.description is not None:
        campaign.description = data.description
    if data.settings_json is not None:
        campaign.settings_json = data.settings_json

    await db.commit()
    await db.refresh(campaign)
    return campaign


@campaigns_router.delete("/campaigns/{campaign_id}")
async def delete_campaign(
    campaign_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    await db.delete(campaign)
    await db.commit()
    return {"status": "deleted", "id": campaign_id}


@campaigns_router.get("/campaigns/{campaign_id}/export")
async def export_campaign(
    campaign_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    sessions_r = await db.execute(
        select(Session).where(Session.campaign_id == campaign_id)
    )
    characters_r = await db.execute(
        select(Character).where(Character.campaign_id == campaign_id)
    )
    npcs_r = await db.execute(
        select(NPC).where(NPC.campaign_id == campaign_id)
    )
    locations_r = await db.execute(
        select(Location).where(Location.campaign_id == campaign_id)
    )
    events_r = await db.execute(
        select(Event).where(Event.campaign_id == campaign_id)
    )
    relationships_r = await db.execute(
        select(Relationship).where(Relationship.campaign_id == campaign_id)
    )

    def to_dict(obj):
        return {c.name: getattr(obj, c.name) for c in obj.__table__.columns}

    return CampaignExport(
        campaign=CampaignResponse.model_validate(campaign),
        sessions=[to_dict(s) for s in sessions_r.scalars().all()],
        characters=[to_dict(c) for c in characters_r.scalars().all()],
        npcs=[to_dict(n) for n in npcs_r.scalars().all()],
        locations=[to_dict(l) for l in locations_r.scalars().all()],
        events=[to_dict(e) for e in events_r.scalars().all()],
        relationships=[to_dict(r) for r in relationships_r.scalars().all()],
    )


@campaigns_router.post("/campaigns/import", response_model=CampaignResponse)
async def import_campaign(
    data: CampaignImport,
    db: AsyncSession = Depends(get_session),
):
    campaign = Campaign(
        name=data.name or "Imported Campaign",
        description=data.description or "",
        settings_json=data.settings_json,
    )
    db.add(campaign)
    await db.flush()

    id_map: dict[str, str] = {}

    for s in data.sessions:
        old_id = s.get("id", "")
        new_session = Session(
            campaign_id=campaign.id,
            number=s.get("number", 0),
            date=s.get("date", ""),
            title=s.get("title", ""),
            raw_notes=s.get("raw_notes", ""),
            summary=s.get("summary", ""),
            status=s.get("status", "DRAFT"),
        )
        db.add(new_session)
        await db.flush()
        id_map[old_id] = new_session.id

    for c in data.characters:
        old_id = c.get("id", "")
        new_char = Character(
            campaign_id=campaign.id,
            name=c.get("name", ""),
            type=c.get("type", "player"),
            description=c.get("description", ""),
            class_=c.get("class", ""),
            race=c.get("race", ""),
            status=c.get("status", "alive"),
            current_location_id=c.get("current_location_id"),
            visual_config_json=c.get("visual_config_json", {}),
            knowledge_scope=c.get("knowledge_scope", "PARTY_KNOWN"),
            vigor=c.get("vigor", 1),
            intelligence=c.get("intelligence", 1),
            dexterity=c.get("dexterity", 1),
            cunning=c.get("cunning", 1),
            current_pv=c.get("current_pv"),
            current_pm=c.get("current_pm"),
        )
        db.add(new_char)
        await db.flush()
        id_map[old_id] = new_char.id

    for n in data.npcs:
        old_id = n.get("id", "")
        new_npc = NPC(
            campaign_id=campaign.id,
            name=n.get("name", ""),
            description=n.get("description", ""),
            status=n.get("status", "alive"),
            current_location_id=n.get("current_location_id"),
            faction_id=n.get("faction_id"),
            knowledge_scope=n.get("knowledge_scope", "PARTY_KNOWN"),
            visual_config_json=n.get("visual_config_json", {}),
            vigor=n.get("vigor", 1),
            intelligence=n.get("intelligence", 1),
            dexterity=n.get("dexterity", 1),
            cunning=n.get("cunning", 1),
            current_pv=n.get("current_pv"),
            current_pm=n.get("current_pm"),
        )
        db.add(new_npc)
        await db.flush()
        id_map[old_id] = new_npc.id

    for loc in data.locations:
        old_id = loc.get("id", "")
        parent = loc.get("parent_location_id")
        new_loc = Location(
            campaign_id=campaign.id,
            name=loc.get("name", ""),
            type=loc.get("type", "custom"),
            description=loc.get("description", ""),
            parent_location_id=id_map.get(parent, parent),
            status=loc.get("status", "ACTIVE"),
            coordinates_json=loc.get("coordinates_json", {}),
            scene_id=loc.get("scene_id"),
        )
        db.add(new_loc)
        await db.flush()
        id_map[old_id] = new_loc.id

    for e in data.events:
        new_event = Event(
            campaign_id=campaign.id,
            session_id=id_map.get(e.get("session_id", ""), e.get("session_id", "")),
            type=e.get("type", ""),
            actor_id=id_map.get(e.get("actor_id", ""), e.get("actor_id", "")),
            target_id=e.get("target_id"),
            location_id=e.get("location_id"),
            description=e.get("description", ""),
            confidence=e.get("confidence", 1.0),
            status=e.get("status", "PROPOSED"),
            source_id=e.get("source_id"),
        )
        db.add(new_event)

    for r in data.relationships:
        new_rel = Relationship(
            campaign_id=campaign.id,
            source_entity_id=id_map.get(
                r.get("source_entity_id", ""),
                r.get("source_entity_id", ""),
            ),
            target_entity_id=id_map.get(
                r.get("target_entity_id", ""),
                r.get("target_entity_id", ""),
            ),
            type=r.get("type", ""),
            strength=r.get("strength", 1.0),
            status=r.get("status", "active"),
            source_event_id=r.get("source_event_id"),
        )
        db.add(new_rel)

    await db.commit()
    await db.refresh(campaign)
    return campaign
