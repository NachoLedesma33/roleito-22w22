import { expect, test } from '../fixtures/campaign-fixture';
import {
  createCharacter,
  createSession,
  getSession,
  seedEvent,
} from '../helpers/api-helpers';

test.describe('Recap System', () => {
  async function openDashboard(
    page: import('@playwright/test').Page,
    campaignId: string,
  ) {
    await page.goto(`/campaigns/${campaignId}`);
    await page.getByTitle('Acciones del DM').hover();
    await expect(page.getByTitle('Tirar dados (D)')).toBeVisible();
  }

  function recapPanel(page: import('@playwright/test').Page) {
    return page.locator('div.fixed', {
      has: page.getByRole('button', { name: 'Resumen IA' }),
    });
  }

  test('R1: abre recap con tecla R y muestra resumen de sesión', async ({ page, campaign, request }) => {
    const char = await createCharacter(request, campaign.id, { name: 'Aria' });
    const session = await createSession(request, campaign.id, {
      number: 1,
      title: 'La Taberna',
    });
    await seedEvent(request, campaign.id, session.id, {
      type: 'COMBAT',
      actor_id: char.id,
      description: 'Emboscan goblins en el camino',
    });

    await openDashboard(page, campaign.id);
    await page.keyboard.press('r');

    const panel = recapPanel(page);
    await expect(
      panel.getByRole('button', { name: 'Resumen IA' }),
    ).toBeVisible();
    await expect(panel.getByText('# Session 1 — La Taberna')).toBeVisible();
    await expect(panel.getByText('Emboscan goblins en el camino')).toBeVisible();
    await expect(panel.getByText('1 eventos')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(recapPanel(page)).toHaveCount(0);
  });

  test('R2: cambia de sesión en el dropdown', async ({ page, campaign, request }) => {
    const char = await createCharacter(request, campaign.id, { name: 'Aria' });
    const s1 = await createSession(request, campaign.id, {
      number: 1,
      date: '2026-08-20',
      title: 'Emboscada',
    });
    const s2 = await createSession(request, campaign.id, {
      number: 2,
      date: '2026-08-22',
      title: 'El Dragón',
    });
    await seedEvent(request, campaign.id, s1.id, {
      type: 'COMBAT',
      actor_id: char.id,
      description: 'Ataque de goblins',
    });
    await seedEvent(request, campaign.id, s2.id, {
      type: 'DISCOVERY',
      actor_id: char.id,
      description: 'Guardeón del dragón',
    });

    await openDashboard(page, campaign.id);
    await page.keyboard.press('r');
    const panel = recapPanel(page);

    await expect(panel.getByText('# Session 2 — El Dragón')).toBeVisible();

    await panel.locator('select').selectOption({ value: s1.id });
    await expect(panel.getByText('# Session 1 — Emboscada')).toBeVisible();
    await expect(panel.getByText('Ataque de goblins')).toBeVisible();
    await expect(panel.getByText('Guardeón del dragón')).toHaveCount(0);
  });

  test('R3: edita y guarda el resumen', async ({ page, campaign, request }) => {
    const session = await createSession(request, campaign.id, {
      number: 1,
      title: 'Sesión editable',
    });

    await openDashboard(page, campaign.id);
    await page.keyboard.press('r');
    const panel = recapPanel(page);

    await panel.getByRole('button', { name: 'Editar' }).click();
    await panel
      .locator('textarea')
      .fill('Resumen editado por el DM durante el test');
    await panel.getByRole('button', { name: 'Guardar' }).click();

    await expect(
      panel.getByText('Resumen editado por el DM durante el test'),
    ).toBeVisible({ timeout: 10_000 });

    // La API puede leer un snapshot viejo (WAL): se espera a que el guardado
    // llegue, en vez de asumir que ya esta.
    await expect
      .poll(
        async () => (await getSession(request, campaign.id, session.id)).summary,
        { timeout: 10_000 },
      )
      .toBe('Resumen editado por el DM durante el test');
  });

  test('R4: exporta recap como .md', async ({ page, campaign, request }) => {
    await createSession(request, campaign.id, {
      number: 3,
      title: 'Exportarable',
    });

    await openDashboard(page, campaign.id);
    await page.keyboard.press('r');
    const panel = recapPanel(page);
    await expect(panel.getByRole('button', { name: 'Resumen IA' })).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await panel.getByRole('button', { name: 'Exportar' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('session-3-recap.md');
    await download.saveAs('C:\\Users\\nacho\\AppData\\Local\\Temp\\opencode\\session-3-recap.md');
  });

  test('R5: el resumen IA sobrevive a recargar la página', async ({
    page,
    campaign,
    request,
  }) => {
    await createSession(request, campaign.id, {
      number: 1,
      title: 'Con IA',
      summary: 'La party entró a la mazmorra',
    });

    await openDashboard(page, campaign.id);
    await page.keyboard.press('r');
    const panel = recapPanel(page);
    await panel.getByRole('button', { name: 'Resumen IA' }).click();
    // El recap generado aparece...
    await expect(panel.getByText(/dark cavern/)).toBeVisible({ timeout: 15_000 });

    // ...y sigue ahí después de recargar: el backend lo guardó en la sesión.
    await openDashboard(page, campaign.id);
    await page.keyboard.press('r');
    await expect(recapPanel(page).getByText(/dark cavern/)).toBeVisible({
      timeout: 15_000,
    });
  });
});
