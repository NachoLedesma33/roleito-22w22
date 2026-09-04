export interface Campaign {
  id: string
  name: string
  description: string
  created_at: string
  updated_at: string
  current_session_id: string | null
  current_location_id: string | null
  settings_json: Record<string, unknown>
}

export interface Session {
  id: string
  campaign_id: string
  number: number
  date: string
  title: string
  raw_notes: string
  summary: string
  status: SessionStatus
  created_at: string
  updated_at: string
}

export type SessionStatus = 'DRAFT' | 'IMPORTED' | 'PROCESSING' | 'REVIEW' | 'APPROVED' | 'ARCHIVED'

export type VidaAttr = '+' | '/' | '-'

export interface VidaAttributes {
  vigor: VidaAttr
  intelligence: VidaAttr
  dexterity: VidaAttr
  cunning: VidaAttr
}

export interface VidaStats {
  max_pv: number
  max_pm: number
  defense: number
}

export interface VidaState {
  current_pv: number
  current_pm: number
}

export interface Character {
  id: string
  campaign_id: string
  name: string
  type: string
  description: string
  class: string
  race: string
  status: string
  current_location_id: string | null
  visual_config_json: Record<string, unknown>
  knowledge_scope: KnowledgeScope
  vida_attributes: VidaAttributes
  vida_stats: VidaStats
  vida_state: VidaState
}

export interface NPC {
  id: string
  campaign_id: string
  name: string
  description: string
  status: string
  current_location_id: string | null
  faction_id: string | null
  knowledge_scope: KnowledgeScope
  visual_config_json: Record<string, unknown>
  vida_attributes: VidaAttributes
  vida_stats: VidaStats
  vida_state: VidaState
}

export interface Location {
  id: string
  campaign_id: string
  name: string
  type: string
  description: string
  parent_location_id: string | null
  status: LocationStatus
  coordinates_json: Record<string, unknown>
  scene_id: string | null
}

export type LocationStatus = 'ACTIVE' | 'ARCHIVED' | 'HISTORICAL' | 'UNKNOWN'

export interface Faction {
  id: string
  campaign_id: string
  name: string
  description: string
  status: string
}

export interface InventoryItem {
  id: string
  campaign_id: string
  name: string
  description: string
  owner_entity_id: string | null
  status: string
}

export interface Quest {
  id: string
  campaign_id: string
  name: string
  description: string
  status: QuestStatus
  priority: number
}

export type QuestStatus = 'UNKNOWN' | 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'ABANDONED' | 'HIDDEN'

export interface Event {
  id: string
  campaign_id: string
  session_id: string
  type: EventType
  actor_id: string
  target_id: string | null
  location_id: string | null
  description: string
  confidence: number
  status: CanonStatus
  source_id: string
}

export type EventType =
  | 'CHARACTER_CREATED' | 'CHARACTER_DIED' | 'CHARACTER_INJURED' | 'CHARACTER_MOVED'
  | 'NPC_INTRODUCED' | 'NPC_DIED' | 'NPC_MOVED' | 'NPC_RELATIONSHIP_CHANGED'
  | 'LOCATION_DISCOVERED' | 'LOCATION_DESTROYED' | 'LOCATION_CHANGED'
  | 'ITEM_CREATED' | 'ITEM_FOUND' | 'ITEM_STOLEN' | 'ITEM_DESTROYED' | 'ITEM_TRANSFERRED'
  | 'QUEST_STARTED' | 'QUEST_UPDATED' | 'QUEST_COMPLETED' | 'QUEST_FAILED'
  | 'FACTION_RELATIONSHIP_CHANGED'
  | 'COMBAT_STARTED' | 'COMBAT_ENDED'
  | 'DISCOVERY' | 'DECISION' | 'DIALOGUE' | 'RUMOR' | 'REVELATION' | 'WORLD_CHANGE'

