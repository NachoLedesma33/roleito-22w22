const API_BASE = 'http://localhost:8000/api';

function authHeaders(): Record<string, string> {
  const token = sessionStorage.getItem('roleito:auth:token');
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

export type VidaAttr = '+' | '/' | '-';

export interface AISettings {
  provider: 'mock' | 'local' | 'remote';
  local_base_url: string;
  remote_base_url: string;
  model: string | null;
  max_tokens: number;
  temperature: number;
}

export interface AITestResult {
  ok: boolean;
  provider: string;
  model: string | null;
  response: string | null;
  latency_ms: number | null;
  error: string | null;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  } | null;
}

export interface NarrativeEvent {
  event_id: string;
  type: string;
  description: string;
  actor_id: string | null;
  target_id: string | null;
  location_id: string | null;
  confidence: number;
  unresolved_actors: string[];
  unresolved_targets: string[];
}

export interface ParseResponse {
  events: NarrativeEvent[];
  warnings: string[];
  raw_count: number;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  current_session_id: string | null;
  current_location_id: string | null;
  settings_json: Record<string, unknown>;
  invite_code: string | null;
}

export interface CampaignExport {
  campaign: Campaign;
  sessions: Record<string, unknown>[];
  characters: Record<string, unknown>[];
  npcs: Record<string, unknown>[];
  locations: Record<string, unknown>[];
  events: Record<string, unknown>[];
  relationships: Record<string, unknown>[];
}

export interface Character {
  id: string;
  campaign_id: string;
  name: string;
  type: string;
  description: string;
  class_: string;
  race: string;
  status: string;
  current_location_id: string | null;
  visual_config_json: Record<string, unknown>;
  knowledge_scope: string;
  portrait_path: string | null;
  vigor: VidaAttr;
  intelligence: VidaAttr;
  dexterity: VidaAttr;
  cunning: VidaAttr;
  max_pv: number;
  max_pm: number;
  defense: number;
  current_pv: number | null;
  current_pm: number | null;
  inventory_json: InventoryItem[];
  spells_json: Spell[];
  player_notes: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  weight?: number;
  equipped?: boolean;
}

export interface Spell {
  id: string;
  name: string;
  description: string;
  level: number;
  cost_pm: number;
}

export interface NPC {
  id: string;
  campaign_id: string;
  name: string;
  description: string;
  status: string;
  current_location_id: string | null;
  faction_id: string | null;
  knowledge_scope: string;
  visual_config_json: Record<string, unknown>;
  portrait_path: string | null;
  vigor: VidaAttr;
  intelligence: VidaAttr;
  dexterity: VidaAttr;
  cunning: VidaAttr;
  max_pv: number;
  max_pm: number;
  defense: number;
  current_pv: number | null;
  current_pm: number | null;
  inventory_json: InventoryItem[];
  spells_json: Spell[];
}

type CharacterCreateFields = {
  name: string;
  type?: string;
  description?: string;
  class_name?: string;
  race?: string;
  status?: string;
  knowledge_scope?: string;
  vigor?: VidaAttr;
  intelligence?: VidaAttr;
  dexterity?: VidaAttr;
  cunning?: VidaAttr;
  max_pv?: number;
  max_pm?: number;
  defense?: number;
  current_pv?: number;
  current_pm?: number;
  inventory_json?: InventoryItem[];
  spells_json?: Spell[];
  player_notes?: string;
};

type CharacterUpdateFields = Partial<CharacterCreateFields>;

type NPCCreateFields = {
  name: string;
  description?: string;
  status?: string;
  knowledge_scope?: string;
  vigor?: VidaAttr;
  intelligence?: VidaAttr;
  dexterity?: VidaAttr;
  cunning?: VidaAttr;
  max_pv?: number;
  max_pm?: number;
  defense?: number;
  current_pv?: number;
  current_pm?: number;
  inventory_json?: InventoryItem[];
  spells_json?: Spell[];
};

type NPCUpdateFields = Partial<NPCCreateFields>;

export interface Session {
  id: string;
  campaign_id: string;
  number: number;
  date: string;
  title: string;
  raw_notes: string;
  summary: string;
  status: string;
  created_at: string;
  updated_at: string;
}

