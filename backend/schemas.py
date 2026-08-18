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
