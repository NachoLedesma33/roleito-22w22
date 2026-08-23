import { expect, test } from '../fixtures/campaign-fixture';
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
    await expect(page.getByTestId('player-sheet')).toBeVisible();
    await expect(page.getByTestId('player-sheet')).toContainText('18/18 PV');

    await updateCharacter(request, campaign.id, mia.id, { current_pv: 7 });
    await expect(page.getByTestId('player-sheet')).toContainText('7/18 PV', {
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
    await expect(page.getByTestId('player-sheet')).toContainText('Lyra');

    await page.reload();
    await expect(page.getByTestId('player-sheet')).toBeVisible({ timeout: 10_000 });
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
    await expect(page.getByTestId('player-sheet')).toBeVisible();

    await page.getByRole('button', { name: 'Cambiar' }).click();
    await expect(page.getByText('¿Quién sos?')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar como espectador' })).toBeVisible();
  });

  test('PV7: código inválido muestra error', async ({ page }) => {
    await page.goto('/campaigns/join/codigo-inexistente-xyz');
    await expect(page.getByText(/Invalid invite code|Failed to join/)).toBeVisible({
      timeout: 10_000,
    });
  });
});
