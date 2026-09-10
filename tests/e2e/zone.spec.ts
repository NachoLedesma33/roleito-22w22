import { expect, test } from '../fixtures/campaign-fixture';
import {
  createScene,
  getSceneItems,
  putSceneItems,
  PNG_1PX,
} from '../helpers/api-helpers';

async function openSceneWithBackground(
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
  await page.waitForTimeout(700);
  return canvas;
}

async function startZoneTool(
  page: import('@playwright/test').Page,
  mode: 'rect' | 'polygon',
) {
  await page.getByRole('button', { name: /Build/i }).click();
  await page
    .getByRole('button', { name: mode === 'rect' ? /Zone \(rect\)/ : /Zone \(polygon\)/ })
    .click();
}

function zonePoints(items: import('../helpers/api-helpers').SceneItem[]): number[] {
  const zone = items.find((i) => i.metadata?.type === 'zone');
  if (!zone) throw new Error('no zone item encontrado en items');
  if (zone.shape?.type !== 'polygon') throw new Error(`shape no esperado: ${zone.shape?.type}`);
  return zone.shape.points!;
}

test.describe('Zones (Build menu)', () => {
  test('Z1: dibuja zona rect en el canvas y persiste como polígono normalizado', async ({
    page,
    campaign,
    request,
  }) => {
    const scene = await createScene(request, campaign.id, 'Zona Rect');

    const canvas = await openSceneWithBackground(page, campaign.id, scene.id);
    await startZoneTool(page, 'rect');
    await expect(page.getByText('Click-drag to draw zone rect')).toBeVisible();

    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas sin boundingBox');
    const putPromise = page.waitForResponse(
      (res) =>
        res.url().includes(`/scenes/${scene.id}/items`) && res.request().method() === 'PUT',
      { timeout: 15_000 },
    );

    await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.4);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.6, { steps: 10 });
    await page.mouse.up();

    const response = await putPromise;
    expect(response.status()).toBe(200);

    const { items } = await getSceneItems(request, campaign.id, scene.id);
    const pts = zonePoints(items);

    expect(pts).toHaveLength(8);
    for (const p of pts) {
      expect(p, 'coords normalizadas dentro de [0,1]').toBeGreaterThanOrEqual(0);
      expect(p, 'coords normalizadas dentro de [0,1]').toBeLessThanOrEqual(1);
    }
    const xs = pts.filter((_, i) => i % 2 === 0);
    const ys = pts.filter((_, i) => i % 2 === 1);
    expect(Math.max(...xs) - Math.min(...xs), 'zona no degenerada en X').toBeGreaterThan(0.02);
    expect(Math.max(...ys) - Math.min(...ys), 'zona no degenerada en Y').toBeGreaterThan(0.02);
  });

  test('Z2: polígono libre cierra al hacer click en el primer vértice y persiste', async ({
    page,
    campaign,
    request,
  }) => {
    const scene = await createScene(request, campaign.id, 'Zona Poly');

    const canvas = await openSceneWithBackground(page, campaign.id, scene.id);
    await startZoneTool(page, 'polygon');
    await expect(page.getByText('Click to place vertices')).toBeVisible();

    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas sin boundingBox');

    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    const putPromise = page.waitForResponse(
      (res) =>
        res.url().includes(`/scenes/${scene.id}/items`) && res.request().method() === 'PUT',
      { timeout: 20_000 },
    );

    await page.mouse.click(cx - box.width * 0.28, cy + box.height * 0.22);
    await page.waitForTimeout(250);
    await page.mouse.click(cx + box.width * 0.28, cy - box.height * 0.05);
    await page.waitForTimeout(250);
    await page.mouse.click(cx + box.width * 0.05, cy + box.height * 0.3);
    await page.waitForTimeout(250);
    await page.mouse.click(cx - box.width * 0.28, cy + box.height * 0.22);

    const response = await putPromise;
    expect(response.status()).toBe(200);

    const { items } = await getSceneItems(request, campaign.id, scene.id);
    const pts = zonePoints(items);

    expect(pts.length, 'polígono de al menos 3 vértices').toBeGreaterThanOrEqual(6);
    for (const p of pts) {
      expect(Number.isFinite(p), 'coords finitas').toBe(true);
      expect(p, 'coords dentro del rango del mapa').toBeGreaterThan(-2);
      expect(p, 'coords dentro del rango del mapa').toBeLessThan(2);
    }
  });

  test('Z3: zona inyectada por API sobrevive roundtrip y legacy rect no rompe el render', async ({
    page,
    campaign,
    request,
  }) => {
    const scene = await createScene(request, campaign.id, 'Zonas Inject');
    const polygon = {
      id: 'zone-e2e-poly',
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
      shape: { type: 'polygon', points: [0.4, 0.4, 0.6, 0.4, 0.6, 0.6, 0.4, 0.6] },
      metadata: {
        type: 'zone',
        zoneType: 'polygon',
        origin: 'manual',
        touchedByDm: false,
        shadowOnly: false,
        fillColor: '#10b981',
        fillOpacity: 0.35,
        portals: [],
      },
    };
    const legacyRect = {
      id: 'zone-e2e-rect',
      name: 'Zone',
      x: 2,
      y: 0,
      zIndex: 0,
      scale: 1,
      rotation: 0,
      width: 1,
      height: 1,
      opacity: 1,
      visible: true,
      locked: false,
      disableHit: false,
      disableAutoZIndex: false,
      attachmentIds: [],
      disableAttachmentBehavior: [],
      layer: 5,
      shape: { type: 'rectangle', fill: '#38bdf8' },
      metadata: {
        type: 'zone',
        zoneType: 'rectangle',
        origin: 'manual',
        touchedByDm: false,
        shadowOnly: false,
        fillColor: '#38bdf8',
        fillOpacity: 0.35,
        portals: [],
      },
    };
    await putSceneItems(request, campaign.id, scene.id, [polygon, legacyRect]);

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (m) => {
      if (m.type() === 'error' && !/Warning|texSubImage|favicon/i.test(m.text())) {
        errors.push(m.text());
      }
    });

    await page.goto(`/campaigns/${campaign.id}`);
    await page.locator('header select').selectOption(scene.id);
    await page.setInputFiles('header input[type="file"]', {
      name: 'bg.png',
      mimeType: 'image/png',
      buffer: PNG_1PX,
    });
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1000);

    expect(errors).toHaveLength(0);

    const { items } = await getSceneItems(request, campaign.id, scene.id);
    expect(
      (items.find((i) => i.id === 'zone-e2e-poly')?.shape as { points?: number[] }).points,
    ).toEqual(polygon.shape.points);
    expect(items.find((i) => i.id === 'zone-e2e-rect')).toBeTruthy();
  });
});