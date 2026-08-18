from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class CampaignCreate(BaseModel):
    name: str
    description: str = ""
    settings_json: dict = {}


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    settings_json: Optional[dict] = None


class CampaignResponse(BaseModel):
    id: str
    name: str
    description: str
    created_at: datetime
    updated_at: datetime
    current_session_id: Optional[str] = None
    current_location_id: Optional[str] = None
    settings_json: dict

    class Config:
        from_attributes = True


class CampaignExport(BaseModel):
    campaign: CampaignResponse
    sessions: list[dict] = []
    characters: list[dict] = []
    npcs: list[dict] = []
    locations: list[dict] = []
    events: list[dict] = []
    relationships: list[dict] = []


class CampaignImport(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    settings_json: dict = {}
    sessions: list[dict] = []
    characters: list[dict] = []
    npcs: list[dict] = []
    locations: list[dict] = []
    events: list[dict] = []
    relationships: list[dict] = []


class CharacterCreate(BaseModel):
    name: str
    type: str = "player"
    description: str = ""
    class_name: str = ""
    race: str = ""
    status: str = "alive"
    current_location_id: Optional[str] = None
    visual_config_json: dict = {}
    knowledge_scope: str = "PARTY_KNOWN"
    vigor: int = 1
    intelligence: int = 1
    dexterity: int = 1
    cunning: int = 1
    current_pv: Optional[int] = None
    current_pm: Optional[int] = None


class CharacterUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    class_name: Optional[str] = None
    race: Optional[str] = None
    status: Optional[str] = None
    current_location_id: Optional[str] = None
    visual_config_json: Optional[dict] = None
    knowledge_scope: Optional[str] = None
    vigor: Optional[int] = None
    intelligence: Optional[int] = None
    dexterity: Optional[int] = None
    cunning: Optional[int] = None
    current_pv: Optional[int] = None
    current_pm: Optional[int] = None


class CharacterResponse(BaseModel):
    id: str
    campaign_id: str
    name: str
    type: str
    description: str
    class_: str
    race: str
    status: str
    current_location_id: Optional[str] = None
    visual_config_json: dict
    knowledge_scope: str
    vigor: int
    intelligence: int
    dexterity: int
    cunning: int
    max_pv: int
    max_pm: int
    defense: int
    current_pv: Optional[int] = None
    current_pm: Optional[int] = None

    class Config:
        from_attributes = True


class NPCCreate(BaseModel):
    name: str
    description: str = ""
    status: str = "alive"
    current_location_id: Optional[str] = None
    faction_id: Optional[str] = None
    knowledge_scope: str = "PARTY_KNOWN"
    visual_config_json: dict = {}
    vigor: int = 1
    intelligence: int = 1
    dexterity: int = 1
    cunning: int = 1
    current_pv: Optional[int] = None
    current_pm: Optional[int] = None


class NPCUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    current_location_id: Optional[str] = None
    faction_id: Optional[str] = None
    knowledge_scope: Optional[str] = None
    visual_config_json: Optional[dict] = None
    vigor: Optional[int] = None
    intelligence: Optional[int] = None
    dexterity: Optional[int] = None
    cunning: Optional[int] = None
    current_pv: Optional[int] = None
    current_pm: Optional[int] = None


class NPCResponse(BaseModel):
    id: str
    campaign_id: str
    name: str
    description: str
    status: str
    current_location_id: Optional[str] = None
    faction_id: Optional[str] = None
    knowledge_scope: str
    visual_config_json: dict
    vigor: int
    intelligence: int
    dexterity: int
    cunning: int
    max_pv: int
    max_pm: int
    defense: int
    current_pv: Optional[int] = None
    current_pm: Optional[int] = None

    class Config:
        from_attributes = True


class SessionCreate(BaseModel):
    number: int
    date: str
    title: str = ""
    raw_notes: str = ""
    summary: str = ""


class SessionUpdate(BaseModel):
    number: Optional[int] = None
    date: Optional[str] = None
    title: Optional[str] = None
    raw_notes: Optional[str] = None
    summary: Optional[str] = None
    status: Optional[str] = None


class SessionResponse(BaseModel):
    id: str
    campaign_id: str
    number: int
    date: str
    title: str
    raw_notes: str
    summary: str
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