type SessionCreateFields = {
  number: number;
  date: string;
  title?: string;
  raw_notes?: string;
  summary?: string;
};

type SessionUpdateFields = Partial<SessionCreateFields> & { status?: string };

export interface Event {
  id: string;
  campaign_id: string;
  session_id: string;
  type: string;
  actor_id: string;
  target_id: string | null;
  location_id: string | null;
  description: string;
  confidence: number;
  status: string;
  source_id: string | null;
}

export interface WorldState {
  campaign_id: string;
  current_session_id: string | null;
  current_location_id: string | null;
  characters: { id: string; name: string; type: string; status: string; current_location_id: string | null }[];
  npcs: { id: string; name: string; status: string; current_location_id: string | null }[];
  events: { id: string; type: string; actor_id: string; target_id: string | null; location_id: string | null; description: string; session_id: string }[];
  total_sessions: number;
  total_canon_events: number;
}

export interface Player {
  id: string;
  campaign_id: string;
  name: string;
  character_id: string | null;
  role: string;
  notes: string;
  created_at: string;
}

export interface Map {
  id: string;
  campaign_id: string;
  name: string;
  description: string;
  file_path: string;
  thumbnail_path: string | null;
  map_type: string;
  created_at: string;
}

export interface MapMarker {
  id: string;
  map_id: string;
  label: string;
  marker_type: string;
  target_scene_id: string | null;
  x: number;
  y: number;
  color: string;
  description: string;
  created_at: string;
}

export interface DMNotebook {
  id: string;
  campaign_id: string;
  title: string;
  content: string;
  category: string;
  pinned: number;
  created_at: string;
  updated_at: string;
}

export interface DMNotebookVersion {
  id: string;
  notebook_id: string;
  title: string;
  content: string;
  version_number: number;
  created_at: string;
}

export interface DiceRollResponse {
  id: string;
  campaign_id: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  roller_name: string;
  dice_type: number;
  count: number;
  results: number[];
  total: number;
  label: string | null;
  created_at: string;
}

export interface Asset {
  id: string;
  campaign_id: string;
  name: string;
  file_path: string;
  asset_type: string;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
}

export interface Scene {
  id: string;
  campaign_id: string;
  name: string;
  description: string;
  background_path: string | null;
  map_id: string | null;
  lighting: string;
  audio_path: string | null;
  status: string;
  notes: string;
  entrance_x: number;
  entrance_z: number;
  created_at: string;
  updated_at: string;
}

export interface SceneCharacter {
  id: string;
  scene_id: string;
  entity_type: string;
  entity_id: string;
  x: number;
  y: number;
  z: number;
  visible: boolean;
  order: number;
}

type EventCreateFields = {
  session_id: string;
  type: string;
  actor_id: string;
  target_id?: string;
  location_id?: string;
  description?: string;
  confidence?: number;
  source_id?: string;
};

