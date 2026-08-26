import { test, expect } from '../fixtures/campaign-fixture';
import { setupAuth, withAuth } from '../helpers/api-helpers';

const API = 'http://localhost:8000/api';

let campaignId = '';
let sessionId = '';
let dmToken = '';

test.describe('Memory System', () => {
  test.beforeAll(async ({ request }) => {
    dmToken = await setupAuth(request);

    const res = await request.post(`${API}/campaigns`, {
      headers: withAuth(dmToken),
      data: { name: 'Memory Test Campaign', description: 'Testing memory system' },
    });
    const data = await res.json();
    campaignId = data.id;

    const sessRes = await request.post(`${API}/campaigns/${campaignId}/sessions`, {
      headers: withAuth(dmToken),
      data: { number: 1, date: '2026-01-01', title: 'First Session', raw_notes: 'Party explored the dungeon' },
    });
    const sessData = await sessRes.json();
    sessionId = sessData.id;

    await request.post(`${API}/campaigns/${campaignId}/locations`, {
      headers: withAuth(dmToken),
      data: { name: 'Dark Dungeon', type: 'dungeon' },
    });
  });

  test.afterAll(async ({ request }) => {
    if (campaignId) await request.delete(`${API}/campaigns/${campaignId}`, {
      headers: withAuth(dmToken),
    });
  });

  test('MEM1: GET campaign memory returns valid structure', async ({ request }) => {
    const res = await request.get(`${API}/memory/${campaignId}`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('campaign_id', campaignId);
    expect(data).toHaveProperty('total_sessions');
    expect(data).toHaveProperty('sessions');
    expect(data).toHaveProperty('active_threads');
    expect(data).toHaveProperty('major_npcs');
    expect(data).toHaveProperty('key_locations');
  });

  test('MEM2: Memory includes sessions', async ({ request }) => {
    const res = await request.get(`${API}/memory/${campaignId}`);
    const data = await res.json();
    expect(data.sessions.length).toBeGreaterThanOrEqual(1);
    expect(data.sessions[0].title).toBe('First Session');
  });

  test('MEM3: Memory includes key locations', async ({ request }) => {
    const res = await request.get(`${API}/memory/${campaignId}`);
    const data = await res.json();
    expect(data.key_locations).toContain('Dark Dungeon');
  });

  test('MEM4: Session memory endpoint returns specific session', async ({ request }) => {
    const res = await request.get(`${API}/memory/${campaignId}/sessions/1`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.session_number).toBe(1);
    expect(data.title).toBe('First Session');
  });

  test('MEM5: Non-existent session returns 404', async ({ request }) => {
    const res = await request.get(`${API}/memory/${campaignId}/sessions/999`);
    expect(res.status()).toBe(404);
  });

  test('MEM6: Search memory returns results', async ({ request }) => {
    await request.post(`${API}/campaigns/${campaignId}/sessions/${sessionId}/events`, {
      data: {
        type: 'discovery',
        actor_id: 'test-actor',
        description: 'Found a magic sword in the dungeon',
        status: 'APPROVED',
      },
    });

    const res = await request.get(`${API}/memory/${campaignId}/search?q=dungeon`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('MEM7: Memory page loads without error', async ({ page }) => {
    await page.goto(`http://localhost:5173/campaigns/${campaignId}/memory`);
    await page.waitForTimeout(3000);
    const body = await page.textContent('body');
    expect(body).toContain('Memory');
  });

  test('MEM8: Memory page shows session data', async ({ page }) => {
    await page.goto(`http://localhost:5173/campaigns/${campaignId}/memory`);
    await page.waitForTimeout(3000);
    const body = await page.textContent('body');
    expect(body).toContain('Session');
  });

  test('MEM9: Memory page has search functionality', async ({ page }) => {
    await page.goto(`http://localhost:5173/campaigns/${campaignId}/memory`);
    await page.waitForTimeout(3000);
    const inputs = await page.locator('input').count();
    expect(inputs).toBeGreaterThan(0);
  });
});
