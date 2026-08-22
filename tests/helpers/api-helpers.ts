import { APIRequestContext } from '@playwright/test';

export const API_BASE = 'http://localhost:8000/api';

export const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

async function jsonOrThrow<T>(res: { ok: boolean; status: () => number; json: () => Promise<T> }, label: string): Promise<T> {
  if (!res.ok()) throw new Error(`${label} failed: ${res.status()}`);
  return res.json();
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
}

export async function createCampaign(
  request: APIRequestContext,
  name: string,
): Promise<Campaign> {
  const res = await request.post(`${API_BASE}/campaigns`, {
    data: { name, description: 'E2E test campaign' },
  });
  return jsonOrThrow<Campaign>(res, 'createCampaign');
}

export async function deleteCampaign(
  request: APIRequestContext,
  campaignId: string,
): Promise<void> {
  await request.delete(`${API_BASE}/campaigns/${campaignId}`);
}

export interface Character {
  id: string;
  name: string;
  max_pv: number;
  max_pm: number;
  defense: number;
  portrait_path: string | null;
}

export async function createCharacter(
  request: APIRequestContext,
  campaignId: string,
  data: {
    name: string;
    vigor?: number;
    intelligence?: number;
    dexterity?: number;
    cunning?: number;
    race?: string;
    class_name?: string;
  },
): Promise<Character> {
  const res = await request.post(`${API_BASE}/campaigns/${campaignId}/characters`, {
    data: {
      type: 'player',
      vigor: 1,
      intelligence: 1,
      dexterity: 1,
      cunning: 1,
      ...data,
    },
  });
  return jsonOrThrow<Character>(res, 'createCharacter');
}

export async function getCharacter(
  request: APIRequestContext,
  campaignId: string,
  characterId: string,
): Promise<Character> {
  const res = await request.get(
    `${API_BASE}/campaigns/${campaignId}/characters/${characterId}`,
  );
  return jsonOrThrow<Character>(res, 'getCharacter');
}

export interface Scene {
  id: string;
  name: string;
  background_path: string | null;
  status: string;
}

export async function createScene(
  request: APIRequestContext,
  campaignId: string,
  name: string,
): Promise<Scene> {
  const res = await request.post(`${API_BASE}/campaigns/${campaignId}/scenes`, {
    data: { name },
  });
  return jsonOrThrow<Scene>(res, 'createScene');
}

export async function listScenes(
  request: APIRequestContext,
  campaignId: string,
): Promise<Scene[]> {
  const res = await request.get(`${API_BASE}/campaigns/${campaignId}/scenes`);
  return jsonOrThrow<Scene[]>(res, 'listScenes');
}

export interface SceneCharacter {
  id: string;
  entity_type: string;
  entity_id: string;
  x: number;
  y: number;
  z: number;
  visible: number;
  order: number;
}

export async function getSceneCharacters(
  request: APIRequestContext,
  campaignId: string,
  sceneId: string,
): Promise<SceneCharacter[]> {
  const res = await request.get(
    `${API_BASE}/campaigns/${campaignId}/scenes/${sceneId}/characters`,
  );
  return jsonOrThrow<SceneCharacter[]>(res, 'getSceneCharacters');
}

export async function seedToken(
  request: APIRequestContext,
  campaignId: string,
  sceneId: string,
  entityType: string,
  entityId: string,
  x = 0,
  z = 0,
): Promise<SceneCharacter[]> {
  return seedTokens(request, campaignId, sceneId, [
    { entityType, entityId, x, z },
  ]);
}

export interface SeedTokenInput {
  entityType: string;
  entityId: string;
  x?: number;
  z?: number;
}

export async function seedTokens(
  request: APIRequestContext,
  campaignId: string,
  sceneId: string,
  tokens: SeedTokenInput[],
): Promise<SceneCharacter[]> {
  const res = await request.put(
    `${API_BASE}/campaigns/${campaignId}/scenes/${sceneId}/characters`,
    {
      data: tokens.map((t, i) => ({
        entity_type: t.entityType,
        entity_id: t.entityId,
        x: t.x ?? 0,
        y: 0,
        z: t.z ?? 0,
        visible: true,
        order: i,
      })),
    },
  );
  return jsonOrThrow<SceneCharacter[]>(res, 'seedTokens');
}

