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

    // Dock siempre abierto en desktop: botones directos, sin ＋ intermedio.
    await page.getByTestId('ai-panel-button').click();
    const panel = page.getByTestId('ai-settings-panel');
    await expect(panel).toBeVisible();

    await panel.locator('[data-testid="ai-provider-select"]').selectOption('local');
    await expect(panel.locator('[data-testid="ai-local-url"]')).toBeVisible();
    await panel
      .locator('[data-testid="ai-local-url"] input')
      .fill('http://localhost:9');

    // El panel tiene dos botones de guardado ("Guardar" de la config global y
    // "Guardar perfil" de los perfiles): el locator va exacto.
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    await page.getByTestId('ai-test-button').click();

    // El connect a un puerto cerrado puede tardar hasta ~21s (timeout del OS
    // en Windows) antes de fallar — margen holgado para evitar flaky.
    await expect(page.getByTestId('ai-test-result')).toContainText('Error', {
      timeout: 25_000,
    });

    const cfg = await request.get(`${API}/ai/config`, { headers: authHeaders });
    expect((await cfg.json()).provider).toBe('local');
  });

  test('AI8: la auditoría lista las llamadas sin filtrar el prompt', async ({
    page,
    campaign,
    request,
    dmToken,
    authHeaders,
  }) => {
    // Una llamada al modelo: queda auditada.
    const call = await request.post(`${API}/ai/test`, {
      headers: authHeaders,
      data: { prompt: 'frase-secreta-de-prueba' },
    });
    expect(call.status()).toBe(200);

    const scene = await createScene(request, campaign.id, 'Escena AI8');
    await page.goto('/');
    await page.evaluate((token) => {
      sessionStorage.setItem('roleito:auth:token', token);
    }, dmToken);
    await page.goto(`/campaigns/${campaign.id}`);
    await page.locator('header select').selectOption(scene.id);

    await page.getByTestId('ai-panel-button').click();
    const panel = page.getByTestId('ai-settings-panel');
    await panel.getByTestId('ai-audit-toggle').click();

    const list = panel.getByTestId('ai-audit-list');
    await expect(list).toBeVisible();
    await expect(list).toContainText('ai-test');
    // El prompt no se guarda: la lista no lo muestra.
    await expect(list).not.toContainText('frase-secreta-de-prueba');
  });

  test('AI9: se crea un perfil de proveedor desde el panel', async ({
    page,
    campaign,
    request,
    dmToken,
    authHeaders,
  }) => {
    const scene = await createScene(request, campaign.id, 'Escena AI9');
    await page.goto('/');
    await page.evaluate((token) => {
      sessionStorage.setItem('roleito:auth:token', token);
    }, dmToken);
    await page.goto(`/campaigns/${campaign.id}`);
    await page.locator('header select').selectOption(scene.id);

    await page.getByTestId('ai-panel-button').click();
    const panel = page.getByTestId('ai-settings-panel');

    await panel.getByTestId('ai-profile-new').click();
    await panel.getByTestId('ai-profile-id').fill('mi-perfil');
    await panel.getByTestId('ai-profile-url').fill('https://api.ejemplo.com/v1');
    await panel.getByTestId('ai-profile-model').fill('mi-modelo');
    await panel.getByTestId('ai-profile-save').click();

    await expect(panel.getByTestId('ai-profile-mi-perfil')).toBeVisible();

    // Y el perfil existe en la API (sin la key, que no se expone).
    const res = await request.get(`${API}/ai/profiles`, { headers: authHeaders });
    const body = await res.json();
    expect(body.profiles.some((p: { id: string }) => p.id === 'mi-perfil')).toBe(true);
  });

  test('AI7: asistente con dictado por voz — sin micrófono no se rompe', async ({
    page,
    campaign,
    request,
    dmToken,
  }) => {
    const scene = await createScene(request, campaign.id, 'Escena AI7');
    await page.goto('/');
    await page.evaluate((token) => {
      sessionStorage.setItem('roleito:auth:token', token);
    }, dmToken);
    await page.goto(`/campaigns/${campaign.id}`);
    await page.locator('header select').selectOption(scene.id);

    // Dock siempre abierto en desktop: botones directos, sin ＋ intermedio.
    await page.getByTestId('dm-assistant-button').click();
    const input = page.getByTestId('dm-assistant-input');
    await expect(input).toBeVisible();

    // Headless Chromium expone SpeechRecognition (falla al usarlo sin red/mic).
    // El botón debe renderizarse y clickearlo no puede romper el input.
    const toggle = page.getByTestId('voice-input-toggle');
    await expect(toggle).toBeVisible();
    await toggle.click();
    await input.fill('hola dictado');
    await expect(input).toHaveValue('hola dictado');
  });

  test('AI10: el badge del asistente cuenta lo que espera la decision del DM', async ({
    page,
    campaign,
    request,
    authHeaders,
    dmToken,
  }) => {
    // Una propuesta: nace PROPOSED, el canon no se toca (C4).
    const ses = await request.post(`${API}/campaigns/${campaign.id}/sessions`, {
      data: { number: 99, date: '2026-10-21', title: 'Sesion digest' },
    });
    const session = await ses.json();
    const ev = await request.post(
      `${API}/campaigns/${campaign.id}/sessions/${session.id}/events`,
      {
        data: {
          session_id: session.id,
          type: 'DIALOGUE',
          actor_id: 'npc-varek',
          description: 'propuesta para aprobar',
        },
      },
    );
    expect(ev.status()).toBe(200);

    const digest = await (
      await request.get(`${API}/campaigns/${campaign.id}/agents/digest`, { headers: authHeaders })
    ).json();
    expect(digest.pending).toBeGreaterThan(0);

    await page.goto('/');
    await page.evaluate((token) => {
      sessionStorage.setItem('roleito:auth:token', token);
    }, dmToken);
    await page.goto(`/campaigns/${campaign.id}`);

    // El badge del boton del asistente muestra el digest (sin llamar al modelo).
    const badge = page.getByTestId('dm-assistant-badge');
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText(String(digest.pending));
  });
});
