from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from database import get_session
from models import (
    Campaign,
    Session,
    Character,
    NPC,
    Location,
    Event,
    Relationship,
    Scene,
    SceneCharacter,
    Player,
    Map,
    Asset,
    MapMarker,
    DMNotebook,
    DMNotebookVersion,
    DiceRoll,
)
from schemas import (
    BulkDeleteRequest,
    BulkExportRequest,
    BulkUpdateRequest,
    CampaignCreate,
    CampaignUpdate,
    CampaignResponse,
    CampaignExport,
    CampaignImport,
    SceneResponse,
    SceneCharacterResponse,
    CharacterResponse,
    NPCResponse,
)
import secrets
import hashlib

campaigns_router = APIRouter(tags=["campaigns"])


async def compute_player_revision(db: AsyncSession, campaign_id: str) -> str:
    scenes_r = await db.execute(
        select(
            Scene.id, Scene.name, Scene.status, Scene.background_path,
            Scene.lighting, Scene.updated_at,
        ).where(Scene.campaign_id == campaign_id).order_by(Scene.id)
    )
    parts = [repr(tuple(r)) for r in scenes_r.all()]

    chars_r = await db.execute(
        select(
            Character.id, Character.name, Character.type, Character.portrait_path,
            Character.current_pv, Character.current_pm,
        ).where(Character.campaign_id == campaign_id).order_by(Character.id)
    )
    parts.extend(repr(tuple(r)) for r in chars_r.all())

    npcs_r = await db.execute(
        select(
            NPC.id, NPC.name, NPC.portrait_path, NPC.current_pv, NPC.current_pm,
        ).where(NPC.campaign_id == campaign_id).order_by(NPC.id)
    )
    parts.extend(repr(tuple(r)) for r in npcs_r.all())

    sc_r = await db.execute(
        select(
            SceneCharacter.id, SceneCharacter.scene_id, SceneCharacter.entity_type,
            SceneCharacter.entity_id, SceneCharacter.x, SceneCharacter.y,
            SceneCharacter.z, SceneCharacter.visible, SceneCharacter.order,
            SceneCharacter.rotation,
        )
        .join(Scene, Scene.id == SceneCharacter.scene_id)
        .where(Scene.campaign_id == campaign_id)
        .order_by(SceneCharacter.id)
    )
    parts.extend(repr(tuple(r)) for r in sc_r.all())

    rolls_r = await db.execute(
        select(DiceRoll.id, DiceRoll.created_at)
        .where(DiceRoll.campaign_id == campaign_id)
        .order_by(DiceRoll.created_at.desc())
        .limit(1)
    )
    last_roll = rolls_r.first()
    if last_roll:
        parts.append(repr(tuple(last_roll)))

    return hashlib.sha1("|".join(parts).encode()).hexdigest()[:16]


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

    notebooks_r = await db.execute(
        select(DMNotebook).where(DMNotebook.campaign_id == campaign_id)
    )
    for nb in notebooks_r.scalars().all():
        versions_r = await db.execute(
            select(DMNotebookVersion).where(DMNotebookVersion.notebook_id == nb.id)
        )
        for version in versions_r.scalars().all():
            await db.delete(version)
        await db.delete(nb)

    scenes_r = await db.execute(select(Scene).where(Scene.campaign_id == campaign_id))
    for scene in scenes_r.scalars().all():
        scene_chars_r = await db.execute(
            select(SceneCharacter).where(SceneCharacter.scene_id == scene.id)
        )
        for scene_char in scene_chars_r.scalars().all():
            await db.delete(scene_char)
        await db.delete(scene)

    maps_r = await db.execute(select(Map).where(Map.campaign_id == campaign_id))
    for map_ in maps_r.scalars().all():
        markers_r = await db.execute(
            select(MapMarker).where(MapMarker.map_id == map_.id)
        )
        for marker in markers_r.scalars().all():
            await db.delete(marker)
        await db.delete(map_)

    for model in (Event, Relationship, Location, NPC, Character, Player, Session, Asset, DiceRoll):
        rows_r = await db.execute(
            select(model).where(model.campaign_id == campaign_id)
        )
        for row in rows_r.scalars().all():
            await db.delete(row)

    await db.delete(campaign)
    await db.commit()
    return {"status": "deleted", "id": campaign_id}


