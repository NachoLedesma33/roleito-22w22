import { expect, test } from '../fixtures/campaign-fixture';
import {
  assetExists,
  createCharacter,
  createNpc,
  createScene,
  getSceneCharacters,
  listScenes,
  loadAsset,
  PNG_1PX,
  seedToken,
  uploadBackground,
  uploadPortrait,
} from '../helpers/api-helpers';

const TAVERN_MAP = 'maps/tavern-1536.jpg';

async function openSceneWithBackground(
  page: import('@playwright/test').Page,
  campaignId: string,
  sceneId: string,
) {
  await page.goto(`/campaigns/${campaignId}`);
  await page.locator('header select').selectOption(sceneId);
  const bg = assetExists(TAVERN_MAP) ? loadAsset(TAVERN_MAP) : null;
  await page.setInputFiles(
    'header input[type="file"]',
    bg
      ? { name: bg.name, mimeType: bg.mimeType, buffer: bg.buffer }
      : { name: 'bg.png', mimeType: 'image/png', buffer: PNG_1PX },
  );

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
  await expect(canvas).toBeVisible();
  return canvas;
}

test.describe('Dashboard VTT Core', () => {
  test('D1: carga campaña con escenas listadas', async ({ page, campaign, request }) => {
    await createScene(request, campaign.id, 'Escena Uno');

    await page.goto(`/campaigns/${campaign.id}`);

    await expect(page.getByRole('link', { name: campaign.name })).toBeVisible();
    await expect(page.locator('header select')).toContainText('Escena Uno');
    await expect(page.getByText('1/1')).toBeVisible();
  });

  test('D2: selecciona escena y renderiza canvas con background', async ({ page, campaign, request }) => {
    const scene = await createScene(request, campaign.id, 'Escena Dos');

    await page.goto(`/campaigns/${campaign.id}`);
    await page.locator('header select').selectOption(scene.id);

    await expect(page.getByText('No scene selected')).toBeVisible();

    const bg = assetExists(TAVERN_MAP) ? loadAsset(TAVERN_MAP) : null;
    await page.setInputFiles(
      'header input[type="file"]',
      bg
        ? { name: bg.name, mimeType: bg.mimeType, buffer: bg.buffer }
        : { name: 'bg.png', mimeType: 'image/png', buffer: PNG_1PX },
    );

    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('No scene selected')).toHaveCount(0);
  });

  test('D3: coloca token en escena desde el tray', async ({ page, campaign, request }) => {
    const scene = await createScene(request, campaign.id, 'Escena Tres');
    await createCharacter(request, campaign.id, { name: 'Aria' });

    await openSceneWithBackground(page, campaign.id, scene.id);

    await expect(page.getByText('On Scene (0)')).toBeVisible();
    await expect(page.getByText('No tokens placed')).toBeVisible();

    await page.getByRole('button', { name: 'Aria' }).click();

    await expect(page.getByText('On Scene (1)')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('No tokens placed')).toHaveCount(0);

    const sceneChars = await getSceneCharacters(request, campaign.id, scene.id);
    expect(sceneChars).toHaveLength(1);
    expect(sceneChars[0].entity_id).toBeTruthy();
  });

  test('D4: arrastra token y persiste nueva posición', async ({ page, campaign, request }) => {
    const scene = await createScene(request, campaign.id, 'Escena Cuatro');
    const char = await createCharacter(request, campaign.id, { name: 'Borin' });
    const seeded = await seedToken(request, campaign.id, scene.id, 'character', char.id, 0, 0);
    const sceneCharId = seeded[0].id;

    await openSceneWithBackground(page, campaign.id, scene.id);
    await expect(page.getByText('On Scene (1)')).toBeVisible();

    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas sin boundingBox');

    const putPromise = page.waitForResponse(
      (res) =>
        res.url().includes(`/scenes/${scene.id}/characters`) &&
        res.request().method() === 'PUT',
      { timeout: 15_000 },
    );

    await canvas.evaluate(
      (el, id) => {
        const c = el as HTMLCanvasElement & {
          __startDrag?: (sceneCharId: string, x: number, z: number) => void;
        };
        if (!c.__startDrag) throw new Error('__startDrag no disponible');
        c.__startDrag(id, 0, 0);
      },
      sceneCharId,
    );

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 - 60, { steps: 10 });
    await page.mouse.up();

    const response = await putPromise;
    expect(response.status()).toBe(200);

    const sceneChars = await getSceneCharacters(request, campaign.id, scene.id);
    expect(sceneChars).toHaveLength(1);
    expect(
      sceneChars[0].x !== 0 || sceneChars[0].z !== 0,
      `token no se movió: x=${sceneChars[0].x}, z=${sceneChars[0].z}`,
    ).toBe(true);
  });

  test('D5: click en token abre character sheet con datos', async ({ page, campaign, request }) => {
    const scene = await createScene(request, campaign.id, 'Escena Sheet');
    const char = await createCharacter(request, campaign.id, {
      name: 'Cedric',
      vigor: '+',
      intelligence: '/',
      dexterity: '-',
      cunning: '/',
      max_pv: 13,
      max_pm: 8,
    });
    await seedToken(request, campaign.id, scene.id, 'character', char.id, 0, 0);

    await page.goto(`/campaigns/${campaign.id}`);
    await expect(page.getByText('On Scene (1)')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Cedric' }).click();

    const sheet = page.getByText('Cedric — Sheet');
    await expect(sheet).toBeVisible();
    await expect(page.getByText('Max PV')).toBeVisible();
    await expect(page.locator('input.text-red-400')).toHaveValue('13');
    await expect(page.locator('input.text-blue-400')).toHaveValue('8');
  });

  test('D6: tecla D abre dice roller y Escape cierra', async ({ page, campaign }) => {
    await page.goto(`/campaigns/${campaign.id}`);
    await expect(page.getByTitle('Roll dice (D)')).toBeVisible();

    await page.keyboard.press('d');
    await expect(page.getByText('Dice Roller')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByText('Dice Roller')).toHaveCount(0);
  });

  test('D7: tecla N abre notebook y Escape cierra', async ({ page, campaign }) => {
    await page.goto(`/campaigns/${campaign.id}`);
    await expect(page.getByTitle('DM Notebook (N)')).toBeVisible();

    await page.keyboard.press('n');
    await expect(page.getByText('DM Notebook').first()).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByText('DM Notebook')).toHaveCount(0);
  });

  test('D8: tecla R abre recap y Escape cierra', async ({ page, campaign }) => {
    await page.goto(`/campaigns/${campaign.id}`);
    await expect(page.getByTitle('Session Recap (R)')).toBeVisible();

    await page.keyboard.press('r');
    await expect(page.getByText('Session Recap')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByText('Session Recap')).toHaveCount(0);
  });

  test('D9: background y retratos reales renderizan sin errores de textura @showcase', async ({ page, campaign, request }) => {
    test.skip(!assetExists(TAVERN_MAP), 'assets de demo no descargados (ver tests/assets/README.md)');

    const webglErrors: string[] = [];
    page.on('console', (m) => {
      if (/texSubImage|INVALID_VALUE/i.test(m.text())) webglErrors.push(m.text());
    });
    const staticFailures: string[] = [];
    page.on('requestfailed', (req) => {
      if (req.url().includes('/api/static/')) staticFailures.push(`${req.url()}: ${req.failure()?.errorText}`);
    });

    const scene = await createScene(request, campaign.id, 'Escena Real');
    await uploadBackground(request, campaign.id, scene.id, loadAsset(TAVERN_MAP));

    const aria = await createCharacter(request, campaign.id, { name: 'Aria' });
    await uploadPortrait(
      request,
      campaign.id,
      'character',
      aria.id,
      loadAsset('portraits/velazquez_portraits/female_01.png'),
    );
    const dain = await createNpc(request, campaign.id, {
      name: 'Capitán Dain',
      description: 'Guardia retirado que bebe en la esquina.',
    });
    await uploadPortrait(
      request,
      campaign.id,
      'npc',
      dain.id,
      loadAsset('portraits/velazquez_portraits/male_12.png'),
    );
    await seedToken(request, campaign.id, scene.id, 'character', aria.id, 0, 0);

    const portraitLoaded = page.waitForResponse(
      (res) =>
        res.url().includes(`/api/static/`) &&
        res.url().includes(aria.id) &&
        res.request().resourceType() === 'image' &&
        res.status() === 200,
      { timeout: 15_000 },
    );

    await page.goto(`/campaigns/${campaign.id}`);
    await page.locator('header select').selectOption(scene.id);
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('No scene selected')).toHaveCount(0);
    await page.waitForTimeout(1500);

    const seeded = (await listScenes(request, campaign.id)).find((s) => s.id === scene.id);
    expect(seeded?.background_path).toBeTruthy();
    const bgUrl = `http://localhost:8000/api/static/${seeded!.background_path!
      .replace(/\\/g, '/')
      .split('/assets/')[1]}`;

    const stats = await page.evaluate(async (url) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = url;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 64;
      const ctx = c.getContext('2d');
      if (!ctx) throw new Error('sin contexto 2d');
      ctx.drawImage(img, 0, 0, 64, 64);
      const data = ctx.getImageData(0, 0, 64, 64).data;
      const colors = new Set<string>();
      let black = 0;
      for (let i = 0; i < data.length; i += 4) {
        colors.add(`${data[i] >> 4},${data[i + 1] >> 4},${data[i + 2] >> 4}`);
        if (data[i] + data[i + 1] + data[i + 2] < 15) black++;
      }
      return { w: img.naturalWidth, h: img.naturalHeight, colors: colors.size, black };
    }, bgUrl);

    expect(stats.w, 'imagen decodifica con dimensiones reales').toBeGreaterThan(256);
    expect(stats.colors, 'variedad de colores (no plano negro)').toBeGreaterThan(30);
    expect(stats.black / (64 * 64), 'menos del 50% de pixeles negros').toBeLessThan(0.5);

    const portraitRes = await portraitLoaded;
    expect(portraitRes.status()).toBe(200);

    expect(webglErrors, `errores WebGL: ${webglErrors.join(' | ')}`).toHaveLength(0);
    expect(staticFailures, `requests estáticos fallidos: ${staticFailures.join(' | ')}`).toHaveLength(0);
  });
});
