import { expect, test } from '../fixtures/campaign-fixture';
import { createCharacter, createScene, seedTokens } from '../helpers/api-helpers';

test.describe('Initiative Tracker', () => {
  async function openWithTwoCombatants(
    page: import('@playwright/test').Page,
    campaignId: string,
    sceneId: string,
    request: import('@playwright/test').APIRequestContext,
    charA: { id: string; name: string },
    charB: { id: string; name: string },
  ) {
    await seedTokens(request, campaignId, sceneId, [
      { entityType: 'character', entityId: charA.id, x: 0, z: 0 },
      { entityType: 'character', entityId: charB.id, x: 1, z: 1 },
    ]);

    await page.goto(`/campaigns/${campaignId}`);
    await expect(page.getByText('On Scene (2)')).toBeVisible({ timeout: 10_000 });
    await page.getByTitle('Initiative Tracker').click();
    await expect(page.getByText('Initiative — Round 1')).toBeVisible();
  }

  test('I1: abre tracker con combatientes de la escena', async ({ page, campaign, request }) => {
    const scene = await createScene(request, campaign.id, 'Escena Combate');
    const aria = await createCharacter(request, campaign.id, { name: 'Aria' });
    const borin = await createCharacter(request, campaign.id, { name: 'Borin' });

    await openWithTwoCombatants(page, campaign.id, scene.id, request, aria, borin);

    await expect(page.getByText('Aria')).toBeVisible();
    await expect(page.getByText('Borin')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Roll Initiative (d20)' })).toBeVisible();
  });

  test('I2: roll initiative tira d20 y ordena descendente', async ({ page, campaign, request }) => {
    const scene = await createScene(request, campaign.id, 'Escena Roll');
    const aria = await createCharacter(request, campaign.id, { name: 'Aria' });
    const borin = await createCharacter(request, campaign.id, { name: 'Borin' });

    await openWithTwoCombatants(page, campaign.id, scene.id, request, aria, borin);
    await page.getByRole('button', { name: 'Roll Initiative (d20)' }).click();

    await expect(page.getByText('Round 1 — Turn 1/2')).toBeVisible();

    const inits = page.locator('span.w-4.text-center');
    await expect(inits).toHaveCount(2);
    const first = parseInt(await inits.nth(0).textContent() || '0', 10);
    const second = parseInt(await inits.nth(1).textContent() || '0', 10);
    for (const v of [first, second]) {
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(20);
    }
    expect(first).toBeGreaterThanOrEqual(second);
  });

  test('I3: next turn avanza el turno activo', async ({ page, campaign, request }) => {
    const scene = await createScene(request, campaign.id, 'Escena Turnos');
    const aria = await createCharacter(request, campaign.id, { name: 'Aria' });
    const borin = await createCharacter(request, campaign.id, { name: 'Borin' });

    await openWithTwoCombatants(page, campaign.id, scene.id, request, aria, borin);
    await page.getByRole('button', { name: 'Roll Initiative (d20)' }).click();
    await expect(page.getByText('Round 1 — Turn 1/2')).toBeVisible();

    await page.getByRole('button', { name: 'Next Turn ▸' }).click();

    await expect(page.getByText('Round 1 — Turn 2/2')).toBeVisible();
  });

  test('I4: re-roll resetea al primer turno', async ({ page, campaign, request }) => {
    const scene = await createScene(request, campaign.id, 'Escena Reset');
    const aria = await createCharacter(request, campaign.id, { name: 'Aria' });
    const borin = await createCharacter(request, campaign.id, { name: 'Borin' });

    await openWithTwoCombatants(page, campaign.id, scene.id, request, aria, borin);
    await page.getByRole('button', { name: 'Roll Initiative (d20)' }).click();
    await page.getByRole('button', { name: 'Next Turn ▸' }).click();
    await expect(page.getByText('Round 1 — Turn 2/2')).toBeVisible();

    await page.getByRole('button', { name: 'Re-roll Initiative' }).click();

    await expect(page.getByText('Round 1 — Turn 1/2')).toBeVisible();
  });

  test('I5: ajustar PV persiste current_pv via API', async ({ page, campaign, request }) => {
    const scene = await createScene(request, campaign.id, 'Escena HP');
    const aria = await createCharacter(request, campaign.id, { name: 'Aria', max_pv: 13, max_pm: 8 });
    const borin = await createCharacter(request, campaign.id, { name: 'Borin' });

    await openWithTwoCombatants(page, campaign.id, scene.id, request, aria, borin);
    await page.getByRole('button', { name: 'Roll Initiative (d20)' }).click();
    await expect(page.getByText('Round 1 — Turn 1/2')).toBeVisible();

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
});
