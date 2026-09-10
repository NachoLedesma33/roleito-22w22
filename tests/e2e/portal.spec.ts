import { expect, test } from '../fixtures/campaign-fixture';
import {
  createScene,
  getSceneItems,
  putSceneItems,
  PNG_1PX,
} from '../helpers/api-helpers';

function zone(id: string, points: number[], portals: unknown[]) {
  return {
    id,
    name: 'Zone',
    x: 0,
    y: 0,
    zIndex: 0,
    scale: 1,
    rotation: 0,
    width: 0,
    height: 0,
    opacity: 1,
    visible: true,
    locked: false,
    disableHit: false,
    disableAutoZIndex: false,
    attachmentIds: [],
    disableAttachmentBehavior: [],
    layer: 5,
    shape: { type: 'polygon', points, fill: '#10b981' },
    metadata: {
      type: 'zone',
      zoneType: 'polygon',
      origin: 'manual',
      touchedByDm: false,
      shadowOnly: false,
      fillColor: '#10b981',
      fillOpacity: 0.35,
      portals,
    },
  };
}

const PORTAL = {
  id: 'portal-e2e-1',
  zoneA: 'zone-e2e-A',
  zoneB: 'zone-e2e-B',
  state: 'open',
  localEdge: [
    { x: 0.5, y: 0.46 },
    { x: 0.5, y: 0.54 },
  ],
  activatesOn: null,
};

async function openSceneWithZones(
  page: import('@playwright/test').Page,
  campaignId: string,
  sceneId: string,
) {
  await page.goto(`/campaigns/${campaignId}`);
  await page.locator('header select').selectOption(sceneId);
  await page.setInputFiles('header input[type="file"]', {
    name: 'bg.png',
    mimeType: 'image/png',
    buffer: PNG_1PX,
  });
  const canvas = page.locator('canvas').first();
  await expect(canvas).toBeVisible({ timeout: 15_000 });
  await page.waitForFunction(
    () =>
      !Array.from(document.querySelectorAll('div')).some(
        (d) => d.textContent === 'Loading 3D scene...' && d.className.includes('w-full'),
      ) && !!document.querySelector('canvas'),
    undefined,
    { timeout: 15_000 },
  );
  await page.waitForTimeout(1500);
  return canvas;
}

async function rightClickZoneUntilMenu(
  page: import('@playwright/test').Page,
  canvas: import('@playwright/test').Locator,
): Promise<void> {
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas sin boundingBox');
  const candidates = [
    { x: box.x + box.width * 0.5, y: box.y + box.height * 0.5 },
    { x: box.x + box.width * 0.53, y: box.y + box.height * 0.5 },
    { x: box.x + box.width * 0.5, y: box.y + box.height * 0.53 },
    { x: box.x + box.width * 0.47, y: box.y + box.height * 0.47 },
  ];
  for (const c of candidates) {
    await page.mouse.click(c.x, c.y, { button: 'right' });
    try {
      await page.getByText('Eliminar zona').waitFor({ timeout: 1500 });
      return;
    } catch {
      await page.keyboard.press('Escape');
    }
  }
  throw new Error('no se abrió el menú de zona en el canvas');
}

test.describe('Portales (Build menu)', () => {
  test('P1: portal inyectado por API sobrevive roundtrip y render sin errores', async ({
    page,
    campaign,
    request,
  }) => {
    const scene = await createScene(request, campaign.id, 'Portal Roundtrip');
    await putSceneItems(request, campaign.id, scene.id, [
      zone('zone-e2e-A', [0.35, 0.35, 0.5, 0.35, 0.5, 0.65, 0.35, 0.65], [PORTAL]),
      zone('zone-e2e-B', [0.5, 0.35, 0.65, 0.35, 0.65, 0.65, 0.5, 0.65], [PORTAL]),
    ]);

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await openSceneWithZones(page, campaign.id, scene.id);

    expect(errors).toHaveLength(0);

    const { items } = await getSceneItems(request, campaign.id, scene.id);
    const zonesWithPortal = items.filter(
      (i) =>
        i.metadata?.type === 'zone' &&
        (i.metadata as { portals?: unknown[] }).portals?.length === 1,
    );
    expect(zonesWithPortal).toHaveLength(2);
  });

  test('P2: toggle de estado desde el menú de zona persiste en ambas zonas', async ({
    page,
    campaign,
    request,
  }) => {
    const scene = await createScene(request, campaign.id, 'Portal Toggle');
    await putSceneItems(request, campaign.id, scene.id, [
      zone('zone-e2e-A', [0.35, 0.35, 0.5, 0.35, 0.5, 0.65, 0.35, 0.65], [PORTAL]),
      zone('zone-e2e-B', [0.5, 0.35, 0.65, 0.35, 0.65, 0.65, 0.5, 0.65], [PORTAL]),
    ]);

    const canvas = await openSceneWithZones(page, campaign.id, scene.id);

    await rightClickZoneUntilMenu(page, canvas);
    await expect(page.getByText('Eliminar zona').first()).toBeVisible();

    const putPromise = page.waitForResponse(
      (res) =>
        res.url().includes(`/scenes/${scene.id}/items`) && res.request().method() === 'PUT',
      { timeout: 15_000 },
    );
    await page.getByText(/Portal Cerrar/).click();
    const response = await putPromise;
    expect(response.status()).toBe(200);

    const { items } = await getSceneItems(request, campaign.id, scene.id);
    for (const i of items) {
      if (i.metadata?.type !== 'zone') continue;
      const portals = (i.metadata as { portals?: { state: string }[] }).portals ?? [];
      for (const p of portals) {
        expect(p, `portal en zona ${i.id} pasó a closed`).toHaveProperty('state', 'closed');
      }
    }
  });

  test('P3: botón Portal activa tool y hint, ESC cancela sin romper canvas', async ({
    page,
    campaign,
    request,
  }) => {
    const scene = await createScene(request, campaign.id, 'Portal Tool');
    const canvas = await openSceneWithZones(page, campaign.id, scene.id);

    await page.getByRole('button', { name: /Build/i }).click();
    await page.getByRole('button', { name: /Portal \(zone↔zone\)/ }).click();
    await expect(page.getByText('Click edge of zone A')).toBeVisible();

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.mouse.click((await canvas.boundingBox())!.x + 50, (await canvas.boundingBox())!.y + 50);
    await page.keyboard.press('Escape');
    await expect(page.getByText('Click edge of zone A')).not.toBeVisible();
    await expect(canvas).toBeVisible();
    expect(errors).toHaveLength(0);
  });
});