@campaigns_router.post("/campaigns/bulk-delete")
async def bulk_delete_campaigns(
    body: BulkDeleteRequest,
    db: AsyncSession = Depends(get_session),
):
    deleted = []
    for cid in body.ids:
        result = await db.execute(
            select(Campaign).where(Campaign.id == cid)
        )
        campaign = result.scalar_one_or_none()
        if not campaign:
            continue

        notebooks_r = await db.execute(
            select(DMNotebook).where(DMNotebook.campaign_id == cid)
        )
        for nb in notebooks_r.scalars().all():
            versions_r = await db.execute(
                select(DMNotebookVersion).where(DMNotebookVersion.notebook_id == nb.id)
            )
            for version in versions_r.scalars().all():
                await db.delete(version)
            await db.delete(nb)

        scenes_r = await db.execute(select(Scene).where(Scene.campaign_id == cid))
        for scene in scenes_r.scalars().all():
            scene_chars_r = await db.execute(
                select(SceneCharacter).where(SceneCharacter.scene_id == scene.id)
            )
            for scene_char in scene_chars_r.scalars().all():
                await db.delete(scene_char)
            await db.delete(scene)

        maps_r = await db.execute(select(Map).where(Map.campaign_id == cid))
        for map_ in maps_r.scalars().all():
            markers_r = await db.execute(
                select(MapMarker).where(MapMarker.map_id == map_.id)
            )
            for marker in markers_r.scalars().all():
                await db.delete(marker)
            await db.delete(map_)

        for model in (Event, Relationship, Location, NPC, Character, Player, Session, Asset, DiceRoll):
            rows_r = await db.execute(
                select(model).where(model.campaign_id == cid)
            )
            for row in rows_r.scalars().all():
                await db.delete(row)

        await db.delete(campaign)
        deleted.append(cid)

    await db.commit()
    return {"deleted": deleted}


@campaigns_router.post("/campaigns/bulk-update")
async def bulk_update_campaigns(
    body: BulkUpdateRequest,
    db: AsyncSession = Depends(get_session),
):
    updated = []
    for cid in body.ids:
        result = await db.execute(
            select(Campaign).where(Campaign.id == cid)
        )
        campaign = result.scalar_one_or_none()
        if not campaign:
            continue
        if body.name is not None:
            campaign.name = body.name
        if body.description is not None:
            campaign.description = body.description
        updated.append(cid)

    await db.commit()
    return {"updated": updated}


@campaigns_router.post("/campaigns/bulk-export")
async def bulk_export_campaigns(
    body: BulkExportRequest,
    db: AsyncSession = Depends(get_session),
):
    exports = []
    for cid in body.ids:
        result = await db.execute(
            select(Campaign).where(Campaign.id == cid)
        )
        campaign = result.scalar_one_or_none()
        if not campaign:
            continue

        sessions_r = await db.execute(
            select(Session).where(Session.campaign_id == cid)
        )
        characters_r = await db.execute(
            select(Character).where(Character.campaign_id == cid)
        )
        npcs_r = await db.execute(
            select(NPC).where(NPC.campaign_id == cid)
        )
        locations_r = await db.execute(
            select(Location).where(Location.campaign_id == cid)
        )
        events_r = await db.execute(
            select(Event).where(Event.campaign_id == cid)
        )
        relationships_r = await db.execute(
            select(Relationship).where(Relationship.campaign_id == cid)
        )

        exports.append({
            "campaign": CampaignResponse.model_validate(campaign).model_dump(mode="json"),
            "sessions": [dict(r._mapping) for r in sessions_r.all()],
            "characters": [dict(r._mapping) for r in characters_r.all()],
            "npcs": [dict(r._mapping) for r in npcs_r.all()],
            "locations": [dict(r._mapping) for r in locations_r.all()],
            "events": [dict(r._mapping) for r in events_r.all()],
            "relationships": [dict(r._mapping) for r in relationships_r.all()],
        })

    return {"campaigns": exports}


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
            vigor=c.get("vigor", "/"),
            intelligence=c.get("intelligence", "/"),
            dexterity=c.get("dexterity", "/"),
            cunning=c.get("cunning", "/"),
            max_pv=c.get("max_pv", 10),
            max_pm=c.get("max_pm", 10),
            defense=c.get("defense", 5),
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
            vigor=n.get("vigor", "/"),
            intelligence=n.get("intelligence", "/"),
            dexterity=n.get("dexterity", "/"),
            cunning=n.get("cunning", "/"),
            max_pv=n.get("max_pv", 10),
            max_pm=n.get("max_pm", 10),
            defense=n.get("defense", 5),
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


