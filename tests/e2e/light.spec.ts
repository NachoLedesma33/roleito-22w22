import { expect, test } from '../fixtures/campaign-fixture';
import {
  createCharacter,
  createScene,
  getSceneItems,
  putSceneItems,
  seedToken,
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

function lightItem(id: string, presetLike: Record<string, unknown>) {
  return {
    id,
    name: 'Torch',
    x: 0,
    y: 0,
    zIndex: 10,
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
    metadata: { type: 'light', source: presetLike },
  };
}

function lightItems(items: import('../helpers/api-helpers').SceneItem[]) {
  return items.filter((i) => i.metadata?.type === 'light');
}

test.describe('Lighting (Phase E)', () => {
  test('E-l1: light item inyectado sobrevive roundtrip y no rompe render', async ({
    page,
    campaign,
    request,
  }) => {
    const scene = await createScene(request, campaign.id, 'Light Inject');
    await putSceneItems(request, campaign.id, scene.id, [
      lightItem('light-e2e-1', { mode: 'hard', color: '#ff9d45', intensity: 0.85, radius: 0.15 }),
      lightItem('light-e2e-2', { mode: 'directional', color: '#ffe08a', intensity: 0.9, radius: 0.3, angle: 90, direction: 0, falloff: 0.6 }),
    ]);
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await openScene(page, campaign.id, scene.id);

    expect(errors).toHaveLength(0);
    const { items } = await getSceneItems(request, campaign.id, scene.id);
    const lights = lightItems(items);
    expect(lights).toHaveLength(2);
    expect((lights.find((l) => l.id === 'light-e2e-2')?.metadata as { source: { mode: string } }).source.mode).toBe('directional');
  });

  test('E-l2: tool Light (place) coloca una luz y persiste', async ({
    page,
    campaign,
    request,
  }) => {
    const scene = await createScene(request, campaign.id, 'Light Place');
    const canvas = await openScene(page, campaign.id, scene.id);

    await page.getByRole('button', { name: /Build/i }).click();
    await page.getByRole('button', { name: /Light \(place\)/ }).click();
    await expect(page.getByText('Click to place light')).toBeVisible();

    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas sin boundingBox');

    const putPromise = page.waitForResponse(
      (res) =>
        res.url().includes(`/scenes/${scene.id}/items`) && res.request().method() === 'PUT',
      { timeout: 20_000 },
    );

    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
    const response = await putPromise;
    expect(response.status()).toBe(200);

    const { items } = await getSceneItems(request, campaign.id, scene.id);
    const lights = lightItems(items);
    expect(lights).toHaveLength(1);
    expect(lights[0].name).toBe('Torch');
    expect((lights[0].metadata as { source: { mode: string } }).source.mode).toBe('hard');
  });

  test('E-l3: light adjunta a token sobrevive roundtrip y render no rompe', async ({
    page,
    campaign,
    request,
  }) => {
    const scene = await createScene(request, campaign.id, 'Light Attach Inject');
    const char = await createCharacter(request, campaign.id, { name: 'Bruma Guard' });
    const [token] = await seedToken(request, campaign.id, scene.id, 'character', char.id, 0, 0);
    const withAttach = {
      ...lightItem('light-e2e-a1', { mode: 'hard', color: '#ff9d45', intensity: 0.85, radius: 0.15 }),
      metadata: { type: 'light', attachedTo: token.id, source: { mode: 'hard', color: '#ff9d45', intensity: 0.85, radius: 0.15 } },
    };
    await putSceneItems(request, campaign.id, scene.id, [withAttach]);
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await openScene(page, campaign.id, scene.id);

    expect(errors).toHaveLength(0);
    const { items } = await getSceneItems(request, campaign.id, scene.id);
    const lights = lightItems(items);
    expect(lights).toHaveLength(1);
    expect((lights[0].metadata as { attachedTo: string }).attachedTo).toBe(token.id);
  });
});
