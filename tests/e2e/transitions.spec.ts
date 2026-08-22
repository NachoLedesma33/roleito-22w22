import { expect, test } from '../fixtures/campaign-fixture';
import { createScene } from '../helpers/api-helpers';

const API_BASE = 'http://localhost:8000/api';

const SIZED_SVG = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400">' +
    '<rect width="600" height="400" fill="#2a2a35"/></svg>',
);

async function createSizedMap(
  request: import('@playwright/test').APIRequestContext,
  campaignId: string,
  name: string,
) {
  const created = await request.post(`${API_BASE}/campaigns/${campaignId}/maps`, {
    data: { name },
  });
  const map = (await created.json()) as { id: string };
  const uploaded = await request.post(
    `${API_BASE}/campaigns/${campaignId}/maps/${map.id}/upload`,
    {
      multipart: {
        file: { name: 'map.svg', mimeType: 'image/svg+xml', buffer: SIZED_SVG },
      },
    },
  );
  expect(uploaded.ok()).toBeTruthy();
  return map;
}

test.describe('Scene Transitions', () => {
  async function openDashboard(
    page: import('@playwright/test').Page,
    campaignId: string,
  ) {
    await page.goto(`/campaigns/${campaignId}`);
    await expect(page.getByTitle('Upload map background')).toBeVisible();
  }

  interface TwoRooms {
    tavernId: string;
    vaultId: string;
    tavernMapId: string;
    vaultMapId: string;
  }

  async function seedTwoRooms(
    request: import('@playwright/test').APIRequestContext,
    campaignId: string,
  ): Promise<TwoRooms> {
    const tavern = await createScene(request, campaignId, 'Taberna');
    const vault = await createScene(request, campaignId, 'Bóveda');
    const tavernMap = await createSizedMap(request, campaignId, 'Mapa Taberna');
    const vaultMap = await createSizedMap(request, campaignId, 'Mapa Bóveda');
    await request.put(`${API_BASE}/campaigns/${campaignId}/scenes/${tavern.id}`, {
      data: { map_id: tavernMap.id },
    });
    await request.put(`${API_BASE}/campaigns/${campaignId}/scenes/${vault.id}`, {
      data: { map_id: vaultMap.id },
    });
    return {
      tavernId: tavern.id,
      vaultId: vault.id,
      tavernMapId: tavernMap.id,
      vaultMapId: vaultMap.id,
    };
  }

  async function seedTransitionViaApi(
    request: import('@playwright/test').APIRequestContext,
    campaignId: string,
    rooms: TwoRooms,
    withReturn = false,
  ) {
    const created = await request.post(
      `${API_BASE}/maps/${rooms.tavernMapId}/markers`,
      { data: { label: 'Puerta', marker_type: 'transition', target_scene_id: rooms.vaultId } },
    );
    expect(created.ok()).toBeTruthy();
    if (withReturn) {
      await request.post(`${API_BASE}/maps/${rooms.vaultMapId}/markers`, {
        data: { label: 'Salida', marker_type: 'transition', target_scene_id: rooms.tavernId },
      });
    }
  }

  test('TR1: crea transición con puerta de retorno', async ({ page, campaign, request }) => {
    const rooms = await seedTwoRooms(request, campaign.id);

    await openDashboard(page, campaign.id);
    await page.getByTitle('Open map').click();

    const viewer = page.locator('div.fixed.inset-0');
    await viewer.getByRole('button', { name: '+ Add Marker' }).click();
    await viewer.getByRole('combobox').first().selectOption({ label: 'Transition' });
    await expect(viewer.getByText('Click on map to place the transition')).toBeVisible();

    await viewer.locator('div.flex-1.overflow-hidden.relative').click();

    const form = viewer.locator('div.absolute.inset-0');
    await expect(form.getByText('Transition to…')).toBeVisible();
    await expect(form.getByRole('checkbox')).toBeChecked();

    await form.getByRole('combobox').selectOption({ label: 'Bóveda' });
    await form.getByRole('button', { name: 'Create' }).click();

    await expect(viewer.getByTitle('Bóveda (transition)')).toBeVisible();
    await expect(viewer.getByText(/· 1 markers$/)).toBeVisible();

    const res = await request.get(`${API_BASE}/maps/${rooms.vaultMapId}/markers`);
    const list = (await res.json()) as Array<{
      target_scene_id: string | null;
      marker_type: string;
    }>;
    expect(list).toHaveLength(1);
    expect(list[0].marker_type).toBe('transition');
    expect(list[0].target_scene_id).toBe(rooms.tavernId);
  });

  test('TR2: Travel cambia la escena y abre el mapa destino', async ({ page, campaign, request }) => {
    const rooms = await seedTwoRooms(request, campaign.id);
    await seedTransitionViaApi(request, campaign.id, rooms);

    await openDashboard(page, campaign.id);
    await page.getByTitle('Open map').click();

    const sceneSelect = page.locator('select').first();
    await expect(sceneSelect).toHaveValue(rooms.tavernId);

    const viewer = page.locator('div.fixed.inset-0');
    await viewer.getByTitle('Puerta (transition)').click();
    await viewer.getByRole('button', { name: 'Travel' }).click();

    await expect(viewer.getByText('Mapa Bóveda')).toBeVisible();
    await expect(sceneSelect).toHaveValue(rooms.vaultId);
  });

  test('TR3: puerta de retorno lleva de vuelta', async ({ page, campaign, request }) => {
    const rooms = await seedTwoRooms(request, campaign.id);
    await seedTransitionViaApi(request, campaign.id, rooms, true);

    await openDashboard(page, campaign.id);
    await page.getByTitle('Open map').click();

    let viewer = page.locator('div.fixed.inset-0');
    await viewer.getByTitle('Puerta (transition)').click();
    await viewer.getByRole('button', { name: 'Travel' }).click();

    await expect(viewer.getByText('Mapa Bóveda')).toBeVisible();
    await expect(viewer.getByTitle('Salida (transition)')).toBeVisible();

    await viewer.getByTitle('Salida (transition)').click();
    await viewer.getByRole('button', { name: 'Travel' }).click();

    viewer = page.locator('div.fixed.inset-0');
    await expect(viewer.getByText('Mapa Taberna')).toBeVisible();
    await expect(page.locator('select').first()).toHaveValue(rooms.tavernId);
  });

  test('TR4: sin retorno no crea marcador en destino', async ({ page, campaign, request }) => {
    const rooms = await seedTwoRooms(request, campaign.id);

    await openDashboard(page, campaign.id);
    await page.getByTitle('Open map').click();

    const viewer = page.locator('div.fixed.inset-0');
    await viewer.getByRole('button', { name: '+ Add Marker' }).click();
    await viewer.getByRole('combobox').first().selectOption({ label: 'Transition' });
    await viewer.locator('div.flex-1.overflow-hidden.relative').click();

    const form = viewer.locator('div.absolute.inset-0');
    await form.getByRole('combobox').selectOption({ label: 'Bóveda' });
    await form.getByRole('checkbox').uncheck();
    await form.getByRole('button', { name: 'Create' }).click();

    await expect(viewer.getByText(/· 1 markers$/)).toBeVisible();

    const res = await request.get(`${API_BASE}/maps/${rooms.vaultMapId}/markers`);
    const list = (await res.json()) as unknown[];
    expect(list).toHaveLength(0);
  });
});
