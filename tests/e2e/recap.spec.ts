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
    await expect(page.getByTitle('Roll dice (D)')).toBeVisible();
  }

  function recapPanel(page: import('@playwright/test').Page) {
    return page.locator('div.fixed', {
      has: page.getByRole('heading', { name: 'Session Recap' }),
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
      panel.getByRole('heading', { name: 'Session Recap' }),
    ).toBeVisible();
    await expect(panel.getByText('# Session 1 — La Taberna')).toBeVisible();
    await expect(panel.getByText('Emboscan goblins en el camino')).toBeVisible();
    await expect(panel.getByText('1 events')).toBeVisible();

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

    await panel.getByRole('button', { name: 'Edit Summary' }).click();
    await panel
      .locator('textarea')
      .fill('Resumen editado por el DM durante el test');
    await panel.getByRole('button', { name: 'Save Summary' }).click();

    await expect(
      panel.getByText('Resumen editado por el DM durante el test'),
    ).toBeVisible();

    const saved = await getSession(request, campaign.id, session.id);
    expect(saved.summary).toBe('Resumen editado por el DM durante el test');
  });

  test('R4: exporta recap como .md', async ({ page, campaign, request }) => {
    await createSession(request, campaign.id, {
      number: 3,
      title: 'Exportable',
    });

    await openDashboard(page, campaign.id);
    await page.keyboard.press('r');
    const panel = recapPanel(page);
    await expect(panel.getByRole('heading', { name: 'Session Recap' })).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await panel.getByRole('button', { name: 'Export .md' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('session-3-recap.md');
    await download.saveAs('C:\\Users\\nacho\\AppData\\Local\\Temp\\opencode\\session-3-recap.md');
  });
});
