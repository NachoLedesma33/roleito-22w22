import { expect, test } from '../fixtures/auth-fixture';
import { createScene } from '../helpers/api-helpers';

const API = 'http://localhost:8000/api';

const DEFAULT_CONFIG = {
  provider: 'mock',
  local_base_url: 'http://localhost:11434',
  remote_base_url: 'https://api.groq.com/openai/v1',
  model: null,
  max_tokens: 512,
  temperature: 0.7,
};

async function resetConfig(
  request: import('@playwright/test').APIRequestContext,
  authHeaders: { Authorization: string },
) {
  const res = await request.put(`${API}/ai/config`, {
    headers: authHeaders,
    data: DEFAULT_CONFIG,
  });
  if (!res.ok()) throw new Error(`resetConfig failed: ${res.status()}`);
}

test.describe('AI Provider Layer', () => {
  test.beforeEach(async ({ request, authHeaders }) => {
    await resetConfig(request, authHeaders);
  });

  test('AI1: config default es mock con URLs por defecto', async ({
    request,
    authHeaders,
  }) => {
    const res = await request.get(`${API}/ai/config`, { headers: authHeaders });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.provider).toBe('mock');
    expect(body.local_base_url).toBe('http://localhost:11434');
    expect(body.remote_base_url).toContain('openai');
  });

  test('AI2: PUT config persiste entre GETs', async ({ request, authHeaders }) => {
    const put = await request.put(`${API}/ai/config`, {
      headers: authHeaders,
      data: {
        provider: 'local',
        local_base_url: 'http://localhost:11500',
        model: 'mistral',
        max_tokens: 256,
        temperature: 0.3,
      },
    });
    expect(put.status()).toBe(200);

    const got = await request.get(`${API}/ai/config`, { headers: authHeaders });
    const body = await got.json();
    expect(body.provider).toBe('local');
    expect(body.local_base_url).toBe('http://localhost:11500');
    expect(body.model).toBe('mistral');
    expect(body.max_tokens).toBe(256);
    expect(body.temperature).toBe(0.3);
  });

  test('AI3: test endpoint con mock responde OK determinista', async ({
    request,
    authHeaders,
  }) => {
    const res = await request.post(`${API}/ai/test`, {
      headers: authHeaders,
      data: { prompt: 'hola dm' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.provider).toBe('mock');
    expect(String(body.response)).toMatch(/^\[mock:/);
    expect(typeof body.latency_ms).toBe('number');
  });

  test('AI4: provider inválido rechazado con 422', async ({ request, authHeaders }) => {
    const res = await request.put(`${API}/ai/config`, {
      headers: authHeaders,
      data: { provider: 'bogus' },
    });
    expect(res.status()).toBe(422);
  });

  test('AI5: test con Ollama inaccesible devuelve ok:false y mensaje claro', async ({
    request,
    authHeaders,
  }) => {
    await request.put(`${API}/ai/config`, {
      headers: authHeaders,
      data: { provider: 'local', local_base_url: 'http://localhost:9' },
    });
    const res = await request.post(`${API}/ai/test`, {
      headers: authHeaders,
      data: {},
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(String(body.error)).toContain('Ollama');
  });

  test('AI6: panel IA en el dashboard — elegir provider, guardar, probar', async ({
    page,
    campaign,
    request,
    dmToken,
    authHeaders,
  }) => {
    const scene = await createScene(request, campaign.id, 'Escena AI');
    await page.goto('/');
    await page.evaluate((token) => {
      sessionStorage.setItem('roleito:auth:token', token);
    }, dmToken);
    await page.goto(`/campaigns/${campaign.id}`);
    await page.locator('header select').selectOption(scene.id);

    await page.getByTestId('ai-panel-button').click();
    const panel = page.getByTestId('ai-settings-panel');
    await expect(panel).toBeVisible();

    await panel.locator('[data-testid="ai-provider-select"]').selectOption('local');
    await expect(panel.locator('[data-testid="ai-local-url"]')).toBeVisible();
    await panel
      .locator('[data-testid="ai-local-url"] input')
      .fill('http://localhost:9');

    await page.getByRole('button', { name: 'Guardar' }).click();
    await page.getByTestId('ai-test-button').click();

    await expect(page.getByTestId('ai-test-result')).toContainText('Error', {
      timeout: 10_000,
    });

    const cfg = await request.get(`${API}/ai/config`, { headers: authHeaders });
    expect((await cfg.json()).provider).toBe('local');
  });
});
