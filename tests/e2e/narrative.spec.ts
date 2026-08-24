import { expect, test } from '../fixtures/campaign-fixture';
import { createCharacter, createNpc, createSession } from '../helpers/api-helpers';

const API = 'http://localhost:8000/api';

async function createLocation(
  request: import('@playwright/test').APIRequestContext,
  campaignId: string,
  name: string,
): Promise<{ id: string; name: string }> {
  const res = await request.post(`${API}/campaigns/${campaignId}/locations`, {
    data: { name },
  });
  if (!res.ok()) throw new Error(`createLocation failed: ${res.status()}`);
  return res.json();
}

test.describe('Narrative Engine', () => {
  test('NE1: parse endpoint returns events from DM narration', async ({ request, campaign }) => {
    const session = await createSession(request, campaign.id, { number: 1, title: 'Test Session' });

    const res = await request.post(`${API}/campaigns/${campaign.id}/narrative/parse`, {
      data: {
        text: 'Los aventureros entran a la bóveda. Ardan encuentra una llave dorada.',
        session_id: session.id,
        scene_name: 'Vault',
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.events).toBeDefined();
    expect(Array.isArray(body.events)).toBe(true);
    expect(body.events.length).toBeGreaterThan(0);
    expect(body.raw_count).toBeGreaterThan(0);
  });

  test('NE2: parse with empty text returns empty events', async ({ request, campaign }) => {
    const session = await createSession(request, campaign.id, { number: 1, title: 'Test Session' });

    const res = await request.post(`${API}/campaigns/${campaign.id}/narrative/parse`, {
      data: {
        text: '',
        session_id: session.id,
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.events).toEqual([]);
  });

  test('NE3: parse resolves character names to IDs', async ({ request, campaign }) => {
    const session = await createSession(request, campaign.id, { number: 1, title: 'Test Session' });
    const char = await createCharacter(request, campaign.id, { name: 'Ardan' });

    const res = await request.post(`${API}/campaigns/${campaign.id}/narrative/parse`, {
      data: {
        text: 'Ardan abre la puerta de la bóveda.',
        session_id: session.id,
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();

    const hasActor = body.events.some(
      (e: { actor_id: string | null }) => e.actor_id === char.id,
    );
    expect(hasActor).toBe(true);
  });

  test('NE4: parse resolves NPC names', async ({ request, campaign }) => {
    const session = await createSession(request, campaign.id, { number: 1, title: 'Test Session' });
    const npc = await createNpc(request, campaign.id, { name: 'Guardia' });

    const res = await request.post(`${API}/campaigns/${campaign.id}/narrative/parse`, {
      data: {
        text: 'El Guardia detiene al grupo.',
        session_id: session.id,
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();

    const hasActor = body.events.some(
      (e: { actor_id: string | null }) => e.actor_id === npc.id,
    );
    expect(hasActor).toBe(true);
  });

  test('NE5: parse resolves location names', async ({ request, campaign }) => {
    const session = await createSession(request, campaign.id, { number: 1, title: 'Test Session' });
    await createLocation(request, campaign.id, 'Bóveda');

    const res = await request.post(`${API}/campaigns/${campaign.id}/narrative/parse`, {
      data: {
        text: 'El grupo entra a la Bóveda.',
        session_id: session.id,
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();

    const hasLocation = body.events.some(
      (e: { location_id: string | null }) => e.location_id !== null,
    );
    expect(hasLocation).toBe(true);
  });

  test('NE6: events created by parse have PROPOSED status', async ({ request, campaign }) => {
    const session = await createSession(request, campaign.id, { number: 1, title: 'Test Session' });

    const res = await request.post(`${API}/campaigns/${campaign.id}/narrative/parse`, {
      data: {
        text: 'Ardan encuentra una espada.',
        session_id: session.id,
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();

    for (const evt of body.events) {
      const eventRes = await request.get(`${API}/events/${evt.event_id}`);
      expect(eventRes.status()).toBe(200);
      const eventData = await eventRes.json();
      expect(eventData.status).toBe('PROPOSED');
    }
  });

  test('NE7: proposed events can be approved', async ({ request, campaign }) => {
    const session = await createSession(request, campaign.id, { number: 1, title: 'Test Session' });

    const res = await request.post(`${API}/campaigns/${campaign.id}/narrative/parse`, {
      data: {
        text: 'Ardan encuentra una espada.',
        session_id: session.id,
      },
    });
    const body = await res.json();
    expect(body.events.length).toBeGreaterThan(0);

    const approveRes = await request.put(`${API}/events/${body.events[0].event_id}/approve`);
    expect(approveRes.status()).toBe(200);
    const approved = await approveRes.json();
    expect(approved.status).toBe('CANON');
  });

  test('NE8: proposed events can be rejected', async ({ request, campaign }) => {
    const session = await createSession(request, campaign.id, { number: 1, title: 'Test Session' });

    const res = await request.post(`${API}/campaigns/${campaign.id}/narrative/parse`, {
      data: {
        text: 'Ardan encuentra una espada.',
        session_id: session.id,
      },
    });
    const body = await res.json();
    expect(body.events.length).toBeGreaterThan(0);

    const rejectRes = await request.put(`${API}/events/${body.events[0].event_id}/reject`);
    expect(rejectRes.status()).toBe(200);
    const rejected = await rejectRes.json();
    expect(rejected.status).toBe('REJECTED');
  });

  test('NE9: parse with nonexistent session returns 404', async ({ request, campaign }) => {
    const res = await request.post(`${API}/campaigns/${campaign.id}/narrative/parse`, {
      data: {
        text: 'Test narration.',
        session_id: 'nonexistent-session',
      },
    });
    expect(res.status()).toBe(404);
  });

  test('NE10: narrative engine page loads in sidebar', async ({ page, campaign }) => {
    await page.goto(`/campaigns/${campaign.id}/manage`);
    await page.waitForLoadState('networkidle');

    const navLink = page.locator('a[href*="/narrative"]');
    await expect(navLink).toBeVisible();
    await expect(navLink).toContainText('Narrative');

    await navLink.click();
    await expect(page).toHaveURL(new RegExp(`/campaigns/${campaign.id}/narrative`));
    await expect(page.getByRole('heading', { name: 'Narrative Engine' })).toBeVisible();
  });

  test('NE11: narrative engine UI parse flow', async ({ page, campaign, request }) => {
    const session = await createSession(request, campaign.id, { number: 1, title: 'Test Session' });
    await createCharacter(request, campaign.id, { name: 'Ardan' });

    await page.goto(`/campaigns/${campaign.id}/narrative`);
    await page.waitForLoadState('networkidle');

    await page.locator('input[placeholder="session-..."]').fill(session.id);
    await page.locator('textarea').fill('Ardan abre la puerta de la bóveda.');

    await page.getByRole('button', { name: 'Parse Narrative' }).click();

    await expect(page.getByText('Extracted Events')).toBeVisible({ timeout: 10_000 });
  });

  test('NE12: narrative engine approve all button', async ({ page, campaign, request }) => {
    const session = await createSession(request, campaign.id, { number: 1, title: 'Test Session' });
    await createCharacter(request, campaign.id, { name: 'Ardan' });

    await page.goto(`/campaigns/${campaign.id}/narrative`);
    await page.waitForLoadState('networkidle');

    await page.locator('input[placeholder="session-..."]').fill(session.id);
    await page.locator('textarea').fill('Ardan encuentra una llave y abre la puerta.');

    await page.getByRole('button', { name: 'Parse Narrative' }).click();
    await expect(page.getByText('Extracted Events')).toBeVisible({ timeout: 10_000 });

    const approveAllBtn = page.getByRole('button', { name: 'Approve All' });
    if (await approveAllBtn.isVisible()) {
      await approveAllBtn.click();
      await expect(page.getByText('No events extracted')).toBeVisible({ timeout: 5_000 });
    }
  });
});
