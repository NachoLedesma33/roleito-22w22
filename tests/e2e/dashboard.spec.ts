import { expect, test } from '../fixtures/campaign-fixture';
import { createCharacter, createScene, getSceneCharacters, PNG_1PX, seedToken } from '../helpers/api-helpers';

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

    await page.setInputFiles('header input[type="file"]', {
      name: 'bg.png',
      mimeType: 'image/png',
      buffer: PNG_1PX,
    });

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
      vigor: 4,
      intelligence: 3,
      dexterity: 5,
      cunning: 2,
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
});
