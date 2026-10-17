import { expect, test } from '../fixtures/campaign-fixture';
import { uploadBackground } from '../helpers/api-helpers';
import { blueprintMapPng } from '../helpers/image-helpers';

const API = 'http://localhost:8000/api';

interface DetectWallsResponse {
  wall_count: number;
  door_count: number;
  items: Array<{
    id: string;
    shape?: { points?: number[] };
    metadata: { type: string };
  }>;
}

/** Geometría normalizada, sin ids: los ids llevan timestamp + random por diseño. */
function geometry(res: DetectWallsResponse): string {
  return JSON.stringify(
    res.items
      .map((item) => ({
        type: item.metadata.type,
        points: (item.shape?.points ?? []).map((p) => Number(p.toFixed(4))),
      }))
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  );
}

async function createSceneWithMap(
  request: import('@playwright/test').APIRequestContext,
  authHeaders: { Authorization: string },
  campaignId: string,
  png: Buffer,
): Promise<string> {
  const res = await request.post(`${API}/campaigns/${campaignId}/scenes`, {
    headers: authHeaders,
    data: { name: 'Plano detect' },
  });
  const scene = await res.json();
  await uploadBackground(request, campaignId, scene.id, {
    name: 'plano.png',
    mimeType: 'image/png',
    buffer: png,
  });
  return scene.id;
}

function detect(
  request: import('@playwright/test').APIRequestContext,
  authHeaders: { Authorization: string },
  campaignId: string,
  sceneId: string,
  query = '',
) {
  return request.post(
    `${API}/campaigns/${campaignId}/scenes/${sceneId}/detect-walls${query}`,
    { headers: authHeaders },
  );
}

function sceneItems(
  request: import('@playwright/test').APIRequestContext,
  authHeaders: { Authorization: string },
  campaignId: string,
  sceneId: string,
): Promise<Array<{ id: string }>> {
  return request
    .get(`${API}/campaigns/${campaignId}/scenes/${sceneId}/items`, {
      headers: authHeaders,
    })
    .then((res) => res.json())
    .then((body) => body.items ?? []);
}

const AUTO_PREFIXES = ['wall-auto-', 'door-auto-'];

