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

export interface VidaAttributes {
  vigor: number
  intelligence: number
  dexterity: number
  cunning: number
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

export function calcStats(attrs: VidaAttributes): VidaStats {
  return {
    max_pv: attrs.vigor * 2 + attrs.dexterity,
    max_pm: attrs.intelligence * 2 + attrs.cunning,
    defense: attrs.dexterity + attrs.cunning,
  }
}

export function regenRate(attrs: VidaAttributes): { hp_per_hour: number; mp_per_hour: number } {
  return {
    hp_per_hour: attrs.vigor,
    mp_per_hour: attrs.intelligence,
  }
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

export interface Item {
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
