import { test, expect } from '@playwright/test';

const API = 'http://localhost:8000/api';

let campaignId = '';

test.describe('World State', () => {
  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${API}/campaigns`, {
      data: { name: 'WS Test Campaign', description: 'Testing world state' },
    });
    const data = await res.json();
    campaignId = data.id;
  });

  test.afterAll(async ({ request }) => {
    if (campaignId) {
      await request.delete(`${API}/campaigns/${campaignId}`);
    }
  });

  test('WS1: GET world state returns valid structure', async ({ request }) => {
    const res = await request.get(`${API}/world-state/${campaignId}`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('version');
    expect(data).toHaveProperty('campaign_id', campaignId);
    expect(data).toHaveProperty('characters');
    expect(data).toHaveProperty('npcs');
    expect(data).toHaveProperty('locations');
    expect(data).toHaveProperty('applied_events');
    expect(data).toHaveProperty('active_threads');
  });

  test('WS2: World state version starts at 0 with no events', async ({ request }) => {
    const res = await request.get(`${API}/world-state/${campaignId}`);
    const data = await res.json();
    expect(data.version).toBe(0);
    expect(data.applied_events).toHaveLength(0);
  });

  test('WS3: World state includes characters', async ({ request }) => {
    await request.post(`${API}/campaigns/${campaignId}/characters`, {
      data: { name: 'TestHero', class_: 'Fighter', race: 'Human' },
    });

    const res = await request.get(`${API}/world-state/${campaignId}`);
    const data = await res.json();
    const charNames = Object.values(data.characters).map((c: any) => c.name);
    expect(charNames).toContain('TestHero');
  });

  test('WS4: World state includes NPCs', async ({ request }) => {
    await request.post(`${API}/campaigns/${campaignId}/npcs`, {
      data: { name: 'TestNPC', description: 'A test NPC' },
    });

    const res = await request.get(`${API}/world-state/${campaignId}`);
    const data = await res.json();
    const npcNames = Object.values(data.npcs).map((n: any) => n.name);
    expect(npcNames).toContain('TestNPC');
  });

  test('WS5: World state includes locations', async ({ request }) => {
    await request.post(`${API}/campaigns/${campaignId}/locations`, {
      data: { name: 'TestVillage', type: 'town' },
    });

    const res = await request.get(`${API}/world-state/${campaignId}`);
    const data = await res.json();
    const locNames = Object.values(data.locations).map((l: any) => l.name);
    expect(locNames).toContain('TestVillage');
  });

  test('WS6: Snapshots list returns array', async ({ request }) => {
    const res = await request.get(`${API}/world-state/${campaignId}/snapshots`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('versions');
    expect(Array.isArray(data.versions)).toBe(true);
  });

  test('WS7: Snapshot is created after computing world state', async ({ request }) => {
    await request.get(`${API}/world-state/${campaignId}`);
    const res = await request.get(`${API}/world-state/${campaignId}/snapshots`);
    const data = await res.json();
    expect(data.versions.length).toBeGreaterThan(0);
  });

  test('WS8: GET specific snapshot returns state', async ({ request }) => {
    await request.get(`${API}/world-state/${campaignId}`);
    const snapsRes = await request.get(`${API}/world-state/${campaignId}/snapshots`);
    const snaps = await snapsRes.json();
    if (snaps.versions.length > 0) {
      const version = snaps.versions[0];
      const res = await request.get(`${API}/world-state/${campaignId}/snapshots/${version}`);
      expect(res.status()).toBe(200);
      const data = await res.json();
      expect(data.version).toBe(version);
    }
  });

  test('WS9: Non-existent snapshot returns 404', async ({ request }) => {
    const res = await request.get(`${API}/world-state/${campaignId}/snapshots/99999`);
    expect(res.status()).toBe(404);
  });

  test('WS10: Rollback to non-existent version returns 404', async ({ request }) => {
    const res = await request.post(`${API}/world-state/${campaignId}/rollback/99999`);
    expect(res.status()).toBe(404);
  });
});
