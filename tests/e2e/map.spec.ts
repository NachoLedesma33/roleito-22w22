import { expect, test } from '../fixtures/campaign-fixture';
import {
  createMap,
  createMapWithFile,
  createScene,
  PNG_1PX,
} from '../helpers/api-helpers';

const API_BASE = 'http://localhost:8000/api';

test.describe('Map System', () => {
  async function openDashboard(
    page: import('@playwright/test').Page,
    campaignId: string,
  ) {
    await page.goto(`/campaigns/${campaignId}`);
    await expect(page.getByTitle('Upload map background')).toBeVisible();
  }

  test('M1: abre MapViewer con escena vinculada', async ({ page, campaign, request }) => {
    const scene = await createScene(request, campaign.id, 'Cripta');
    const map = await createMapWithFile(request, campaign.id, 'Mapa Cripta');
    await request.put(`${API_BASE}/campaigns/${campaign.id}/scenes/${scene.id}`, {
      data: { map_id: map.id },
    });

    await openDashboard(page, campaign.id);
    const mapBtn = page.getByTitle('Open map');
    await expect(mapBtn).toBeVisible();
    await mapBtn.click();

    const viewer = page.locator('div.fixed.inset-0');
    await expect(viewer.getByText('Mapa Cripta')).toBeVisible();
    await expect(
      viewer.getByRole('img', { name: 'Mapa Cripta' }),
    ).toBeAttached();

    await page.keyboard.press('Escape');
    await expect(mapBtn).toBeVisible();
  });

  test('M2: zoom con rueda del mouse', async ({ page, campaign, request }) => {
    const scene = await createScene(request, campaign.id, 'Bosque');
    const map = await createMapWithFile(request, campaign.id, 'Mapa Bosque');
    await request.put(`${API_BASE}/campaigns/${campaign.id}/scenes/${scene.id}`, {
      data: { map_id: map.id },
    });

    await openDashboard(page, campaign.id);
    await page.getByTitle('Open map').click();

    const viewer = page.locator('div.fixed.inset-0');
    await expect(viewer.getByText(/^100% ·/)).toBeVisible();

    const canvas = viewer.locator('div.flex-1.overflow-hidden.relative');
    await canvas.hover();
    await page.mouse.wheel(0, -120);

    await expect(viewer.getByText(/^110% ·/)).toBeVisible();
  });

  test('M3: paneo con click-drag', async ({ page, campaign, request }) => {
    const scene = await createScene(request, campaign.id, 'Mazmorra');
    const map = await createMapWithFile(request, campaign.id, 'Mapa Mazmorra');
    await request.put(`${API_BASE}/campaigns/${campaign.id}/scenes/${scene.id}`, {
      data: { map_id: map.id },
    });

    await openDashboard(page, campaign.id);
    await page.getByTitle('Open map').click();

    const viewer = page.locator('div.fixed.inset-0');
    const canvas = viewer.locator('div.flex-1.overflow-hidden.relative');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('map canvas not found');

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 40, { steps: 5 });
    await page.mouse.up();

    const wrapper = viewer.locator('div.absolute').first();
    await expect(wrapper).toHaveAttribute('style', /translate\(60px,\s*40px\)/);
  });

  test('M4: coloca marker en el mapa', async ({ page, campaign, request }) => {
    const scene = await createScene(request, campaign.id, 'Templo');
    const map = await createMapWithFile(request, campaign.id, 'Mapa Templo');
    await request.put(`${API_BASE}/campaigns/${campaign.id}/scenes/${scene.id}`, {
      data: { map_id: map.id },
    });

    await openDashboard(page, campaign.id);
    await page.getByTitle('Open map').click();

    const viewer = page.locator('div.fixed.inset-0');
    await viewer.getByRole('button', { name: '+ Add Marker' }).click();
    await viewer.getByPlaceholder('Label').fill('Vault');

    await expect(viewer.getByText('Click on map to place marker')).toBeVisible();
    await viewer.locator('div.flex-1.overflow-hidden.relative').click();

    await expect(viewer.getByTitle('Vault (poi)')).toBeVisible();
    await expect(viewer.getByText(/· 1 markers$/)).toBeVisible();
  });

  test('M5: edita marker con doble click', async ({ page, campaign, request }) => {
    const scene = await createScene(request, campaign.id, 'Templo');
    const map = await createMapWithFile(request, campaign.id, 'Mapa Templo');
    await request.put(`${API_BASE}/campaigns/${campaign.id}/scenes/${scene.id}`, {
      data: { map_id: map.id },
    });

    await openDashboard(page, campaign.id);
    const viewer = page.locator('div.fixed.inset-0');
    await page.getByTitle('Open map').click();
    await viewer.getByRole('button', { name: '+ Add Marker' }).click();
    await viewer.getByPlaceholder('Label').fill('Vault');
    await viewer.locator('div.flex-1.overflow-hidden.relative').click();
    await expect(viewer.getByTitle('Vault (poi)')).toBeVisible();

    await viewer.getByTitle('Vault (poi)').dblclick();
    const editInput = viewer.locator('input');
    await expect(editInput).toHaveValue('Vault');

    const putPromise = page.waitForResponse(
      (r) => r.request().method() === 'PUT' && r.url().includes('/markers/'),
    );
    await editInput.fill('Vault Door');
    const put = await putPromise;
    expect(put.ok()).toBeTruthy();

    await expect(viewer.getByTitle('Vault Door (poi)')).toBeVisible({ timeout: 10_000 });
  });

  test('M6: elimina marker', async ({ page, campaign, request }) => {
    const scene = await createScene(request, campaign.id, 'Templo');
    const map = await createMapWithFile(request, campaign.id, 'Mapa Templo');
    await request.put(`${API_BASE}/campaigns/${campaign.id}/scenes/${scene.id}`, {
      data: { map_id: map.id },
    });

    await openDashboard(page, campaign.id);
    const viewer = page.locator('div.fixed.inset-0');
    await page.getByTitle('Open map').click();
    await viewer.getByRole('button', { name: '+ Add Marker' }).click();
    await viewer.getByPlaceholder('Label').fill('Trampa');
    await viewer.locator('div.flex-1.overflow-hidden.relative').click();
    await expect(viewer.getByTitle('Trampa (poi)')).toBeVisible();

    await viewer.getByTitle('Trampa (poi)').click();
    await viewer.getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(viewer.getByText(/· 0 markers$/)).toBeVisible();
    await expect(viewer.getByTitle('Trampa (poi)')).toHaveCount(0);
  });

  test('M7: asigna mapa a escena desde TopBar', async ({ page, campaign, request }) => {
    await createScene(request, campaign.id, 'Taberna');
    const map = await createMapWithFile(request, campaign.id, 'Plano Ciudad');

    await openDashboard(page, campaign.id);

    await page.getByRole('button', { name: 'Map ▾' }).hover();
    await page.getByRole('button', { name: 'Plano Ciudad' }).click();

    const mapBtn = page.getByTitle('Open map');
    await expect(mapBtn).toBeVisible();
    await mapBtn.click();
    await expect(
      page.locator('div.fixed.inset-0').getByText('Plano Ciudad'),
    ).toBeVisible();

    const res = await request.get(`${API_BASE}/campaigns/${campaign.id}/scenes`);
    const list = (await res.json()) as Array<{ id: string; map_id: string | null }>;
    expect(list[0].map_id).toBe(map.id);
  });

  test('M8: desasigna mapa de la escena', async ({ page, campaign, request }) => {
    const scene = await createScene(request, campaign.id, 'Puerto');
    const map = await createMapWithFile(request, campaign.id, 'Costa');
    await request.put(`${API_BASE}/campaigns/${campaign.id}/scenes/${scene.id}`, {
      data: { map_id: map.id },
    });

    await openDashboard(page, campaign.id);
    await expect(page.getByTitle('Open map')).toBeVisible();

    await page.getByRole('button', { name: 'Map ▾' }).hover();
    await page.getByRole('button', { name: 'Unlink map' }).click();

    await expect(page.getByTitle('Open map')).toHaveCount(0);

    const res = await request.get(`${API_BASE}/campaigns/${campaign.id}/scenes`);
    const list = (await res.json()) as Array<{ id: string; map_id: string | null }>;
    expect(list[0].map_id).toBeNull();
  });

  test('sanity: upload multipart de mapa funciona', async ({ request, campaign }) => {
    const map = await createMap(request, campaign.id, 'Sanity');
    const uploaded = await request.post(
      `${API_BASE}/campaigns/${campaign.id}/maps/${map.id}/upload`,
      {
        multipart: {
          file: { name: 'm.png', mimeType: 'image/png', buffer: PNG_1PX },
        },
      },
    );
    expect(uploaded.ok()).toBeTruthy();
    const body = (await uploaded.json()) as { file_path: string };
    expect(body.file_path).toBeTruthy();
  });
});
