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
};
