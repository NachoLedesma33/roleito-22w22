from pydantic import BaseModel, Field
from datetime import datetime
from typing import Literal, Optional

VidaAttr = Literal["+", "/", "-"]


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
    invite_code: Optional[str] = None

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
    vigor: VidaAttr = "/"
    intelligence: VidaAttr = "/"
    dexterity: VidaAttr = "/"
    cunning: VidaAttr = "/"
    max_pv: Optional[int] = None
    max_pm: Optional[int] = None
    defense: Optional[int] = None
    current_pv: Optional[int] = None
    current_pm: Optional[int] = None
    inventory_json: list = []
    spells_json: list = []
    player_notes: str = ""


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
    vigor: Optional[VidaAttr] = None
    intelligence: Optional[VidaAttr] = None
    dexterity: Optional[VidaAttr] = None
    cunning: Optional[VidaAttr] = None
    max_pv: Optional[int] = None
    max_pm: Optional[int] = None
    defense: Optional[int] = None
    current_pv: Optional[int] = None
    current_pm: Optional[int] = None
    inventory_json: Optional[list] = None
    spells_json: Optional[list] = None
    player_notes: Optional[str] = None


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
    portrait_path: Optional[str] = None
    model_path: Optional[str] = None
    vigor: VidaAttr
    intelligence: VidaAttr
    dexterity: VidaAttr
    cunning: VidaAttr
    max_pv: int
    max_pm: int
    defense: int
    current_pv: Optional[int] = None
    current_pm: Optional[int] = None
    inventory_json: list = []
    spells_json: list = []
    player_notes: str = ""

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
    vigor: VidaAttr = "/"
    intelligence: VidaAttr = "/"
    dexterity: VidaAttr = "/"
    cunning: VidaAttr = "/"
    max_pv: Optional[int] = None
    max_pm: Optional[int] = None
    defense: Optional[int] = None
    current_pv: Optional[int] = None
    current_pm: Optional[int] = None
    inventory_json: list = []
    spells_json: list = []


class NPCUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    current_location_id: Optional[str] = None
    faction_id: Optional[str] = None
    knowledge_scope: Optional[str] = None
    visual_config_json: Optional[dict] = None
    vigor: Optional[VidaAttr] = None
    intelligence: Optional[VidaAttr] = None
    dexterity: Optional[VidaAttr] = None
    cunning: Optional[VidaAttr] = None
    max_pv: Optional[int] = None
    max_pm: Optional[int] = None
    defense: Optional[int] = None
    current_pv: Optional[int] = None
    current_pm: Optional[int] = None
    inventory_json: Optional[list] = None
    spells_json: Optional[list] = None


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
    portrait_path: Optional[str] = None
    model_path: Optional[str] = None
    vigor: VidaAttr
    intelligence: VidaAttr
    dexterity: VidaAttr
    cunning: VidaAttr
    max_pv: int
    max_pm: int
    defense: int
    current_pv: Optional[int] = None
    current_pm: Optional[int] = None
    inventory_json: list = []
    spells_json: list = []

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


class EventCreate(BaseModel):
    session_id: str
    type: str
    actor_id: str
    target_id: Optional[str] = None
    location_id: Optional[str] = None
    description: str = ""
    confidence: float = 1.0
    source_id: Optional[str] = None


class EventUpdate(BaseModel):
    type: Optional[str] = None
    actor_id: Optional[str] = None
    target_id: Optional[str] = None
    location_id: Optional[str] = None
    description: Optional[str] = None
    confidence: Optional[float] = None
    status: Optional[str] = None


class EventResponse(BaseModel):
    id: str
    campaign_id: str
    session_id: str
    type: str
    actor_id: str
    target_id: Optional[str] = None
    location_id: Optional[str] = None
    description: str
    confidence: float
    status: str
    source_id: Optional[str] = None

    class Config:
        from_attributes = True


class PlayerCreate(BaseModel):
    name: str
    character_id: Optional[str] = None
    role: str = "player"
    notes: str = ""


class PlayerUpdate(BaseModel):
    name: Optional[str] = None
    character_id: Optional[str] = None
    role: Optional[str] = None
    notes: Optional[str] = None


class PlayerResponse(BaseModel):
    id: str
    campaign_id: str
    name: str
    character_id: Optional[str] = None
    role: str
    notes: str
    created_at: datetime

    class Config:
        from_attributes = True


class MapCreate(BaseModel):
    name: str
    description: str = ""
    map_type: str = "world"