export interface Npc {
  id: string;
  name: string;
  description: string;
}

export async function createNpc(
  request: APIRequestContext,
  campaignId: string,
  data: { name: string; description?: string },
): Promise<Npc> {
  const res = await request.post(`${API_BASE}/campaigns/${campaignId}/npcs`, {
    data: { vigor: 1, intelligence: 1, dexterity: 1, cunning: 1, ...data },
  });
  return jsonOrThrow<Npc>(res, 'createNpc');
}

export async function getNpc(
  request: APIRequestContext,
  campaignId: string,
  npcId: string,
): Promise<Npc> {
  const res = await request.get(`${API_BASE}/campaigns/${campaignId}/npcs/${npcId}`);
  return jsonOrThrow<Npc>(res, 'getNpc');
}

export interface GameMap {
  id: string;
  name: string;
  file_path: string | null;
}

export async function createMap(
  request: APIRequestContext,
  campaignId: string,
  name: string,
): Promise<GameMap> {
  const res = await request.post(`${API_BASE}/campaigns/${campaignId}/maps`, {
    data: { name },
  });
  return jsonOrThrow<GameMap>(res, 'createMap');
}

export async function uploadMapFile(
  request: APIRequestContext,
  campaignId: string,
  mapId: string,
): Promise<GameMap> {
  const res = await request.post(
    `${API_BASE}/campaigns/${campaignId}/maps/${mapId}/upload`,
    {
      multipart: {
        file: { name: 'map.png', mimeType: 'image/png', buffer: PNG_1PX },
      },
    },
  );
  return jsonOrThrow<GameMap>(res, 'uploadMapFile');
}

export async function createMapWithFile(
  request: APIRequestContext,
  campaignId: string,
  name: string,
): Promise<GameMap> {
  const map = await createMap(request, campaignId, name);
  return uploadMapFile(request, campaignId, map.id);
}

export async function updateScene(
  request: APIRequestContext,
  campaignId: string,
  sceneId: string,
  data: { map_id?: string | null; lighting?: string; status?: string },
): Promise<Scene> {
  const res = await request.put(
    `${API_BASE}/campaigns/${campaignId}/scenes/${sceneId}`,
    { data },
  );
  return jsonOrThrow<Scene>(res, 'updateScene');
}

export interface TestSession {
  id: string;
  number: number;
  date: string;
  title: string;
  summary: string;
  status: string;
}

export async function createSession(
  request: APIRequestContext,
  campaignId: string,
  data: { number: number; date?: string; title?: string },
): Promise<TestSession> {
  const res = await request.post(
    `${API_BASE}/campaigns/${campaignId}/sessions`,
    {
      data: { date: '2026-08-22', ...data },
    },
  );
  return jsonOrThrow<TestSession>(res, 'createSession');
}

export async function getSession(
  request: APIRequestContext,
  campaignId: string,
  sessionId: string,
): Promise<TestSession> {
  const res = await request.get(
    `${API_BASE}/campaigns/${campaignId}/sessions/${sessionId}`,
  );
  return jsonOrThrow<TestSession>(res, 'getSession');
}

export interface TestEvent {
  id: string;
  type: string;
  actor_id: string;
  description: string;
}

export async function seedEvent(
  request: APIRequestContext,
  campaignId: string,
  sessionId: string,
  data: { type: string; actor_id: string; target_id?: string; description?: string },
): Promise<TestEvent> {
  const res = await request.post(
    `${API_BASE}/campaigns/${campaignId}/sessions/${sessionId}/events`,
    { data: { session_id: sessionId, ...data } },
  );
  return jsonOrThrow<TestEvent>(res, 'seedEvent');
}
