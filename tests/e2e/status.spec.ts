import { expect, test } from '../fixtures/campaign-fixture';
import {
  createCharacter,
  createScene,
  generateInviteCode,
  PNG_1PX,
  seedTokens,
  updateScene,
  uploadBackground,
} from '../helpers/api-helpers';

async function openTokenMenu(
  page: import('@playwright/test').Page,
  sceneId: string,
  request: import('@playwright/test').APIRequestContext,
  campaignId: string,
  fresh = false,
) {
  if (fresh) {
    await uploadBackground(request, campaignId, sceneId, {
      name: 'bg.png',
      mimeType: 'image/png',
      buffer: PNG_1PX,
    });
    await page.goto(`/campaigns/${campaignId}`);
    await page.locator('header select').selectOption(sceneId);
  }
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
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  // El sprite del token compite con el piso en el hit-test del centro; probar
  // varios offsets verticales hasta que abra el menú del token.
  const menu = page.getByTestId('context-menu').first();
  for (const dy of [0, -24, -48, 24, 48, -72, 72]) {
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2 + dy, {
      button: 'right',
    });
    try {
      await expect(menu).toBeVisible({ timeout: 1500 });
      return;
    } catch {
      // próximo offset
    }
  }
  throw new Error('Context menu never opened');
}

test.describe('Status markers', () => {
  test('S1: DM marca y desmarca status en el token (persiste via API)', async ({
    page,
    campaign,
    request,
  }) => {
    const scene = await createScene(request, campaign.id, 'Escena Status');
    const aria = await createCharacter(request, campaign.id, { name: 'Aria' });
    await seedTokens(request, campaign.id, scene.id, [
      { entityType: 'character', entityId: aria.id, x: 0, z: 0 },
    ]);

    await page.goto(`/campaigns/${campaign.id}`);
    await expect(page.getByText('On Scene (1)')).toBeVisible({ timeout: 10_000 });

    await openTokenMenu(page, scene.id, request, campaign.id, true);
    await page.getByRole('button', { name: /Marcar Envenenado/ }).click();

    const chs = await (
      await request.get(
        `http://localhost:8000/api/campaigns/${campaign.id}/scenes/${scene.id}/characters`
      )
    ).json();
    expect(chs[0].statuses).toContain('poisoned');
    // Esperar a que el estado local del tablero refleje el cambio antes de reabrir.
    await page.waitForTimeout(400);

    // Reabrir menú (sin recargar) → el item ahora ofrece quitarlo.
    await openTokenMenu(page, scene.id, request, campaign.id);
    const removeBtn = page.getByRole('button', { name: /Quitar Envenenado/ });
    await expect(removeBtn).toBeVisible();
    await removeBtn.click();

    const after = await (
      await request.get(
        `http://localhost:8000/api/campaigns/${campaign.id}/scenes/${scene.id}/characters`
      )
    ).json();
    expect(after[0].statuses).toEqual([]);
  });

  test('S2: status llega al snapshot del jugador', async ({
    page,
    campaign,
    request,
    browser,
  }) => {
    const scene = await createScene(request, campaign.id, 'Escena Status2');
    const aria = await createCharacter(request, campaign.id, { name: 'Aria' });
    await seedTokens(request, campaign.id, scene.id, [
      { entityType: 'character', entityId: aria.id, x: 0, z: 0 },
    ]);
    await updateScene(request, campaign.id, scene.id, { status: 'active' });
    const code = await generateInviteCode(request, campaign.id);

    await page.goto(`/campaigns/${campaign.id}`);
    await expect(page.getByText('On Scene (1)')).toBeVisible({ timeout: 10_000 });

    await openTokenMenu(page, scene.id, request, campaign.id, true);
    await page.getByRole('button', { name: /Marcar Concentrando/ }).click();

    // El click dispara el marca async; esperar el status en el snapshot (race-safe).
    await expect
      .poll(async () => {
        const snap = (await (
          await request.get(`http://localhost:8000/api/campaigns/invite/${code}`)
        ).json()) as { characters: Array<{ statuses?: string[]; entity_id: string }> };
        return snap.characters[0].statuses ?? [];
      }, { timeout: 10_000 })
      .toContain('concentrating');

    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.goto(`/campaigns/join/${code}`);
    await p.getByRole('button', { name: /Aria/ }).click();
    await expect(p.getByTestId('player-role')).toContainText('Aria', { timeout: 10_000 });
    // El jugador recibe el status en su snapshot (la badge 3D no es assertable en DOM).
    await ctx.close();
  });

  test('S3: statuses multi marca via API directa → llegan al snapshot del jugador', async ({
    campaign,
    request,
  }) => {
    const scene = await createScene(request, campaign.id, 'Escena Status3');
    const aria = await createCharacter(request, campaign.id, { name: 'Aria' });
    await seedTokens(request, campaign.id, scene.id, [
      { entityType: 'character', entityId: aria.id, x: 0, z: 0 },
    ]);
    await updateScene(request, campaign.id, scene.id, { status: 'active' });
    const code = await generateInviteCode(request, campaign.id);

    const base = await (
      await request.get(
        `http://localhost:8000/api/campaigns/${campaign.id}/scenes/${scene.id}/characters`
      )
    ).json();
    expect(base[0].entity_id).toBe(aria.id);

    await request.put(
      `http://localhost:8000/api/campaigns/${campaign.id}/scenes/${scene.id}/characters`,
      { data: [{ ...base[0], statuses: ['bleeding', 'invisible'] }] }
    );

    const snap = await (
      await request.get(`http://localhost:8000/api/campaigns/invite/${code}`)
    ).json();
    const ch = snap.characters.find((c: { entity_id: string }) => c.entity_id === aria.id);
    expect(ch).toBeDefined();
    expect(ch.statuses).toContain('bleeding');
    expect(ch.statuses).toContain('invisible');
  });
});