@campaigns_router.post("/campaigns/{campaign_id}/invite-code", response_model=CampaignResponse)
async def generate_invite_code(
    campaign_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign.invite_code = secrets.token_urlsafe(8)
    await db.commit()
    await db.refresh(campaign)
    return campaign


@campaigns_router.get("/campaigns/invite/{code}/revision")
async def invite_revision(
    code: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Campaign).where(Campaign.invite_code == code)
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Invalid invite code")

    return {"revision": await compute_player_revision(db, campaign.id)}


@campaigns_router.get("/campaigns/invite/{code}")
async def join_by_invite_code(
    code: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Campaign).where(Campaign.invite_code == code)
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Invalid invite code")

    scenes_r = await db.execute(
        select(Scene).where(Scene.campaign_id == campaign.id)
    )
    scenes = scenes_r.scalars().all()
    active_scene = next((s for s in scenes if s.status == "active"), scenes[0] if scenes else None)

    characters_r = await db.execute(
        select(Character).where(Character.campaign_id == campaign.id)
    )
    all_chars = characters_r.scalars().all()
    npcs_r = await db.execute(
        select(NPC).where(NPC.campaign_id == campaign.id)
    )
    all_entities = {
        **{c.id: c for c in all_chars},
        **{n.id: n for n in npcs_r.scalars().all()},
    }

    player_characters = [
        {
            "id": c.id,
            "name": c.name,
            "race": c.race,
            "class_name": c.class_,
            "portrait_path": c.portrait_path,
            "model_path": c.model_path,
        }
        for c in all_chars
        if c.type == "player"
    ]

    scene_chars = []
    scene_name = ""
    background_path = None
    lighting = "neutral"
    if active_scene:
        scene_name = active_scene.name
        background_path = active_scene.background_path
        lighting = active_scene.lighting
        sc_r = await db.execute(
            select(SceneCharacter).where(
                SceneCharacter.scene_id == active_scene.id,
                SceneCharacter.visible == 1,
            )
        )
        for sc in sc_r.scalars().all():
            ent = all_entities.get(sc.entity_id)
            if ent:
                scene_chars.append({
                    "id": sc.id,
                    "entity_id": sc.entity_id,
                    "name": ent.name,
                    "type": "character" if isinstance(ent, Character) else "npc",
                    "x": sc.x,
                    "y": sc.y,
                    "z": sc.z,
                    "rotation": getattr(sc, 'rotation', 0.0),
                    "portrait_path": ent.portrait_path,
                    "model_path": getattr(ent, 'model_path', None),
                })

    return {
        "campaign_id": campaign.id,
        "campaign_name": campaign.name,
        "scene_id": active_scene.id if active_scene else None,
        "scene_name": scene_name,
        "background_path": background_path,
        "lighting": lighting,
        "characters": scene_chars,
        "player_characters": player_characters,
    }


@campaigns_router.post("/campaigns/{campaign_id}/locations")
async def create_location(
    campaign_id: str,
    data: dict,
    db: AsyncSession = Depends(get_session),
):
    campaign = (await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )).scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    loc = Location(
        campaign_id=campaign_id,
        name=data.get("name", ""),
        type=data.get("type", "custom"),
        description=data.get("description", ""),
    )
    db.add(loc)
    await db.commit()
    return {"id": loc.id, "name": loc.name}
