const API_BASE = 'http://localhost:8000/api';

export interface Campaign {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  current_session_id: string | null;
  current_location_id: string | null;
  settings_json: Record<string, unknown>;
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
  vigor: number;
  intelligence: number;
  dexterity: number;
  cunning: number;
  max_pv: number;
  max_pm: number;
  defense: number;
  current_pv: number | null;
  current_pm: number | null;
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
  vigor: number;
  intelligence: number;
  dexterity: number;
  cunning: number;
  max_pv: number;
  max_pm: number;
  defense: number;
  current_pv: number | null;
  current_pm: number | null;
}

type CharacterCreateFields = {
  name: string;
  type?: string;
  description?: string;
  class_name?: string;
  race?: string;
  status?: string;
  knowledge_scope?: string;
  vigor?: number;
  intelligence?: number;
  dexterity?: number;
  cunning?: number;
  current_pv?: number;
  current_pm?: number;
};

type CharacterUpdateFields = Partial<CharacterCreateFields>;

type NPCCreateFields = {
  name: string;
  description?: string;
  status?: string;
  knowledge_scope?: string;
  vigor?: number;
  intelligence?: number;
  dexterity?: number;
  cunning?: number;
  current_pv?: number;
  current_pm?: number;
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

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status}: ${body}`);
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
};