test.describe('Auto wall detection', () => {
  test('D1: detecta paredes y la propuesta es reproducible', async ({
    page,
    request,
    campaign,
    authHeaders,
  }) => {
    await page.goto('/');
    const png = await blueprintMapPng(page);
    const sceneId = await createSceneWithMap(request, authHeaders, campaign.id, png);

    const first = await detect(request, authHeaders, campaign.id, sceneId);
    expect(first.status()).toBe(200);
    const firstBody = (await first.json()) as DetectWallsResponse;

    // El plano dibujado tiene 5 líneas: tiene que encontrar muros de verdad.
    expect(firstBody.wall_count).toBeGreaterThanOrEqual(3);

    const second = await detect(request, authHeaders, campaign.id, sceneId);
    expect(second.status()).toBe(200);
    const secondBody = (await second.json()) as DetectWallsResponse;

    // Misma imagen + mismo seed = misma propuesta. Los ids difieren (timestamp),
    // por eso se compara la geometría.
    expect(secondBody.wall_count).toBe(firstBody.wall_count);
    expect(geometry(secondBody)).toBe(geometry(firstBody));
  });

  test('D2: ?seed= cambia la propuesta sin romper la detección', async ({
    page,
    request,
    campaign,
    authHeaders,
  }) => {
    await page.goto('/');
    const png = await blueprintMapPng(page);
    const sceneId = await createSceneWithMap(request, authHeaders, campaign.id, png);

    const res = await detect(request, authHeaders, campaign.id, sceneId, '?seed=99');
    expect(res.status()).toBe(200);
    const body = (await res.json()) as DetectWallsResponse;
    expect(body.wall_count).toBeGreaterThanOrEqual(3);
  });

  test('D3: escena sin fondo responde 400 en vez de reventar', async ({
    request,
    campaign,
    authHeaders,
  }) => {
    const res = await request.post(`${API}/campaigns/${campaign.id}/scenes`, {
      headers: authHeaders,
      data: { name: 'Sin fondo' },
    });
    const scene = await res.json();

    const detectRes = await detect(request, authHeaders, campaign.id, scene.id);
    expect(detectRes.status()).toBe(400);
  });

  test('D4: el DM detecta paredes desde Construir y aprueba la propuesta', async ({
    page,
    request,
    campaign,
    authHeaders,
  }) => {
    await page.goto('/');
    const png = await blueprintMapPng(page);
    const sceneId = await createSceneWithMap(request, authHeaders, campaign.id, png);

    await page.goto(`/campaigns/${campaign.id}`);
    await page.locator('header select').selectOption(sceneId);
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15_000 });

    // El botón vive en el menú Construir. Ojo: el texto del botón trae un
    // emoji (🔍) y los SVG no aportan texto, así que se busca por el resto.
    await page.getByRole('button', { name: 'Construir' }).click();
    await page.getByRole('button', { name: 'Detectar paredes' }).click();

    const review = page.getByTestId('detect-review');
    await expect(review).toBeVisible({ timeout: 30_000 });
    await expect(review).toContainText('Revisar detección');

    await page.getByTestId('detect-approve').click();
    await expect(review).toBeHidden();
    await expect(page.getByText(/paredes confirmadas/)).toBeVisible({ timeout: 10_000 });
  });

  test('D5: detectar dos veces regenera el set automático, no lo apila', async ({
    page,
    request,
    campaign,
    authHeaders,
  }) => {
    await page.goto('/');
    const png = await blueprintMapPng(page);
    const sceneId = await createSceneWithMap(request, authHeaders, campaign.id, png);

    const autoCount = async () => {
      const items = await sceneItems(request, authHeaders, campaign.id, sceneId);
      return items.filter((i) => AUTO_PREFIXES.some((p) => i.id.startsWith(p))).length;
    };

    const detectarYAprobar = async () => {
      await page.goto(`/campaigns/${campaign.id}`);
      await page.locator('header select').selectOption(sceneId);
      await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15_000 });
      await page.getByRole('button', { name: 'Construir' }).click();
      await page.getByRole('button', { name: 'Detectar paredes' }).click();
      const review = page.getByTestId('detect-review');
      await expect(review).toBeVisible({ timeout: 30_000 });
      await page.getByTestId('detect-approve').click();
      await expect(review).toBeHidden();
      // El guardado del grafo va con debounce: se espera a que llegue.
      await expect
        .poll(async () => (await autoCount()) > 0, { timeout: 10_000 })
        .toBe(true);
    };

    await detectarYAprobar();
    const primera = await autoCount();
    expect(primera).toBeGreaterThanOrEqual(3);

    await detectarYAprobar();
    // La clave: los muros del set viejo se fueron, no quedaron debajo.
    expect(await autoCount()).toBe(primera);
  });

  test('D6: la detección no borra lo que el DM dibujó a mano', async ({
    page,
    request,
    campaign,
    authHeaders,
  }) => {
    await page.goto('/');
    const png = await blueprintMapPng(page);
    const sceneId = await createSceneWithMap(request, authHeaders, campaign.id, png);

    const saveRes = await request.put(
      `${API}/campaigns/${campaign.id}/scenes/${sceneId}/items`,
      {
        headers: authHeaders,
        data: {
          items: [
            {
              id: 'wall-mano-1',
              type: 'shape',
              shape: {
                type: 'line',
                points: [0.1, 0.1, 0.2, 0.2],
                stroke: '#fff',
                strokeWidth: 2,
              },
              position: { x: 0, y: 0, z: 0 },
              rotation: 0,
              scale: 1,
              layer: 1,
              zIndex: 0,
              locked: false,
              visible: true,
              metadata: {
                type: 'wall',
                wallType: 'solid',
                material: 'stone',
                height: 8,
                thickness: 1,
                opacity: 0.12,
                lineOfSight: true,
                movement: true,
                soundOcclusion: 0.8,
              },
            },
          ],
        },
      },
    );
    expect(saveRes.status()).toBe(200);

    await page.goto(`/campaigns/${campaign.id}`);
    await page.locator('header select').selectOption(sceneId);
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Construir' }).click();
    await page.getByRole('button', { name: 'Detectar paredes' }).click();
    await expect(page.getByTestId('detect-review')).toBeVisible({ timeout: 30_000 });
    await page.getByTestId('detect-approve').click();

    await expect
      .poll(
        async () => {
          const items = await sceneItems(request, authHeaders, campaign.id, sceneId);
          return items.some((i) => i.id === 'wall-mano-1');
        },
        { timeout: 10_000 },
      )
      .toBe(true);
  });
});