type EventUpdateFields = Partial<Omit<EventCreateFields, 'session_id'>> & { status?: string };

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status}: ${body}`);
  }
  return res.json();
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
  });
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

export const api = {
  campaigns: {
    list: () => request<Campaign[]>('/campaigns'),
    get: (id: string) => request<Campaign>(`/campaigns/${id}`),
    create: (data: { name: string; description?: string }) =>
      request<Campaign>('/campaigns', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Pick<Campaign, 'name' | 'description'>>) =>
      request<Campaign>(`/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ status: string; id: string }>(`/campaigns/${id}`, { method: 'DELETE' }),
    export: (id: string) => request<CampaignExport>(`/campaigns/${id}/export`),
    import: (data: Record<string, unknown>) =>
      request<Campaign>('/campaigns/import', { method: 'POST', body: JSON.stringify(data) }),
    generateInviteCode: (id: string) =>
      request<Campaign>(`/campaigns/${id}/invite-code`, { method: 'POST' }),
  },

  characters: {
    list: (campaignId: string) => request<Character[]>(`/campaigns/${campaignId}/characters`),
    get: (campaignId: string, id: string) => request<Character>(`/campaigns/${campaignId}/characters/${id}`),
    create: (campaignId: string, data: CharacterCreateFields) =>
      request<Character>(`/campaigns/${campaignId}/characters`, { method: 'POST', body: JSON.stringify(data) }),
    update: (campaignId: string, id: string, data: CharacterUpdateFields) =>
      request<Character>(`/campaigns/${campaignId}/characters/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (campaignId: string, id: string) =>
      request<{ status: string; id: string }>(`/campaigns/${campaignId}/characters/${id}`, { method: 'DELETE' }),
    uploadPortrait: async (campaignId: string, characterId: string, file: File) => {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API_BASE}/campaigns/${campaignId}/characters/${characterId}/portrait`, {
        method: 'POST',
        headers: authHeaders(),
        body: form,
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json() as Promise<Character>;
    },
  },

  npcs: {
    list: (campaignId: string) => request<NPC[]>(`/campaigns/${campaignId}/npcs`),
    get: (campaignId: string, id: string) => request<NPC>(`/campaigns/${campaignId}/npcs/${id}`),
    create: (campaignId: string, data: NPCCreateFields) =>
      request<NPC>(`/campaigns/${campaignId}/npcs`, { method: 'POST', body: JSON.stringify(data) }),
    update: (campaignId: string, id: string, data: NPCUpdateFields) =>
      request<NPC>(`/campaigns/${campaignId}/npcs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (campaignId: string, id: string) =>
      request<{ status: string; id: string }>(`/campaigns/${campaignId}/npcs/${id}`, { method: 'DELETE' }),
    uploadPortrait: async (campaignId: string, npcId: string, file: File) => {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API_BASE}/campaigns/${campaignId}/npcs/${npcId}/portrait`, {
        method: 'POST',
        headers: authHeaders(),
        body: form,
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json() as Promise<NPC>;
    },
  },

  sessions: {
    list: (campaignId: string) => request<Session[]>(`/campaigns/${campaignId}/sessions`),
    get: (campaignId: string, id: string) => request<Session>(`/campaigns/${campaignId}/sessions/${id}`),
    getCurrent: (campaignId: string) => request<Session>(`/campaigns/${campaignId}/sessions/current`),
    create: (campaignId: string, data: SessionCreateFields) =>
      request<Session>(`/campaigns/${campaignId}/sessions`, { method: 'POST', body: JSON.stringify(data) }),
    update: (campaignId: string, id: string, data: SessionUpdateFields) =>
      request<Session>(`/campaigns/${campaignId}/sessions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (campaignId: string, id: string) =>
      request<{ status: string; id: string }>(`/campaigns/${campaignId}/sessions/${id}`, { method: 'DELETE' }),
    start: (campaignId: string, id: string) =>
      request<Session>(`/campaigns/${campaignId}/sessions/${id}/start`, { method: 'POST' }),
    end: (campaignId: string, id: string) =>
      request<Session>(`/campaigns/${campaignId}/sessions/${id}/end`, { method: 'POST' }),
  },

  events: {
    listBySession: (campaignId: string, sessionId: string) =>
      request<Event[]>(`/campaigns/${campaignId}/sessions/${sessionId}/events`),
    listByCampaign: (campaignId: string) =>
      request<Event[]>(`/campaigns/${campaignId}/events`),
    get: (eventId: string) =>
      request<Event>(`/events/${eventId}`),
    create: (campaignId: string, sessionId: string, data: EventCreateFields) =>
      request<Event>(`/campaigns/${campaignId}/sessions/${sessionId}/events`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (eventId: string, data: EventUpdateFields) =>
      request<Event>(`/events/${eventId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    approve: (eventId: string) =>
      request<Event>(`/events/${eventId}/approve`, { method: 'PUT' }),
    reject: (eventId: string) =>
      request<Event>(`/events/${eventId}/reject`, { method: 'PUT' }),
    delete: (eventId: string) =>
      request<{ status: string; id: string }>(`/events/${eventId}`, { method: 'DELETE' }),
  },

  players: {
    list: (campaignId: string) =>
      request<Player[]>(`/campaigns/${campaignId}/players`),
    get: (campaignId: string, id: string) =>
      request<Player>(`/campaigns/${campaignId}/players/${id}`),
    create: (campaignId: string, data: { name: string; character_id?: string; role?: string; notes?: string }) =>
      request<Player>(`/campaigns/${campaignId}/players`, { method: 'POST', body: JSON.stringify(data) }),
    update: (campaignId: string, id: string, data: { name?: string; character_id?: string; role?: string; notes?: string }) =>
      request<Player>(`/campaigns/${campaignId}/players/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (campaignId: string, id: string) =>
      request<{ status: string; id: string }>(`/campaigns/${campaignId}/players/${id}`, { method: 'DELETE' }),
  },

  maps: {
    list: (campaignId: string) =>
      request<Map[]>(`/campaigns/${campaignId}/maps`),
    get: (campaignId: string, id: string) =>
      request<Map>(`/campaigns/${campaignId}/maps/${id}`),
    create: (campaignId: string, data: { name: string; description?: string; map_type?: string }) =>
      request<Map>(`/campaigns/${campaignId}/maps`, { method: 'POST', body: JSON.stringify(data) }),
    upload: async (campaignId: string, mapId: string, file: File) => {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API_BASE}/campaigns/${campaignId}/maps/${mapId}/upload`, {
        method: 'POST',
        headers: authHeaders(),
        body: form,
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json() as Promise<Map>;
    },
    delete: (campaignId: string, id: string) =>
      request<{ status: string; id: string }>(`/campaigns/${campaignId}/maps/${id}`, { method: 'DELETE' }),
  },

  mapMarkers: {
    list: (mapId: string) =>
      request<MapMarker[]>(`/maps/${mapId}/markers`),
    create: (mapId: string, data: { label?: string; marker_type?: string; target_scene_id?: string; x?: number; y?: number; color?: string; description?: string }) =>
      request<MapMarker>(`/maps/${mapId}/markers`, { method: 'POST', body: JSON.stringify(data) }),
    update: (markerId: string, data: { label?: string; marker_type?: string; target_scene_id?: string | null; x?: number; y?: number; color?: string; description?: string }) =>
      request<MapMarker>(`/markers/${markerId}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (markerId: string) =>
      request<{ status: string; id: string }>(`/markers/${markerId}`, { method: 'DELETE' }),
  },

  assets: {
    list: (campaignId: string) =>
      request<Asset[]>(`/campaigns/${campaignId}/assets`),
    upload: async (campaignId: string, file: File, name?: string) => {
      const form = new FormData();
      form.append('file', file);
      if (name) form.append('name', name);
      const res = await fetch(`${API_BASE}/campaigns/${campaignId}/assets/upload`, {
        method: 'POST',
        headers: authHeaders(),
        body: form,
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json() as Promise<Asset>;
    },
    delete: (campaignId: string, id: string) =>
      request<{ status: string; id: string }>(`/campaigns/${campaignId}/assets/${id}`, { method: 'DELETE' }),
  },

  scenes: {
    list: (campaignId: string) =>
      request<Scene[]>(`/campaigns/${campaignId}/scenes`),
    get: (campaignId: string, id: string) =>
      request<Scene>(`/campaigns/${campaignId}/scenes/${id}`),
    create: (campaignId: string, data: { name: string; description?: string; lighting?: string }) =>
      request<Scene>(`/campaigns/${campaignId}/scenes`, { method: 'POST', body: JSON.stringify(data) }),
    update: (campaignId: string, id: string, data: { name?: string; description?: string; lighting?: string; status?: string; notes?: string; entrance_x?: number; entrance_z?: number; map_id?: string | null }) =>
      request<Scene>(`/campaigns/${campaignId}/scenes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (campaignId: string, id: string) =>
      request<{ status: string; id: string }>(`/campaigns/${campaignId}/scenes/${id}`, { method: 'DELETE' }),
    uploadBackground: async (campaignId: string, sceneId: string, file: File) => {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API_BASE}/campaigns/${campaignId}/scenes/${sceneId}/upload-background`, {
        method: 'POST',
        headers: authHeaders(),
        body: form,
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json() as Promise<Scene>;
    },
    getCharacters: (campaignId: string, sceneId: string) =>
      request<SceneCharacter[]>(`/campaigns/${campaignId}/scenes/${sceneId}/characters`),
    updateCharacters: (campaignId: string, sceneId: string, characters: { entity_type: string; entity_id: string; x: number; y: number; z: number; visible: boolean; order: number }[]) =>
      request<SceneCharacter[]>(`/campaigns/${campaignId}/scenes/${sceneId}/characters`, {
        method: 'PUT',
        body: JSON.stringify(characters),
      }),
  },

  notebooks: {
    list: (campaignId: string) =>
      request<DMNotebook[]>(`/campaigns/${campaignId}/notebooks`),
    get: (campaignId: string, id: string) =>
      request<DMNotebook>(`/campaigns/${campaignId}/notebooks/${id}`),
    create: (campaignId: string, data: { title: string; content?: string; category?: string }) =>
      request<DMNotebook>(`/campaigns/${campaignId}/notebooks`, { method: 'POST', body: JSON.stringify(data) }),
    update: (campaignId: string, id: string, data: { title?: string; content?: string; category?: string; pinned?: number }) =>
      request<DMNotebook>(`/campaigns/${campaignId}/notebooks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (campaignId: string, id: string) =>
      request<{ status: string; id: string }>(`/campaigns/${campaignId}/notebooks/${id}`, { method: 'DELETE' }),
    versions: (notebookId: string) =>
      request<DMNotebookVersion[]>(`/notebooks/${notebookId}/versions`),
    restoreVersion: (notebookId: string, versionId: string) =>
      request<DMNotebook>(`/notebooks/${notebookId}/restore/${versionId}`, { method: 'POST' }),
  },

  ai: {
    getConfig: () => request<AISettings>('/ai/config'),
    updateConfig: (data: Partial<AISettings>) =>
      request<AISettings>('/ai/config', { method: 'PUT', body: JSON.stringify(data) }),
    test: (prompt?: string) =>
      request<AITestResult>('/ai/test', {
        method: 'POST',
        body: JSON.stringify(prompt ? { prompt } : {}),
      }),
  },

  vault: {
    status: () => request<Record<string, boolean>>('/vault/status'),
    store: (provider: string, apiKey: string) =>
      apiPost<{ status: string; provider: string }>('/vault/store', { provider, api_key: apiKey }),
    delete: (provider: string) =>
      apiPost<{ status: string; deleted: boolean }>('/vault/delete', { provider }),
  },

  narrative: {
    parse: (campaignId: string, data: { text: string; session_id: string; scene_name?: string }) =>
      request<ParseResponse>(`/campaigns/${campaignId}/narrative/parse`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  memory: {
    get: (campaignId: string) =>
      request<any>(`/memory/${campaignId}`),
    getSession: (campaignId: string, sessionNumber: number) =>
      request<any>(`/memory/${campaignId}/sessions/${sessionNumber}`),
    search: (campaignId: string, q: string) =>
      request<any[]>(`/memory/${campaignId}/search?q=${encodeURIComponent(q)}`),
  },

  worldState: {
    get: (campaignId: string) =>
      request<any>(`/world-state/${campaignId}`),
    snapshots: (campaignId: string) =>
      request<any>(`/world-state/${campaignId}/snapshots`),
    getSnapshot: (campaignId: string, version: number) =>
      request<any>(`/world-state/${campaignId}/snapshots/${version}`),
  },

  rolls: {
    create: (campaignId: string, data: {
      entity_type?: string;
      entity_id?: string;
      entity_name?: string;
      roller_name: string;
      dice_type: number;
      count: number;
      results: number[];
      total: number;
      label?: string;
    }) => request<DiceRollResponse>(`/campaigns/${campaignId}/rolls`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    recent: (campaignId: string, since: number) =>
      request<DiceRollResponse[]>(`/campaigns/${campaignId}/rolls/recent?since=${since}`),
    recentAll: (campaignId: string) =>
      request<DiceRollResponse[]>(`/campaigns/${campaignId}/rolls/recent/all`),
    history: (campaignId: string, entityId: string) =>
      request<DiceRollResponse[]>(`/campaigns/${campaignId}/rolls/history/${entityId}`),
  },
};
