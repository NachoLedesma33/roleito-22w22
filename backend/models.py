from sqlalchemy import Column, String, Integer, Float, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import DeclarativeBase, relationship
from datetime import datetime
import uuid


def gen_id() -> str:
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    pass


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    current_session_id = Column(String, nullable=True)
    current_location_id = Column(String, nullable=True)
    settings_json = Column(JSON, default=dict)
    invite_code = Column(String, nullable=True, unique=True)

    sessions = relationship("Session", back_populates="campaign")
    characters = relationship("Character", back_populates="campaign")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, default=gen_id)
    campaign_id = Column(String, ForeignKey("campaigns.id"), nullable=False)
    number = Column(Integer, nullable=False)
    date = Column(String, nullable=False)
    title = Column(String, default="")
    raw_notes = Column(Text, default="")
    summary = Column(Text, default="")
    status = Column(String, default="DRAFT")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    campaign = relationship("Campaign", back_populates="sessions")


class Character(Base):
    __tablename__ = "characters"

    id = Column(String, primary_key=True, default=gen_id)
    campaign_id = Column(String, ForeignKey("campaigns.id"), nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, default="player")
    description = Column(Text, default="")
    class_ = Column("class", String, default="")
    race = Column(String, default="")
    status = Column(String, default="alive")
    current_location_id = Column(String, nullable=True)
    visual_config_json = Column(JSON, default=dict)
    knowledge_scope = Column(String, default="PARTY_KNOWN")
    portrait_path = Column(String, nullable=True)

    vigor = Column(String, default="/")
    intelligence = Column(String, default="/")
    dexterity = Column(String, default="/")
    cunning = Column(String, default="/")
    max_pv = Column(Integer, default=10)
    max_pm = Column(Integer, default=10)
    defense = Column(Integer, default=5)
    current_pv = Column(Integer, nullable=True)
    current_pm = Column(Integer, nullable=True)
    inventory_json = Column(JSON, default=list)
    spells_json = Column(JSON, default=list)

    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    campaign = relationship("Campaign", back_populates="characters")


class NPC(Base):
    __tablename__ = "npcs"

    id = Column(String, primary_key=True, default=gen_id)
    campaign_id = Column(String, ForeignKey("campaigns.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    status = Column(String, default="alive")
    current_location_id = Column(String, nullable=True)
    faction_id = Column(String, nullable=True)
    knowledge_scope = Column(String, default="PARTY_KNOWN")
    visual_config_json = Column(JSON, default=dict)
    portrait_path = Column(String, nullable=True)

    vigor = Column(String, default="/")
    intelligence = Column(String, default="/")
    dexterity = Column(String, default="/")
    cunning = Column(String, default="/")
    max_pv = Column(Integer, default=10)
    max_pm = Column(Integer, default=10)
    defense = Column(Integer, default=5)
    current_pv = Column(Integer, nullable=True)
    current_pm = Column(Integer, nullable=True)
    inventory_json = Column(JSON, default=list)
    spells_json = Column(JSON, default=list)

    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Location(Base):
    __tablename__ = "locations"

    id = Column(String, primary_key=True, default=gen_id)
    campaign_id = Column(String, ForeignKey("campaigns.id"), nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, default="custom")
    description = Column(Text, default="")
    parent_location_id = Column(String, nullable=True)
    status = Column(String, default="ACTIVE")
    coordinates_json = Column(JSON, default=dict)
    scene_id = Column(String, nullable=True)


class Event(Base):
    __tablename__ = "events"

    id = Column(String, primary_key=True, default=gen_id)
    campaign_id = Column(String, ForeignKey("campaigns.id"), nullable=False)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False)
    type = Column(String, nullable=False)
    actor_id = Column(String, nullable=False)
    target_id = Column(String, nullable=True)
    location_id = Column(String, nullable=True)
    description = Column(Text, default="")
    confidence = Column(Float, default=1.0)
    status = Column(String, default="PROPOSED")
    source_id = Column(String, nullable=True)


class Relationship(Base):
    __tablename__ = "relationships"

    id = Column(String, primary_key=True, default=gen_id)
    campaign_id = Column(String, ForeignKey("campaigns.id"), nullable=False)
    source_entity_id = Column(String, nullable=False)
    target_entity_id = Column(String, nullable=False)
    type = Column(String, nullable=False)
    strength = Column(Float, default=1.0)
    status = Column(String, default="active")
    source_event_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Player(Base):
    __tablename__ = "players"

    id = Column(String, primary_key=True, default=gen_id)
    campaign_id = Column(String, ForeignKey("campaigns.id"), nullable=False)
    name = Column(String, nullable=False)
    character_id = Column(String, ForeignKey("characters.id"), nullable=True)
    role = Column(String, default="player")
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)


class Map(Base):
    __tablename__ = "maps"

    id = Column(String, primary_key=True, default=gen_id)
    campaign_id = Column(String, ForeignKey("campaigns.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    file_path = Column(String, nullable=False)
    thumbnail_path = Column(String, nullable=True)
    map_type = Column(String, default="world")
    created_at = Column(DateTime, default=datetime.utcnow)


class Asset(Base):
    __tablename__ = "assets"

    id = Column(String, primary_key=True, default=gen_id)
    campaign_id = Column(String, ForeignKey("campaigns.id"), nullable=False)
    name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    asset_type = Column(String, default="image")
    entity_type = Column(String, nullable=True)
    entity_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Scene(Base):
    __tablename__ = "scenes"

    id = Column(String, primary_key=True, default=gen_id)
    campaign_id = Column(String, ForeignKey("campaigns.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    background_path = Column(String, nullable=True)
    map_id = Column(String, ForeignKey("maps.id"), nullable=True)
    lighting = Column(String, default="neutral")
    audio_path = Column(String, nullable=True)
    status = Column(String, default="inactive")
    notes = Column(Text, default="")
    entrance_x = Column(Float, default=0.0)
    entrance_z = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SceneCharacter(Base):
    __tablename__ = "scene_characters"

    id = Column(String, primary_key=True, default=gen_id)
    scene_id = Column(String, ForeignKey("scenes.id"), nullable=False)
    entity_type = Column(String, nullable=False)
    entity_id = Column(String, nullable=False)
    x = Column(Float, default=0.0)
    y = Column(Float, default=0.0)
    z = Column(Float, default=0.0)
    visible = Column(Integer, default=1)
    order = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class MapMarker(Base):
    __tablename__ = "map_markers"

    id = Column(String, primary_key=True, default=gen_id)
    map_id = Column(String, ForeignKey("maps.id"), nullable=False)
    label = Column(String, default="")
    marker_type = Column(String, default="poi")
    target_scene_id = Column(String, nullable=True)
    x = Column(Float, default=0.5)
    y = Column(Float, default=0.5)
    color = Column(String, default="#60a5fa")
    description = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)


class DMNotebook(Base):
    __tablename__ = "dm_notebooks"

    id = Column(String, primary_key=True, default=gen_id)
    campaign_id = Column(String, ForeignKey("campaigns.id"), nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, default="")
    category = Column(String, default="notes")
    pinned = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class DMNotebookVersion(Base):
    __tablename__ = "dm_notebook_versions"

    id = Column(String, primary_key=True, default=gen_id)
    notebook_id = Column(String, ForeignKey("dm_notebooks.id"), nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, default="")
    version_number = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
