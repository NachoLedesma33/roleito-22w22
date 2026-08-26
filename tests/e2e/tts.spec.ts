import { expect, test } from '../fixtures/campaign-fixture';

const API = 'http://localhost:8000/api';

const DEFAULT_TTS = { provider: 'mock', voice: 'mock-voice-1', speed: 1.0, language: 'es' };

test.describe('TTS System', () => {
  test.beforeEach(async ({ request, authHeaders }) => {
    await request.put(`${API}/tts/config`, { headers: authHeaders, data: DEFAULT_TTS });
  });

  test('TTS1: config default is mock', async ({ request, authHeaders }) => {
    const res = await request.get(`${API}/tts/config`, { headers: authHeaders });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.provider).toBe('mock');
    expect(body.voice).toBeTruthy();
    expect(typeof body.speed).toBe('number');
    expect(body.language).toBeTruthy();
  });

  test('TTS2: PUT config persists', async ({ request, authHeaders }) => {
    const put = await request.put(`${API}/tts/config`, {
      headers: authHeaders,
      data: { provider: 'mock', voice: 'mock-voice-2', speed: 1.5, language: 'en' },
    });
    expect(put.status()).toBe(200);

    const get = await request.get(`${API}/tts/config`, { headers: authHeaders });
    const body = await get.json();
    expect(body.voice).toBe('mock-voice-2');
    expect(body.speed).toBe(1.5);
    expect(body.language).toBe('en');

    await request.put(`${API}/tts/config`, {
      headers: authHeaders,
      data: { voice: 'mock-voice-1', speed: 1.0, language: 'es' },
    });
  });

  test('TTS3: list voices returns array', async ({ request, authHeaders }) => {
    const res = await request.get(`${API}/tts/voices`, { headers: authHeaders });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(body[0].id).toBeTruthy();
    expect(body[0].name).toBeTruthy();
  });

  test('TTS4: generate returns audio bytes', async ({ request, authHeaders }) => {
    const res = await request.post(`${API}/tts/generate`, {
      headers: authHeaders,
      data: { text: 'Hola mundo' },
    });
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('audio');
    const body = await res.body();
    expect(body.byteLength).toBeGreaterThan(0);
  });

  test('TTS5: generate with empty text returns 400', async ({ request, authHeaders }) => {
    const res = await request.post(`${API}/tts/generate`, {
      headers: authHeaders,
      data: { text: '' },
    });
    expect(res.status()).toBe(400);
  });

  test('TTS6: generate includes duration header', async ({ request, authHeaders }) => {
    const res = await request.post(`${API}/tts/generate`, {
      headers: authHeaders,
      data: { text: 'Test narration' },
    });
    expect(res.status()).toBe(200);
    const duration = res.headers()['x-tts-duration-ms'];
    expect(duration).toBeTruthy();
    expect(parseInt(duration)).toBeGreaterThan(0);
  });

  test('TTS7: TTS panel loads in sidebar', async ({ page, campaign }) => {
    await page.goto(`/campaigns/${campaign.id}/manage`);
    await page.waitForLoadState('networkidle');

    const navLink = page.locator('a[href*="/tts"]');
    await expect(navLink).toBeVisible();
    await expect(navLink).toContainText('Voice');

    await navLink.click();
    await expect(page).toHaveURL(new RegExp(`/campaigns/${campaign.id}/tts`));
    await expect(page.getByRole('heading', { name: 'TTS' })).toBeVisible();
  });

  test('TTS8: TTS panel has text input and generate button', async ({ page, campaign }) => {
    await page.goto(`/campaigns/${campaign.id}/tts`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('textarea')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Generate Speech' })).toBeVisible();
  });

  test('TTS9: TTS panel generate flow', async ({ page, campaign }) => {
    await page.goto(`/campaigns/${campaign.id}/tts`);
    await page.waitForLoadState('networkidle');

    await page.locator('textarea').fill('La antorcha parpadea débilmente.');
    await page.getByRole('button', { name: 'Generate Speech' }).click();

    await expect(page.locator('audio')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Duration:/)).toBeVisible();
  });

  test('TTS10: TTS panel config section visible', async ({ page, campaign }) => {
    await page.goto(`/campaigns/${campaign.id}/tts`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Configuration')).toBeVisible();
    await expect(page.locator('label:has-text("Provider")')).toBeVisible();
    await expect(page.locator('label:has-text("Voice")')).toBeVisible();
    await expect(page.locator('label:has-text("Speed")')).toBeVisible();
  });
});
