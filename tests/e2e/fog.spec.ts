import { expect, test } from '../fixtures/campaign-fixture';
import {
  createScene,
  getSceneItems,
  putSceneItems,
  PNG_1PX,
} from '../helpers/api-helpers';

async function openScene(page: import('@playwright/test').Page, campaignId: string, sceneId: string) {
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

function fogPolygon(id: string, revealed: boolean, cx: number, cy: number, r: number) {
  const pts: number[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  return {
    id,
    name: 'Fog',
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
    layer: 6,
    shape: { type: 'polygon', points: pts, fill: '#000000' },
    metadata: { type: 'fog', fogType: 'static', revealed },
  };
}

function fogItems(items: import('../helpers/api-helpers').SceneItem[]) {
  return items.filter((i) => i.metadata?.type === 'fog');
}

test.describe('Fog (Phase D)', () => {
  test('F1: regions de niebla inyectadas sobreviven roundtrip y no rompen render', async ({
    page,
    campaign,
    request,
  }) => {
    const scene = await createScene(request, campaign.id, 'Fog Inject');
    await putSceneItems(request, campaign.id, scene.id, [
      fogPolygon('fog-e2e-1', false, 0.3, 0.3, 0.1),
      fogPolygon('fog-e2e-2', true, 0.6, 0.6, 0.12),
    ]);
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await openScene(page, campaign.id, scene.id);

    expect(errors).toHaveLength(0);
    const { items } = await getSceneItems(request, campaign.id, scene.id);
    const fogs = fogItems(items);
    expect(fogs).toHaveLength(2);
    expect((fogs.find((f) => f.id === 'fog-e2e-2')?.metadata as { revealed: boolean }).revealed).toBe(true);
  });

  test('F2: pincel de niebla pinta regiones y persisten', async ({
    page,
    campaign,
    request,
  }) => {
    const scene = await createScene(request, campaign.id, 'Fog Brush');
    const canvas = await openScene(page, campaign.id, scene.id);

    await page.getByRole('button', { name: /Build/i }).click();
    await page.getByRole('button', { name: /Fog \(paint\)/ }).click();
    await expect(page.getByText('Click-drag to paint fog')).toBeVisible();

    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas sin boundingBox');

    const putPromise = page.waitForResponse(
      (res) =>
        res.url().includes(`/scenes/${scene.id}/items`) && res.request().method() === 'PUT',
      { timeout: 20_000 },
    );

    const cx = box.x + box.width * 0.5;
    const cy = box.y + box.height * 0.5;
    await page.mouse.move(cx - box.width * 0.1, cy);
    await page.mouse.down();
    await page.mouse.move(cx, cy, { steps: 8 });
    await page.mouse.move(cx + box.width * 0.1, cy, { steps: 8 });
    await page.mouse.up();

    const response = await putPromise;
    expect(response.status()).toBe(200);

    const { items } = await getSceneItems(request, campaign.id, scene.id);
    const fogs = fogItems(items);
    expect(fogs.length).toBeGreaterThanOrEqual(3);
    for (const f of fogs) {
      const pts = (f.shape as { points?: number[] }).points ?? [];
      expect(pts.length).toBeGreaterThanOrEqual(6);
      for (const p of pts) {
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
      }
      expect((f.metadata as { revealed: boolean }).revealed).toBe(true);
    }
    expect((fogs[0].shape as { points: number[] }).points.length % 2).toBe(0);
  });

  test('F3: Clear all fog elimina todas las regiones', async ({
    page,
    campaign,
    request,
  }) => {
    const scene = await createScene(request, campaign.id, 'Fog Clear');
    await putSceneItems(request, campaign.id, scene.id, [
      fogPolygon('fog-e2e-c1', false, 0.3, 0.3, 0.1),
      fogPolygon('fog-e2e-c2', true, 0.6, 0.6, 0.12),
    ]);
    await openScene(page, campaign.id, scene.id);

    const putPromise = page.waitForResponse(
      (res) =>
        res.url().includes(`/scenes/${scene.id}/items`) && res.request().method() === 'PUT',
      { timeout: 20_000 },
    );
    await page.getByRole('button', { name: /Build/i }).click();
    await page.getByRole('button', { name: /Clear all fog/ }).click();
    await expect(page.getByText(/fog regions removed/)).toBeVisible({ timeout: 10_000 });
    await putPromise;

    const { items } = await getSceneItems(request, campaign.id, scene.id);
    expect(fogItems(items)).toHaveLength(0);
  });

  test('F4: Zone fog toggle cubre y descubre una ShadowZone', async ({
    page,
    campaign,
    request,
  }) => {
    const scene = await createScene(request, campaign.id, 'Fog Zone Toggle');
    const zone: import('../helpers/api-helpers').SceneItem = {
      id: 'zone-e2e-f4',
      name: 'Sala Central',
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
      layer: 4,
      shape: { type: 'polygon', points: [0.3, 0.3, 0.6, 0.3, 0.6, 0.6, 0.3, 0.6], fill: '#334155' },
      metadata: {
        type: 'zone',
        zoneType: 'polygon',
        origin: 'manual',
        touchedByDm: true,
        shadowOnly: false,
        fillColor: '#334155',
        fillOpacity: 0.2,
        portals: [],
      },
    };
    await putSceneItems(request, campaign.id, scene.id, [zone]);
    const canvas = await openScene(page, campaign.id, scene.id);
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas sin boundingBox');

    const putPromise = page.waitForResponse(
      (res) =>
        res.url().includes(`/scenes/${scene.id}/items`) && res.request().method() === 'PUT',
      { timeout: 20_000 },
    );
    await page.getByRole('button', { name: /Build/i }).click();
    await page.getByRole('button', { name: /Zone fog \(toggle\)/ }).click();
    await expect(page.getByText('Click inside a zone to toggle fog')).toBeVisible();
    const cx = box.x + box.width * (0.3 + 0.15);
    const cy = box.y + box.height * (0.3 + 0.15);
    await page.mouse.click(cx, cy);
    await putPromise;
    await expect(page.getByText('fog covering zone')).toBeVisible({ timeout: 10_000 });

    let { items } = await getSceneItems(request, campaign.id, scene.id);
    const fogAfterHide = fogItems(items);
    expect(fogAfterHide).toHaveLength(1);
    expect((fogAfterHide[0].metadata as { revealed: boolean }).revealed).toBe(false);
    const pts = (fogAfterHide[0].shape as { points?: number[] }).points ?? [];
    expect(pts.length % 2).toBe(0);
    for (const p of pts) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }

    const putPromise2 = page.waitForResponse(
      (res) =>
        res.url().includes(`/scenes/${scene.id}/items`) && res.request().method() === 'PUT',
      { timeout: 20_000 },
    );
    await page.mouse.click(cx, cy);
    await putPromise2;
    await expect(page.getByText('fog cleared for zone')).toBeVisible({ timeout: 10_000 });

    ({ items } = await getSceneItems(request, campaign.id, scene.id));
    expect(fogItems(items)).toHaveLength(0);
    expect(items.some((i: import('../helpers/api-helpers').SceneItem) => i.id === 'zone-e2e-f4')).toBe(true);
  });
});