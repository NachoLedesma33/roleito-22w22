import { expect, test } from '../fixtures/campaign-fixture';
import {
  createCharacter,
  createScene,
  generateInviteCode,
  seedTokens,
  updateScene,
} from '../helpers/api-helpers';

test.describe('Initiative Tracker', () => {
  async function openWithTwoCombatants(
    page: import('@playwright/test').Page,
    campaignId: string,
    sceneId: string,
    request: import('@playwright/test').APIRequestContext,
    charA: { id: string },
    charB: { id: string },
  ) {
    await seedTokens(request, campaignId, sceneId, [
      { entityType: 'character', entityId: charA.id, x: 0, z: 0 },
      { entityType: 'character', entityId: charB.id, x: 1, z: 1 },
    ]);

    await page.goto(`/campaigns/${campaignId}`);
    await expect(page.getByText('On Scene (2)')).toBeVisible({ timeout: 10_000 });
    await page.getByTitle('Acciones del DM').hover();
    await page.getByTitle('Iniciativa').click();
    await expect(page.getByRole('button', { name: 'Iniciar combate' })).toBeVisible();
    await page.getByRole('button', { name: 'Iniciar combate' }).click();
    await expect(page.getByText('Ronda 1 — Turno 0/0')).toBeVisible();

    // El DM elige quiénes pelean desde el pool de tokens de la escena.
    const poolBoxes = page.getByRole('checkbox');
    await expect(poolBoxes).toHaveCount(2);
    await poolBoxes.nth(0).check();
    await poolBoxes.nth(1).check();
    await page.getByRole('button', { name: 'Agregar al combate (2)' }).click();
    await expect(page.getByText('Ronda 1 — Turno 1/2')).toBeVisible();
  }

  test('I1: start crea combate vacío y el DM selecciona a los que pelean', async ({ page, campaign, request }) => {
    const scene = await createScene(request, campaign.id, 'Escena Combate');
    const aria = await createCharacter(request, campaign.id, { name: 'Aria' });
    const borin = await createCharacter(request, campaign.id, { name: 'Borin' });

    await openWithTwoCombatants(page, campaign.id, scene.id, request, aria, borin);

    await expect(page.getByText('Aria').nth(1)).toBeVisible();
    await expect(page.getByText('Borin').nth(1)).toBeVisible();
    await expect(page.locator('span.w-4.text-center')).toHaveCount(2);
    await expect(page.locator('span.w-4.text-center').first()).toHaveText('—');
    // Personajes seleccionados → esperando tirada del jugador.
    await expect(page.getByText('⏳ tirada del jugador')).toHaveCount(2);
  });

  test('I2: DM tira d6 por combatiente y persiste via API', async ({ page, campaign, request }) => {
    const scene = await createScene(request, campaign.id, 'Escena Roll');
    const aria = await createCharacter(request, campaign.id, { name: 'Aria' });
    const borin = await createCharacter(request, campaign.id, { name: 'Borin' });

    await openWithTwoCombatants(page, campaign.id, scene.id, request, aria, borin);

    const postPromise = page.waitForResponse(
      (res) => res.url().includes('/combatants') && res.request().method() === 'POST',
      { timeout: 10_000 },
    );

    await page.getByTitle('Tirar d6').first().click();

    const res = await postPromise;
    const body = await res.json();
    const ariaCc = body.combatants.find((c: { entity_id: string }) => c.entity_id === aria.id);
    expect(ariaCc.initiative).toBeGreaterThanOrEqual(1);
    expect(ariaCc.initiative).toBeLessThanOrEqual(6);

    // El que ya tiró (1-6) queda primero; el otro sigue sin tirar.
    await expect(page.locator('span.w-4.text-center').first()).toHaveText(/^[1-6]$/);
    await expect(page.locator('span.w-4.text-center').nth(1)).toHaveText('—');
    // La tirada del DM cancela el prompt del jugador.
    await expect(page.getByText('⏳ tirada del jugador')).toHaveCount(1);
  });

  test('I3: next turn avanza el turno activo', async ({ page, campaign, request }) => {
    const scene = await createScene(request, campaign.id, 'Escena Turnos');
    const aria = await createCharacter(request, campaign.id, { name: 'Aria' });
    const borin = await createCharacter(request, campaign.id, { name: 'Borin' });

    await openWithTwoCombatants(page, campaign.id, scene.id, request, aria, borin);

    await page.getByRole('button', { name: 'Siguiente turno ▸' }).click();

    await expect(page.getByText('Ronda 1 — Turno 2/2')).toBeVisible();
  });

  test('I4: combate y tiradas sobreviven al refresco', async ({ page, campaign, request }) => {
    const scene = await createScene(request, campaign.id, 'Escena Persist');
    const aria = await createCharacter(request, campaign.id, { name: 'Aria' });
    const borin = await createCharacter(request, campaign.id, { name: 'Borin' });

    await openWithTwoCombatants(page, campaign.id, scene.id, request, aria, borin);
    await page.getByTitle('Tirar d6').first().click();
    await expect(page.locator('span.w-4.text-center').first()).toHaveText(/^[1-6]$/);
    await page.getByRole('button', { name: 'Siguiente turno ▸' }).click();
    await expect(page.getByText('Ronda 1 — Turno 2/2')).toBeVisible();

    await page.reload();
    await expect(page.getByText('On Scene (2)')).toBeVisible({ timeout: 10_000 });
    await page.getByTitle('Acciones del DM').hover();
    await page.getByTitle('Iniciativa').click();
    await expect(page.getByText('Ronda 1 — Turno 2/2')).toBeVisible();
    await expect(page.locator('span.w-4.text-center').first()).toHaveText(/^[1-6]$/);
    await expect(page.locator('span.w-4.text-center').nth(1)).toHaveText('—');
  });

  test('I5: ajustar PV persiste current_pv via API', async ({ page, campaign, request }) => {
    const scene = await createScene(request, campaign.id, 'Escena HP');
    const aria = await createCharacter(request, campaign.id, { name: 'Aria', max_pv: 13, max_pm: 8 });
    const borin = await createCharacter(request, campaign.id, { name: 'Borin' });

    await openWithTwoCombatants(page, campaign.id, scene.id, request, aria, borin);

    const putPromise = page.waitForResponse(
      (res) =>
        res.url().includes('/characters/') &&
        res.request().method() === 'PUT' &&
        res.status() === 200,
      { timeout: 10_000 },
    );

    await page.locator('button.bg-red-900\\/50').first().click();

    const res = await putPromise;
    const body = await res.json();
    expect(body.current_pv).toBe(body.max_pv - 1);

    const stored = await request.get(`http://localhost:8000/api/campaigns/${campaign.id}/characters/${body.id}`);
    expect((await stored.json()).current_pv).toBe(body.max_pv - 1);
  });

  test('I7: jugador tira iniciativa desde su POV y entra a la lista del DM', async ({
    page,
    campaign,
    request,
    browser,
  }) => {
    const scene = await createScene(request, campaign.id, 'Escena POV');
    const aria = await createCharacter(request, campaign.id, { name: 'Aria' });
    const borin = await createCharacter(request, campaign.id, { name: 'Borin' });
    await seedTokens(request, campaign.id, scene.id, [
      { entityType: 'character', entityId: aria.id, x: 0, z: 0 },
      { entityType: 'character', entityId: borin.id, x: 1, z: 1 },
    ]);
    await updateScene(request, campaign.id, scene.id, { status: 'active' });
    const code = await generateInviteCode(request, campaign.id);

    await openWithTwoCombatants(page, campaign.id, scene.id, request, aria, borin);
    await expect(page.getByText('⏳ tirada del jugador')).toHaveCount(2);

    const pctx = await browser.newContext();
    const player = await pctx.newPage();
    await player.goto(`/campaigns/join/${code}`);
    await player.getByRole('button', { name: /Aria/ }).click();
    await expect(player.getByTestId('initiative-prompt')).toBeVisible({ timeout: 10_000 });

    const [resp] = await Promise.all([
      player.waitForResponse(
        (r) => r.url().includes('/initiative-roll') && r.request().method() === 'POST',
      ),
      player.getByTestId('initiative-roll-btn').click(),
    ]);
    const body = await resp.json();
    const ariaCc = body.combatants.find((c: { entity_id: string }) => c.entity_id === aria.id);
    expect(ariaCc.initiative).toBeGreaterThanOrEqual(1);
    expect(ariaCc.initiative).toBeLessThanOrEqual(6);

    await expect(player.getByTestId('initiative-prompt')).toHaveCount(0, { timeout: 10_000 });
    await pctx.close();

    // La lista del DM se actualiza sola (poll 2s): Aria tiró, Borin sigue esperando.
    await expect(page.getByText('⏳ tirada del jugador')).toHaveCount(1, { timeout: 10_000 });
    await expect(page.locator('span.w-4.text-center').first()).toHaveText(/^[1-6]$/);

    const combat = await (
      await request.get(`http://localhost:8000/api/campaigns/${campaign.id}/scenes/${scene.id}/combat`)
    ).json();
    const stored = combat.combatants.find((c: { entity_id: string }) => c.entity_id === aria.id);
    expect(stored.initiative).toBe(ariaCc.initiative);
    expect(stored.pending_roll).toBe(0);
  });

  test('I8: cola — dos jugadores tiran a la vez y reciben seqs distintos', async ({
    page,
    campaign,
    request,
    browser,
  }) => {
    const scene = await createScene(request, campaign.id, 'Escena Cola');
    const aria = await createCharacter(request, campaign.id, { name: 'Aria' });
    const borin = await createCharacter(request, campaign.id, { name: 'Borin' });
    await seedTokens(request, campaign.id, scene.id, [
      { entityType: 'character', entityId: aria.id, x: 0, z: 0 },
      { entityType: 'character', entityId: borin.id, x: 1, z: 1 },
    ]);
    await updateScene(request, campaign.id, scene.id, { status: 'active' });
    const code = await generateInviteCode(request, campaign.id);

    await openWithTwoCombatants(page, campaign.id, scene.id, request, aria, borin);

    const pctxA = await browser.newContext();
    const pctxB = await browser.newContext();
    const pA = await pctxA.newPage();
    const pB = await pctxB.newPage();
    await pA.goto(`/campaigns/join/${code}`);
    await pA.getByRole('button', { name: /Aria/ }).click();
    await pB.goto(`/campaigns/join/${code}`);
    await pB.getByRole('button', { name: /Borin/ }).click();
    await expect(pA.getByTestId('initiative-prompt')).toBeVisible({ timeout: 10_000 });
    await expect(pB.getByTestId('initiative-prompt')).toBeVisible();

    const waitA = pA.waitForResponse(
      (r) => r.url().includes('/initiative-roll') && r.request().method() === 'POST',
    );
    const waitB = pB.waitForResponse(
      (r) => r.url().includes('/initiative-roll') && r.request().method() === 'POST',
    );
    await Promise.all([
      pA.getByTestId('initiative-roll-btn').click(),
      pB.getByTestId('initiative-roll-btn').click(),
    ]);
    const [ra] = await Promise.all([waitA, waitB]);
    expect(ra.status()).toBe(200);

    const combat = await (
      await request.get(`http://localhost:8000/api/campaigns/${campaign.id}/scenes/${scene.id}/combat`)
    ).json();
    const seqs = combat.combatants.map((c: { roll_seq: number }) => c.roll_seq).sort();
    expect(seqs).toEqual([1, 2]);
    expect(combat.combatants.every((c: { initiative: number | null }) => c.initiative !== null)).toBe(true);
    await pctxA.close();
    await pctxB.close();
  });
});