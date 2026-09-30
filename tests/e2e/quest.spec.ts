import { expect, test } from '../fixtures/campaign-fixture';
import {
  createCharacter,
  createScene,
  generateInviteCode,
  seedTokens,
  updateScene,
} from '../helpers/api-helpers';

test.describe('Quest Board', () => {
  test('Q1: DM crea quest por UI y el jugador la ve en su panel', async ({
    page,
    campaign,
    request,
    browser,
  }) => {
    const scene = await createScene(request, campaign.id, 'Escena Quest');
    const aria = await createCharacter(request, campaign.id, { name: 'Aria' });
    await seedTokens(request, campaign.id, scene.id, [
      { entityType: 'character', entityId: aria.id, x: 0, z: 0 },
    ]);
    await updateScene(request, campaign.id, scene.id, { status: 'active' });
    const code = await generateInviteCode(request, campaign.id);

    await page.goto(`/campaigns/${campaign.id}`);
    await expect(page.getByText('On Scene (1)')).toBeVisible({ timeout: 10_000 });
    await page.getByTitle('Tablón de misiones').click();
    await page.getByRole('button', { name: '＋ Nueva misión' }).click();
    await page.getByPlaceholder('Título de la misión').fill('Recuperar el Barril');
    await page.getByPlaceholder('Descripción').fill('El gremio exige rescate.');
    await page.getByRole('button', { name: '＋ objetivo' }).click();
    await page.getByPlaceholder('Objetivo 1').fill('Hablar con Grimble');
    await page.getByPlaceholder('Recompensa (ej: 100 po)').fill('100 gp');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Recuperar el Barril')).toBeVisible();
    await expect(page.getByText('Hablar con Grimble')).toBeVisible();

    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.goto(`/campaigns/join/${code}`);
    await p.getByRole('button', { name: /Aria/ }).click();
    await expect(p.getByTestId('player-role')).toContainText('Aria', { timeout: 10_000 });
    await p.getByTitle('Misiones').click();
    await expect(p.getByText('Recuperar el Barril')).toBeVisible();
    await expect(p.getByText('Hablar con Grimble')).toBeVisible();
    await expect(p.getByText('🏆 100 gp')).toBeVisible();
    await ctx.close();
  });

  test('Q2: completed va a Archivo, draft nunca aparece al jugador', async ({
    campaign,
    request,
    browser,
  }) => {
    const scene = await createScene(request, campaign.id, 'Escena Quest2');
    const aria = await createCharacter(request, campaign.id, { name: 'Aria' });
    await seedTokens(request, campaign.id, scene.id, [
      { entityType: 'character', entityId: aria.id, x: 0, z: 0 },
    ]);
    await updateScene(request, campaign.id, scene.id, { status: 'active' });
    const code = await generateInviteCode(request, campaign.id);

    await request.post(`/api/campaigns/${campaign.id}/quests`, {
      data: {
        title: 'Vencer al ogro',
        status: 'completed',
        objectives: [{ label: 'Ganar', done: true }],
        reward: 'Fama',
        visible_to_players: true,
      },
    });
    await request.post(`/api/campaigns/${campaign.id}/quests`, {
      data: { title: 'Borrador secreto', status: 'draft', visible_to_players: false },
    });

    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.goto(`/campaigns/join/${code}`);
    await p.getByRole('button', { name: /Aria/ }).click();
    await expect(p.getByTestId('player-role')).toContainText('Aria', { timeout: 10_000 });
    await p.getByTitle('Misiones').click();
    await expect(p.getByText('Vencer al ogro')).toBeVisible();
    await expect(p.getByText('Archivo')).toBeVisible();
    await expect(p.getByText('Borrador secreto')).toHaveCount(0);
    await ctx.close();
  });

  test('Q3: toggle 👁 oculta y restaura la quest para players', async ({
    page,
    campaign,
    request,
    browser,
  }) => {
    const scene = await createScene(request, campaign.id, 'Escena Quest3');
    const aria = await createCharacter(request, campaign.id, { name: 'Aria' });
    await seedTokens(request, campaign.id, scene.id, [
      { entityType: 'character', entityId: aria.id, x: 0, z: 0 },
    ]);
    await updateScene(request, campaign.id, scene.id, { status: 'active' });
    const code = await generateInviteCode(request, campaign.id);

    await request.post(`/api/campaigns/${campaign.id}/quests`, {
      data: {
        title: 'El último refugio',
        status: 'active',
        objectives: [],
        reward: '',
        visible_to_players: true,
      },
    });

    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.goto(`/campaigns/join/${code}`);
    await p.getByRole('button', { name: /Aria/ }).click();
    await expect(p.getByTestId('player-role')).toContainText('Aria', { timeout: 10_000 });
    await p.getByTitle('Misiones').click();
    await expect(p.getByText('El último refugio')).toBeVisible();

    await page.goto(`/campaigns/${campaign.id}`);
    await expect(page.getByText('On Scene (1)')).toBeVisible({ timeout: 10_000 });
    await page.getByTitle('Tablón de misiones').click();
    await page.getByTitle('Visible para jugadores').click();
    await expect(page.getByTitle('Oculta para jugadores')).toBeVisible();

    await p.getByRole('button', { name: '⟳ Recargar' }).click();
    await expect(p.getByText('El último refugio')).toHaveCount(0);

    await page.getByTitle('Oculta para jugadores').click();
    await expect(page.getByTitle('Visible para jugadores')).toBeVisible();

    await p.getByRole('button', { name: '⟳ Recargar' }).click();
    await expect(p.getByText('El último refugio')).toBeVisible();
    await ctx.close();
  });
});