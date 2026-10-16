import { expect, test, type Page } from '../fixtures/campaign-fixture';
import { createScene } from '../helpers/api-helpers';

/**
 * La paleta de comandos (Ctrl+K) no tenía cobertura antes de que se moviera
 * fuera de `DmDashboard`. Estos tests fijan el comportamiento observable:
 * abrir, filtrar, lanzar una acción y cerrar con Escape.
 *
 * Todos los asserts se scopean a la paleta: el dock tiene un botón con el
 * mismo nombre ("Iniciativa") y el selector quedaría ambiguo.
 */

/**
 * `goto` retorna antes de que el dashboard monte, y el listener de Ctrl+K se
 * registra en un efecto. Sin esperar al header, la tecla se pierde y el test
 * cuelga 30s en vez de fallar rápido.
 */
async function openPalette(page: Page, campaignId: string) {
  await page.goto(`/campaigns/${campaignId}`);
  await expect(page.locator('header select')).toBeVisible({ timeout: 15_000 });
  await page.keyboard.press('Control+k');
  await expect(page.getByTestId('dm-command-palette')).toBeVisible();
}

test.describe('Command palette', () => {
  test('K1: Ctrl+K abre la paleta con links y acciones', async ({ page, campaign, request }) => {
    await createScene(request, campaign.id, 'Escena Paleta');
    await openPalette(page, campaign.id);

    const palette = page.getByTestId('dm-command-palette');
    await expect(palette.getByPlaceholder('Buscar acción… (Ctrl+K)')).toBeVisible();
    // El nombre accesible del link incluye el glifo del icono ("◆ VTT"), así
    // que el match es por substring, no exacto.
    await expect(palette.getByRole('link', { name: 'VTT' })).toBeVisible();
    await expect(palette.getByRole('button', { name: 'Tirar dados' })).toBeVisible();
  });

  test('K2: el filtro por texto deja solo lo que matchea', async ({ page, campaign, request }) => {
    await createScene(request, campaign.id, 'Escena Paleta');
    await openPalette(page, campaign.id);

    const palette = page.getByTestId('dm-command-palette');
    await palette.getByPlaceholder('Buscar acción… (Ctrl+K)').fill('iniciativa');

    await expect(palette.getByRole('button', { name: 'Iniciativa' })).toBeVisible();
    await expect(palette.getByRole('button', { name: 'Tirar dados' })).toBeHidden();
  });

  test('K3: sin coincidencias muestra el estado vacío', async ({ page, campaign, request }) => {
    await createScene(request, campaign.id, 'Escena Paleta');
    await openPalette(page, campaign.id);

    const palette = page.getByTestId('dm-command-palette');
    await palette.getByPlaceholder('Buscar acción… (Ctrl+K)').fill('zzzzz');

    await expect(palette.getByText('Sin resultados')).toBeVisible();
  });

  test('K4: una acción abre el panel y cierra la paleta', async ({ page, campaign, request }) => {
    await createScene(request, campaign.id, 'Escena Paleta');
    await openPalette(page, campaign.id);

    await page.getByTestId('dm-command-palette').getByRole('button', { name: 'Iniciativa' }).click();

    await expect(page.getByTestId('dm-command-palette')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Iniciar combate' })).toBeVisible();
  });

  test('K5: Escape cierra la paleta', async ({ page, campaign, request }) => {
    await createScene(request, campaign.id, 'Escena Paleta');
    await openPalette(page, campaign.id);

    await page.keyboard.press('Escape');

    await expect(page.getByTestId('dm-command-palette')).toHaveCount(0);
  });
});
