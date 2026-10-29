import { expect, test } from '../fixtures/campaign-fixture';
import type { Page } from '@playwright/test';
import {
  createCharacter,
  createScene,
  generateInviteCode,
  seedTokens,
  updateScene,
} from '../helpers/api-helpers';

test.describe('Player Shell â Grimorio', () => {
  function playerSheet(page: Page) {
    return page
      .locator('div.fixed')
      .filter({ has: page.getByRole('button', { name: 'Notas', exact: true }) });
  }

  async function setupGrimorio(
    request: import('@playwright/test').APIRequestContext,
    campaignId: string,
    name: string,
  ) {
    const scene = await createScene(request, campaignId, 'Grimorio Test');
    const char = await createCharacter(request, campaignId, { name, max_pm: 8 });
    const put = await request.put(
      `http://localhost:8000/api/campaigns/${campaignId}/characters/${char.id}`,
      {
        data: {
          spells_json: [
            {
              id: 'spell-rayo',
              name: 'Rayo',
              description: 'Una descarga elÃ©ctrica.',
              level: 2,
              cost_pm: 3,
            },
            {
              id: 'spell-escudo',
              name: 'Escudo',
              description: 'Protege un turno.',
              level: 1,
              cost_pm: 2,
            },
          ],
        },
      },
    );
    expect(put.status()).toBe(200);
    await seedTokens(request, campaignId, scene.id, [
      { entityType: 'character', entityId: char.id, x: 0, z: 0 },
    ]);
    await updateScene(request, campaignId, scene.id, { status: 'active' });
    // C4: usar habilidad necesita sesiÃ³n activa
    const session = await request.post(
      `http://localhost:8000/api/campaigns/${campaignId}/sessions`,
      { data: { number: 1, date: '2026-10-08' } },
    );
    expect(session.status()).toBe(200);
    const sessionId = (await session.json()).id;
    const started = await request.post(
      `http://localhost:8000/api/campaigns/${campaignId}/sessions/${sessionId}/start`,
    );
    expect(started.status()).toBe(200);
    return char;
  }

  async function joinAs(
    page: Page,
    request: import('@playwright/test').APIRequestContext,
    campaignId: string,
    name: string,
  ) {
    const code = await generateInviteCode(request, campaignId);
    await page.goto(`/campaigns/join/${code}`);
    await expect(page.getByText('Â¿QuiÃ©n sos?')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: new RegExp(name) }).click();
    await expect(playerSheet(page)).toBeVisible();
  }

  async function openGrimorio(page: Page) {
    await page.getByRole('button', { name: 'Hech' }).click();
    await expect(playerSheet(page)).toContainText('8/8 PM');
    await page.getByTestId('grimorio-toggle').click();
    await expect(page.getByRole('dialog', { name: 'Grimorio' })).toBeVisible();
  }

  test('G1: Grimorio abre el mosaic zoom-out con habilidades y costes', async ({
    page,
    campaign,
    request,
  }) => {
    await setupGrimorio(request, campaign.id, 'Kaelen');
    await joinAs(page, request, campaign.id, 'Kaelen');
    await openGrimorio(page);

    await expect(page.getByRole('button', { name: /Rayo/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Escudo/ })).toBeVisible();
    await expect(page.getByText('Lv2 Â· 3 PM')).toBeVisible();
    await expect(page.getByText('Lv1 Â· 2 PM')).toBeVisible();
  });

  test('G2: elegir una habilidad abre el detalle del Grimorio', async ({
    page,
    campaign,
    request,
  }) => {
    await setupGrimorio(request, campaign.id, 'Kaelen');
    await joinAs(page, request, campaign.id, 'Kaelen');
    await openGrimorio(page);

    await page.getByRole('button', { name: /Rayo/ }).click();
    const detail = page.getByTestId('grimorio-detail');
    await expect(detail).toBeVisible();
    await expect(detail).toContainText('Rayo');
    await expect(detail).toContainText('Lv2 Â· 3 PM');
    await expect(detail).toContainText('Una descarga elÃ©ctrica.');
    await expect(detail.getByRole('button', { name: 'Usar (3 PM)' })).toBeEnabled();
  });

  test('G3: usar desde el Grimorio gasta PM del personaje', async ({
    page,
    campaign,
    request,
  }) => {
    await setupGrimorio(request, campaign.id, 'Kaelen');
    await joinAs(page, request, campaign.id, 'Kaelen');
    await openGrimorio(page);

    await page.getByRole('button', { name: /Rayo/ }).click();
    const detail = page.getByTestId('grimorio-detail');
    const usar = detail.getByRole('button', { name: 'Usar (3 PM)' });
    await usar.click();
    await expect(playerSheet(page)).toContainText('5/8 PM', { timeout: 10_000 });
    await usar.click();
    await expect(playerSheet(page)).toContainText('2/8 PM');
    // con 2 PM no alcanza para Rayo (3): queda deshabilitado, no falla a ciegas
    await expect(detail.getByRole('button', { name: 'PM insuficientes' })).toBeDisabled();
  });

  test('G4: bÃºsqueda interna filtra y Esc cierra detalle y mosaic', async ({
    page,
    campaign,
    request,
  }) => {
    // Unirse a la campaÃ±a + cargar la vista del jugador lleva el test al borde
    // del timeout default: en el runner del CI (mas lento) se pasaba.
    test.setTimeout(60_000);

    await setupGrimorio(request, campaign.id, 'Kaelen');
    await joinAs(page, request, campaign.id, 'Kaelen');
    await openGrimorio(page);

    const dialog = page.getByRole('dialog', { name: 'Grimorio' });
    await dialog.getByLabel('Buscar').fill('escudo');
    await expect(page.getByRole('button', { name: /Escudo/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Rayo/ })).toHaveCount(0);

    // Enter sobre el resultado filtrado abre el detalle
    await page.getByRole('button', { name: /Escudo/ }).focus();
    await page.keyboard.press('Enter');
    const detail = page.getByTestId('grimorio-detail');
    await expect(detail).toContainText('Escudo');

    // Esc cierra solo el detalle
    await page.keyboard.press('Escape');
    await expect(detail).toHaveCount(0);

    // Esc sobre el mosaic cierra el Grimorio completo
    await page.getByTestId('grimorio-toggle').click();
    await expect(page.getByRole('dialog', { name: 'Grimorio' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Grimorio' })).toHaveCount(0);
  });

  // RegresiÃ³n de CI (shard 3, 2026-10-16): `Island` escuchaba Escape en el
  // `onKeyDown` de su propio div, asÃ­ que la tecla solo llegaba con el foco
  // adentro. El foco se lleva un `setTimeout(0)` al abrir, y si Escape se
  // pulsaba antes de que corriera, se quedaba en el disparador. Este test lo
  // hace determinista: el foco estÃ¡ explÃ­citamente AFUERA del diÃ¡logo.
  test('G5: Esc cierra el Grimorio aunque el foco estÃ© en el disparador', async ({
    page,
    campaign,
    request,
  }) => {
    await setupGrimorio(request, campaign.id, 'Kaelen');
    await joinAs(page, request, campaign.id, 'Kaelen');
    await openGrimorio(page);

    const toggle = page.getByTestId('grimorio-toggle');
    await toggle.focus();
    await expect(toggle).toBeFocused();

    await page.keyboard.press('Escape');

    await expect(page.getByRole('dialog', { name: 'Grimorio' })).toHaveCount(0);
  });
});