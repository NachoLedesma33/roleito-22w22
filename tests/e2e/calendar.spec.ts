import { expect, test } from '../fixtures/campaign-fixture';
import {
  createCharacter,
  createScene,
  generateInviteCode,
  seedTokens,
  updateScene,
} from '../helpers/api-helpers';

test.describe('Calendar & Progress Clocks', () => {
  test('C1: DM avanza el calendario y el jugador ve la nueva fecha', async ({
    page,
    campaign,
    request,
    browser,
  }) => {
    const scene = await createScene(request, campaign.id, 'Escena Cal');
    const aria = await createCharacter(request, campaign.id, { name: 'Aria' });
    await seedTokens(request, campaign.id, scene.id, [
      { entityType: 'character', entityId: aria.id, x: 0, z: 0 },
    ]);
    await updateScene(request, campaign.id, scene.id, { status: 'active' });
    const code = await generateInviteCode(request, campaign.id);

    await page.goto(`/campaigns/${campaign.id}`);
    await expect(page.getByText('On Scene (1)')).toBeVisible({ timeout: 10_000 });
    await page.getByTitle('Calendar & Clocks').click();
    await expect(page.getByText('1 de Enero de 1')).toBeVisible();

    await page.getByTitle('Avanzar un día').click();
    await expect(page.getByText('2 de Enero de 1')).toBeVisible();
    await page.getByTitle('Avanzar una semana').click();
    await expect(page.getByText('9 de Enero de 1')).toBeVisible();

    // El jugador ve la misma fecha.
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.goto(`/campaigns/join/${code}`);
    await p.getByRole('button', { name: /Aria/ }).click();
    await expect(p.getByTestId('player-role')).toContainText('Aria', { timeout: 10_000 });
    await p.getByTitle('Calendario').click();
    await expect(p.getByText('9 de Enero de 1')).toBeVisible();
    await ctx.close();
  });

  test('C2: DM crea/tickea/oculta un clock; el jugador ve solo los visibles', async ({
    page,
    campaign,
    request,
    browser,
  }) => {
    const scene = await createScene(request, campaign.id, 'Escena Cal2');
    const aria = await createCharacter(request, campaign.id, { name: 'Aria' });
    await seedTokens(request, campaign.id, scene.id, [
      { entityType: 'character', entityId: aria.id, x: 0, z: 0 },
    ]);
    await updateScene(request, campaign.id, scene.id, { status: 'active' });
    const code = await generateInviteCode(request, campaign.id);

    await page.goto(`/campaigns/${campaign.id}`);
    await expect(page.getByText('On Scene (1)')).toBeVisible({ timeout: 10_000 });
    await page.getByTitle('Calendar & Clocks').click();

    await page.getByPlaceholder('Nuevo reloj (ritual, doom timer…)').fill('Ritual de invocación');
    await page.getByRole('combobox').last().selectOption('6');
    await page.getByRole('button', { name: 'Añadir' }).click();
    await expect(page.getByText('Ritual de invocación')).toBeVisible();

    // Tick +2 segmentos (poll para esperar la actualización de estado).
    const getFilled = async () =>
      (
        await (
          await request.get(`http://localhost:8000/api/campaigns/${campaign.id}/calendar`)
        ).json()
      ).clocks[0].segments_filled;
    await page.getByTitle('Marcar un segmento').click();
    await expect.poll(getFilled).toBe(1);
    await page.getByTitle('Marcar un segmento').click();
    await expect.poll(getFilled).toBe(2);

    // Ocultar al jugador.
    await page.getByTitle('Visible para jugadores').click();
    await expect
      .poll(async () => {
        const s = await (
          await request.get(`http://localhost:8000/api/campaigns/${campaign.id}/calendar`)
        ).json();
        return s.clocks[0].visible_to_players;
      })
      .toBe(false);

    // El jugador no ve el clock oculto.
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.goto(`/campaigns/join/${code}`);
    await p.getByRole('button', { name: /Aria/ }).click();
    await expect(p.getByTestId('player-role')).toContainText('Aria', { timeout: 10_000 });
    await p.getByTitle('Calendario').click();
    await expect(p.getByText('Ritual de invocación')).not.toBeVisible();
    await ctx.close();
  });
});