export type CanonStatus = 'CANON' | 'PROPOSED' | 'UNCONFIRMED' | 'CONTRADICTORY' | 'REJECTED' | 'DM_ONLY'

export type KnowledgeScope = 'DM_ONLY' | 'PARTY_KNOWN' | 'CHARACTER_KNOWN' | 'PUBLIC' | 'SECRET' | 'UNKNOWN'

export interface Relationship {
  id: string
  campaign_id: string
  source_entity_id: string
  target_entity_id: string
  type: RelationshipType
  strength: number
  status: string
  source_event_id: string | null
  created_at: string
  updated_at: string
}

export type RelationshipType =
  | 'KNOWS' | 'FRIEND_OF' | 'ENEMY_OF' | 'ALLY_OF' | 'MEMBER_OF'
  | 'OWNS' | 'LOCATED_AT' | 'WORKS_FOR' | 'HATES' | 'LOVES'
  | 'SUSPECTS' | 'DISCOVERED' | 'KILLED' | 'STOLE_FROM' | 'QUEST_FOR'

// ─── Scene Graph Types ───────────────────────────────────────────

export enum SceneLayer {
  TERRAIN = 0,
  MAP = 1,
  EFFECTS_BELOW = 2,
  TOKENS = 3,
  EFFECTS_ABOVE = 4,
  OVERLAY = 5,
  FOG = 6,
}

export interface SceneItem {
  id: string
  name: string

  // Transform
  x: number
  y: number
  rotation: number
  scale: number

  // Dimensions
  width: number
  height: number

  // Visual
  image?: string
  tint?: string
  opacity?: number

  // Sorting
  layer: SceneLayer
  zIndex: number

  // State
  visible: boolean
  locked: boolean

  // Hit testing
  disableHit: boolean

  // Z-index management
  disableAutoZIndex: boolean

  // Attachments
  attachmentIds: string[]
  disableAttachmentBehavior: AttachmentBehavior[]

  // Metadata
  metadata: ItemMetadata

  // Shape (for non-image items)
  shape?: ItemShape
}

export type AttachmentBehavior = 'position' | 'rotation' | 'scale'

export type ItemShape =
  | { type: 'rectangle'; fill: string; stroke?: string; strokeWidth?: number }
  | { type: 'ellipse'; fill: string; stroke?: string; strokeWidth?: number }
  | { type: 'polygon'; points: number[]; fill: string; stroke?: string }
  | { type: 'line'; points: number[]; stroke: string; strokeWidth: number }
  | { type: 'text'; text: string; fontSize: number; fontFamily: string; color: string }

export type ItemMetadata =
  | TokenMetadata
  | WallMetadata
  | DoorMetadata
  | TerrainMetadata
  | EffectMetadata
  | LabelMetadata
  | FogMetadata
  | RoomMetadata

export interface TokenMetadata {
  type: 'token'
  characterId: string
  ownerId: string
}

export interface WallMetadata {
  type: 'wall'
  wallType: 'solid' | 'door' | 'window'
  material: 'stone' | 'wood' | 'metal' | 'glass' | 'magic'
  height: number
  thickness: number
  opacity: number
  lineOfSight: boolean
  movement: boolean
  soundOcclusion: number
}

export interface DoorMetadata {
  type: 'door'
  state: 'open' | 'closed' | 'locked'
  material: 'wood' | 'metal' | 'glass' | 'magic'
  keyId?: string
  autoClose: boolean
}

export interface TerrainMetadata {
  type: 'terrain'
  terrainType: string
  movementCost: number
}

export interface EffectMetadata {
  type: 'effect'
  effectType: string
  duration?: number
}

export interface LabelMetadata {
  type: 'label'
  text: string
  fontSize: number
  color: string
}

export interface FogMetadata {
  type: 'fog'
  fogType: 'static' | 'dynamic'
  cutMask?: string
}

export interface RoomMetadata {
  type: 'room'
  roomId: string
  name: string
  description: string
}
