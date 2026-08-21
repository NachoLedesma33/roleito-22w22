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
  const res = await request.put(
    `${API_BASE}/campaigns/${campaignId}/scenes/${sceneId}/characters`,
    {
      data: [
        {
          entity_type: entityType,
          entity_id: entityId,
          x,
          y: 0,
          z,
          visible: true,
          order: 0,
        },
      ],
    },
  );
  return jsonOrThrow<SceneCharacter[]>(res, 'seedToken');
}
