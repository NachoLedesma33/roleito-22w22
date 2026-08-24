import { expect, test } from '../fixtures/campaign-fixture';
import { createSession } from '../helpers/api-helpers';

const API = 'http://localhost:8000/api';

test.describe('AI Agents', () => {
  test('AG1: session processor returns structured data', async ({ request, campaign }) => {
    const session = await createSession(request, campaign.id, {
      number: 1,
      title: 'Test Session',
    });

    const res = await request.post(
      `${API}/campaigns/${campaign.id}/agents/process-session`,
      { data: { session_id: session.id } },
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('success');
    expect(body.data).toBeDefined();
    expect(body.data.summary).toBeTruthy();
    expect(Array.isArray(body.data.events)).toBe(true);
    expect(Array.isArray(body.data.thread_hooks)).toBe(true);
  });

  test('AG2: session processor with nonexistent session returns 404', async ({
    request,
    campaign,
  }) => {
    const res = await request.post(
      `${API}/campaigns/${campaign.id}/agents/process-session`,
      { data: { session_id: 'nonexistent' } },
    );
    expect(res.status()).toBe(404);
  });

  test('AG3: lore agent answers questions', async ({ request, campaign }) => {
    const res = await request.post(`${API}/campaigns/${campaign.id}/agents/lore`, {
      data: { question: '¿Qué personajes hay en la campaña?' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('success');
    expect(body.data).toBeDefined();
    expect(body.data.answer).toBeTruthy();
    expect(typeof body.data.confidence).toBe('number');
  });

  test('AG4: lore agent with empty question returns error', async ({ request, campaign }) => {
    const res = await request.post(`${API}/campaigns/${campaign.id}/agents/lore`, {
      data: { question: '' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('error');
  });

  test('AG5: narrator generates narration', async ({ request, campaign }) => {
    const res = await request.post(`${API}/campaigns/${campaign.id}/agents/narrate`, {
      data: {
        scene_description: 'A dark dungeon entrance',
        current_action: 'The party approaches',
        mood_hint: 'tense',
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('success');
    expect(body.data).toBeDefined();
    expect(body.data.narration).toBeTruthy();
    expect(body.data.mood).toBeTruthy();
  });

  test('AG6: narrator with no context returns error', async ({ request, campaign }) => {
    const res = await request.post(`${API}/campaigns/${campaign.id}/agents/narrate`, {
      data: {},
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('error');
  });

  test('AG7: agent panel loads in sidebar', async ({ page, campaign }) => {
    await page.goto(`/campaigns/${campaign.id}/manage`);
    await page.waitForLoadState('networkidle');

    const navLink = page.locator('a[href*="/agents"]');
    await expect(navLink).toBeVisible();
    await expect(navLink).toContainText('Agents');

    await navLink.click();
    await expect(page).toHaveURL(new RegExp(`/campaigns/${campaign.id}/agents`));
    await expect(page.getByRole('heading', { name: 'AI Agents' })).toBeVisible();
  });

  test('AG8: agent panel has session processor tab', async ({ page, campaign }) => {
    await page.goto(`/campaigns/${campaign.id}/agents`);
    await page.waitForLoadState('networkidle');

    const sessionTab = page.getByRole('button', { name: 'Session Processor' });
    await expect(sessionTab).toBeVisible();
    await sessionTab.click();

    await expect(page.locator('input[placeholder="session-..."]')).toBeVisible();
  });

  test('AG9: agent panel has lore tab', async ({ page, campaign }) => {
    await page.goto(`/campaigns/${campaign.id}/agents`);
    await page.waitForLoadState('networkidle');

    const loreTab = page.getByRole('button', { name: 'Lore Agent' });
    await expect(loreTab).toBeVisible();
    await loreTab.click();

    await expect(page.locator('input[placeholder*="bóveda"]')).toBeVisible();
  });

  test('AG10: agent panel has narrator tab', async ({ page, campaign }) => {
    await page.goto(`/campaigns/${campaign.id}/agents`);
    await page.waitForLoadState('networkidle');

    const narratorTab = page.getByRole('button', { name: 'Narrator' });
    await expect(narratorTab).toBeVisible();
    await narratorTab.click();

    await expect(page.locator('textarea[placeholder*="bóveda"]')).toBeVisible();
  });

  test('AG11: lore agent UI flow', async ({ page, campaign }) => {
    await page.goto(`/campaigns/${campaign.id}/agents`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Lore Agent' }).click();
    await page.locator('input[placeholder*="bóveda"]').fill('¿Qué personajes hay?');
    await page.getByRole('button', { name: 'Ask Lore Agent' }).click();

    await expect(page.getByText('success')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Confidence:')).toBeVisible();
  });
});
