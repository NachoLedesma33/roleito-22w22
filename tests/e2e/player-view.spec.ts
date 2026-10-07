import { expect, test } from '../fixtures/campaign-fixture';
import type { Page } from '@playwright/test';
import {
  createCharacter,
  createNpc,
  createScene,
  generateInviteCode,
  seedTokens,
  updateCharacter,
  updateScene,
} from '../helpers/api-helpers';

test.describe('Player View', () => {
  function playerSheet(page: Page) {
    return page
      .locator('div.fixed')
      .filter({ has: page.getByRole('button', { name: 'Notas', exact: true }) });
  }

  async function setupActiveSceneWithTokens(
    request: import('@playwright/test').APIRequestContext,
    campaignId: string,
    sceneName = 'Taberna del Grifo',
  ) {
    const scene = await createScene(request, campaignId, sceneName);
    const char = await createCharacter(request, campaignId, { name: 'Aria' });
    const npc = await createNpc(request, campaignId, { name: 'Grimble' });
    await seedTokens(request, campaignId, scene.id, [
      { entityType: 'character', entityId: char.id, x: 1, z: 1 },
      { entityType: 'npc', entityId: npc.id, x: -1, z: 0 },
    ]);
    await updateScene(request, campaignId, scene.id, { status: 'active' });
    return { scene, char, npc };
  }

  test('PV1: invite link muestra campaña, escena activa y solo tokens visibles', async ({
    page,
    campaign,
    request,
  }) => {
    const { scene, char, npc } = await setupActiveSceneWithTokens(request, campaign.id);
    const hiddenNpc = await createNpc(request, campaign.id, { name: 'Espia Oculto' });
    await seedTokens(request, campaign.id, scene.id, [
      { entityType: 'character', entityId: char.id, x: 1, z: 1 },
      { entityType: 'npc', entityId: npc.id, x: -1, z: 0 },
      { entityType: 'npc', entityId: hiddenNpc.id, x: 2, z: 2, visible: false },
    ]);

    const code = await generateInviteCode(request, campaign.id);
    await page.goto(`/campaigns/join/${code}`);

    await expect(page.getByText(campaign.name)).toBeVisible();
    await expect(page.getByTestId('on-scene-list')).toContainText('On Scene (2)');
    await expect(page.getByTestId('on-scene-list')).toContainText('Aria');
    await expect(page.getByTestId('on-scene-list')).not.toContainText('Espia Oculto');
  });

  test('PV2: sync — token agregado por el DM aparece sin recargar', async ({
    page,
    campaign,
    request,
  }) => {
    const { scene, char, npc } = await setupActiveSceneWithTokens(request, campaign.id);
    const code = await generateInviteCode(request, campaign.id);

    await page.goto(`/campaigns/join/${code}`);
    await expect(page.getByTestId('on-scene-list')).toContainText('On Scene (2)');

    const nuevo = await createNpc(request, campaign.id, { name: 'Dain Enano' });
    await seedTokens(request, campaign.id, scene.id, [
      { entityType: 'character', entityId: char.id, x: 1, z: 1 },
      { entityType: 'npc', entityId: npc.id, x: -1, z: 0 },
      { entityType: 'npc', entityId: nuevo.id, x: 0, z: 3 },
    ]);

    await expect(page.getByTestId('on-scene-list')).toContainText('On Scene (3)', {
      timeout: 10_000,
    });
    await expect(page.getByTestId('on-scene-list')).toContainText('Dain Enano');
  });

  test('PV3: cambio de escena activa hace transición automática', async ({
    page,
    campaign,
    request,
  }) => {
    const sceneA = await createScene(request, campaign.id, 'Escena Uno PV3');
    const sceneB = await createScene(request, campaign.id, 'Escena Dos PV3');
    await updateScene(request, campaign.id, sceneA.id, { status: 'active' });
    const code = await generateInviteCode(request, campaign.id);

    await page.goto(`/campaigns/join/${code}`);
    await expect(
      page.locator('header').getByText('Escena Uno PV3'),
    ).toBeVisible();

    await updateScene(request, campaign.id, sceneA.id, { status: 'inactive' });
    await updateScene(request, campaign.id, sceneB.id, { status: 'active' });

    await expect(
      page.locator('header').getByText('Escena Dos PV3'),
      'el header debe mostrar la escena nueva tras el polling',
    ).toBeVisible({ timeout: 10_000 });
  });

  test('PV4: elegir personaje muestra ficha con PV en vivo', async ({
    page,
    campaign,
    request,
  }) => {
    await setupActiveSceneWithTokens(request, campaign.id);
    const mia = await createCharacter(request, campaign.id, {
      name: 'Borin',
      max_pv: 18,
      max_pm: 6,
      vigor: '+',
    });
    const code = await generateInviteCode(request, campaign.id);

    await page.goto(`/campaigns/join/${code}`);
    await expect(page.getByText('¿Quién sos?')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: /Borin/ }).click();
    await expect(playerSheet(page)).toBeVisible();
    await expect(playerSheet(page)).toContainText('18/18 PV');

    await updateCharacter(request, campaign.id, mia.id, { current_pv: 7 });
    await expect(playerSheet(page)).toContainText('7/18 PV', {
      timeout: 10_000,
    });
  });

  test('PV5: la elección persiste tras reload', async ({
    page,
    campaign,
    request,
  }) => {
    await setupActiveSceneWithTokens(request, campaign.id);
    await createCharacter(request, campaign.id, { name: 'Lyra' });
    const code = await generateInviteCode(request, campaign.id);

    await page.goto(`/campaigns/join/${code}`);
    await expect(page.getByText('¿Quién sos?')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /Lyra/ }).click();
    await expect(playerSheet(page)).toContainText('Lyra');

    await page.reload();
    await expect(playerSheet(page)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('¿Quién sos?')).toHaveCount(0);
  });

  test('PV6: botón cambiar personaje reabre el picker con opción espectador', async ({
    page,
    campaign,
    request,
  }) => {
    await setupActiveSceneWithTokens(request, campaign.id);
    await createCharacter(request, campaign.id, { name: 'Tomás' });
    const code = await generateInviteCode(request, campaign.id);

    await page.goto(`/campaigns/join/${code}`);
    await expect(page.getByText('¿Quién sos?')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /Tomás/ }).click();
    await expect(playerSheet(page)).toBeVisible();

    await page.getByRole('button', { name: 'Cambiar' }).click();
    await expect(page.getByText('¿Quién sos?')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar como espectador' })).toBeVisible();
  });

  test('PV7: código inválido muestra error', async ({ page }) => {
    await page.goto('/campaigns/join/codigo-inexistente-xyz');
    await expect(page.getByText(/Código de invitación inválido/)).toBeVisible({
      timeout: 10_000,
    });
  });

  test('PV8: tabs del player sheet muestran stats, inventory, spells y notes', async ({
    page,
    campaign,
    request,
  }) => {
    await setupActiveSceneWithTokens(request, campaign.id);
    await createCharacter(request, campaign.id, {
      name: 'Lyra',
      max_pv: 12,
      max_pm: 8,
      vigor: '+',
      intelligence: '/',
      dexterity: '-',
      cunning: '+',
    });
    const code = await generateInviteCode(request, campaign.id);

    await page.goto(`/campaigns/join/${code}`);
    await expect(page.getByText('¿Quién sos?')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /Lyra/ }).click();
    await expect(playerSheet(page)).toBeVisible();

    await expect(playerSheet(page)).toContainText('Stats');
    await expect(playerSheet(page)).toContainText('Vigor');
    await expect(playerSheet(page)).toContainText('12');

    await page.getByRole('button', { name: 'Inv' }).click();
    await expect(playerSheet(page)).toContainText('Vacío');

    await page.getByRole('button', { name: 'Hech' }).click();
    await expect(playerSheet(page)).toContainText('No hay hechizos');

    await page.getByRole('button', { name: 'Notas' }).click();
    await expect(playerSheet(page)).toContainText('Guardar notas');
  });

  test('PV9: notas del jugador se guardan y persisten', async ({
    page,
    campaign,
    request,
  }) => {
    await setupActiveSceneWithTokens(request, campaign.id);
    const char = await createCharacter(request, campaign.id, { name: 'Borin' });
    const code = await generateInviteCode(request, campaign.id);

    await page.goto(`/campaigns/join/${code}`);
    await expect(page.getByText('¿Quién sos?')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /Borin/ }).click();
    await expect(playerSheet(page)).toBeVisible();

    await page.getByRole('button', { name: 'Notas' }).click();
    const textarea = playerSheet(page).getByPlaceholder('Mis notas del personaje...');
    await expect(textarea).toBeVisible();
    await textarea.fill('Mi nota de prueba PV9');

    const putPromise = page.waitForResponse(
      (res) => res.url().includes(`/characters/${char.id}`) && res.request().method() === 'PUT',
    );
    await page.getByRole('button', { name: 'Guardar notas' }).click();
    const putRes = await putPromise;
    expect(putRes.ok()).toBeTruthy();

    const body = await putRes.json();
    expect(body.player_notes).toBe('Mi nota de prueba PV9');

    await page.reload();
    await expect(playerSheet(page)).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Notas' }).click();
    const textareaAfter = playerSheet(page).getByPlaceholder('Mis notas del personaje...');
    await expect(textareaAfter).toHaveValue('Mi nota de prueba PV9', { timeout: 10_000 });
  });

  test('PV10: export a Markdown descarga archivo', async ({
    page,
    campaign,
    request,
  }) => {
    await setupActiveSceneWithTokens(request, campaign.id);
    await createCharacter(request, campaign.id, {
      name: 'Cedric',
      max_pv: 15,
      max_pm: 10,
      vigor: '+',
    });
    const code = await generateInviteCode(request, campaign.id);

    await page.goto(`/campaigns/join/${code}`);
    await expect(page.getByText('¿Quién sos?')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /Cedric/ }).click();
    await expect(playerSheet(page)).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByTitle('Exportar ficha como Markdown').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/Cedric.*\.md/);
    const content = await download.path().then(async (p) => {
      if (!p) return '';
      const fs = await import('node:fs');
      return fs.readFileSync(p, 'utf-8');
    });
    expect(content).toContain('Cedric');
    expect(content).toContain('Vigor');
  });

  test('PV11: WebSocket — push de revisión sin polling de 16ms', async ({
    page,
    campaign,
    request,
  }) => {
    const { scene, char, npc } = await setupActiveSceneWithTokens(request, campaign.id);
    const code = await generateInviteCode(request, campaign.id);

    let revReqs = 0;
    await page.route('**/campaigns/invite/*/revision', async (route) => {
      revReqs += 1;
      await route.continue();
    });

    await page.goto(`/campaigns/join/${code}`);
    await expect(page.getByTestId('on-scene-list')).toContainText('On Scene (2)');

    // dejar que el WS abra y el polling inicial se asiente
    await page.waitForTimeout(2000);
    const baseline = revReqs;

    // con WS activo no debe haber polling periódico de revisión
    await page.waitForTimeout(2000);
    expect(revReqs).toBe(baseline);

    // mutación del DM → el WS despierta al player con un solo chequeo
    await seedTokens(request, campaign.id, scene.id, [
      { entityType: 'character', entityId: char.id, x: 2, z: 2 },
      { entityType: 'npc', entityId: npc.id, x: -1, z: 0 },
    ]);
    await page.waitForTimeout(1500);
    expect(revReqs).toBeGreaterThan(baseline);
    await expect(page.getByTestId('on-scene-list')).toContainText('On Scene (2)');
  });

  test('PV12: usar un hechizo gasta PM y se bloquea cuando no alcanzan', async ({
    page,
    campaign,
    request,
  }) => {
    await setupActiveSceneWithTokens(request, campaign.id);
    const char = await createCharacter(request, campaign.id, { name: 'Sera', max_pm: 8 });
    const put = await request.put(
      `http://localhost:8000/api/campaigns/${campaign.id}/characters/${char.id}`,
      {
        data: {
          spells_json: [
            { id: 'spell-luz', name: 'Luz', description: '', level: 1, cost_pm: 3 },
          ],
        },
      },
    );
    expect(put.status()).toBe(200);
    const code = await generateInviteCode(request, campaign.id);

    await page.goto(`/campaigns/join/${code}`);
    await expect(page.getByText('¿Quién sos?')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /Sera/ }).click();
    await expect(playerSheet(page)).toBeVisible();

    await page.getByRole('button', { name: 'Hech' }).click();
    await expect(playerSheet(page)).toContainText('Luz');
    // la pestaña muestra los PM que le quedan al jugador
    await expect(playerSheet(page)).toContainText('8/8 PM');

    const usar = playerSheet(page).getByRole('button', { name: 'Usar' });
    await expect(usar).toBeEnabled();
    await usar.click();
    await expect(playerSheet(page)).toContainText('5/8 PM');
    await usar.click();
    await expect(playerSheet(page)).toContainText('2/8 PM');

    // 3 PM no alcanzan para un tercero: queda deshabilitado, no falla a ciegas
    await expect(usar).toBeDisabled();

    // el descuento quedó en el back, no solo en el DOM
    const stored = await request.get(
      `http://localhost:8000/api/campaigns/${campaign.id}/characters/${char.id}`,
    );
    expect((await stored.json()).current_pm).toBe(2);
  });
});