class MapResponse(BaseModel):
    id: str
    campaign_id: str
    name: str
    description: str
    file_path: str
    thumbnail_path: Optional[str] = None
    map_type: str
    created_at: datetime

    class Config:
        from_attributes = True


class AssetResponse(BaseModel):
    id: str
    campaign_id: str
    name: str
    file_path: str
    asset_type: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SceneCreate(BaseModel):
    name: str
    description: str = ""
    lighting: str = "neutral"


class SceneUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    lighting: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    entrance_x: Optional[float] = None
    entrance_z: Optional[float] = None
    map_id: Optional[str] = None
    map_scale: Optional[float] = None
    grid_size: Optional[float] = None
    grid_snap: Optional[bool] = None


class SceneCharacterPosition(BaseModel):
    entity_type: str
    entity_id: str
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0
    visible: bool = True
    order: int = 0
    rotation: float = 0.0
    token_scale: float = 1.0
    move_speed: float = 1.0
    brightness: float = 0.0


class SceneResponse(BaseModel):
    id: str
    campaign_id: str
    name: str
    description: str
    background_path: Optional[str] = None
    map_id: Optional[str] = None
    lighting: str
    audio_path: Optional[str] = None
    status: str
    notes: str = ""
    entrance_x: float = 0.0
    entrance_z: float = 0.0
    map_scale: float = 1.0
    grid_size: float = 0.0
    grid_snap: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SceneCharacterResponse(BaseModel):
    id: str
    scene_id: str
    entity_type: str
    entity_id: str
    x: float
    y: float
    z: float
    visible: bool
    order: int
    rotation: float = 0.0
    token_scale: float = 1.0
    move_speed: float = 1.0
    brightness: float = 0.0

    class Config:
        from_attributes = True


class MapMarkerCreate(BaseModel):
    label: str = ""
    marker_type: str = "poi"
    target_scene_id: Optional[str] = None
    x: float = 0.5
    y: float = 0.5
    color: str = "#60a5fa"
    description: str = ""


class MapMarkerUpdate(BaseModel):
    label: Optional[str] = None
    marker_type: Optional[str] = None
    target_scene_id: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None
    color: Optional[str] = None
    description: Optional[str] = None


class MapMarkerResponse(BaseModel):
    id: str
    map_id: str
    label: str
    marker_type: str
    target_scene_id: Optional[str] = None
    x: float
    y: float
    color: str
    description: str
    created_at: datetime

    class Config:
        from_attributes = True


class DMNotebookCreate(BaseModel):
    title: str
    content: str = ""
    category: str = "notes"


class DMNotebookUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    pinned: Optional[int] = None


class DMNotebookResponse(BaseModel):
    id: str
    campaign_id: str
    title: str
    content: str
    category: str
    pinned: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DMNotebookVersionResponse(BaseModel):
    id: str
    notebook_id: str
    title: str
    content: str
    version_number: int
    created_at: datetime

    class Config:
        from_attributes = True


class AISettingsUpdate(BaseModel):
    provider: Literal["mock", "local", "remote"] = "mock"
    local_base_url: str = "http://localhost:11434"
    remote_base_url: str = "https://api.groq.com/openai/v1"
    model: Optional[str] = None
    max_tokens: int = Field(default=512, ge=1, le=8192)
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)


class AISettingsResponse(AISettingsUpdate):
    pass


class AITestRequest(BaseModel):
    prompt: str = "Responde con OK si me estas leyendo."


class TokenUsage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class AITestResponse(BaseModel):
    ok: bool
    provider: str
    model: Optional[str] = None
    response: Optional[str] = None
    latency_ms: Optional[int] = None
    error: Optional[str] = None
    usage: Optional[TokenUsage] = None


class DiceRollCreate(BaseModel):
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    entity_name: Optional[str] = None
    roller_name: str
    dice_type: int = Field(ge=4, le=20)
    count: int = Field(ge=1, le=10)
    results: list[int]
    total: int
    label: Optional[str] = None


class DiceRollResponse(BaseModel):
    id: str
    campaign_id: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    entity_name: Optional[str] = None
    roller_name: str
    dice_type: int
    count: int
    results: list[int]
    total: int
    label: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class BulkDeleteRequest(BaseModel):
    ids: list[str] = Field(..., min_length=1)


class BulkUpdateRequest(BaseModel):
    ids: list[str] = Field(..., min_length=1)
    name: Optional[str] = None
    description: Optional[str] = None


class BulkExportRequest(BaseModel):
    ids: list[str] = Field(..., min_length=1)
