import { expect, test } from '../fixtures/campaign-fixture';

// El riel de sectores y las islas usan labels fijos en español; fijar idioma
// para aserciones estables en CI (el headless arranca en 'en').
test.use({ locale: 'es-ES' });

test.describe('Shell DM — Riel e Islas', () => {
  test('IS1: el sector Mundo abre la isla y navega a Eventos', async ({ page, campaign }) => {
    await page.goto(`/campaigns/${campaign.id}`);
    await expect(page.getByRole('button', { name: 'Mundo' })).toBeVisible();

    await page.getByRole('button', { name: 'Mundo' }).click();
    await expect(page.getByRole('dialog', { name: 'Mundo' })).toBeVisible();

    await page.getByRole('button', { name: 'Eventos' }).click();
    await expect(page).toHaveURL(new RegExp(`/campaigns/${campaign.id}/events$`));
  });

  test('IS2: Esc cierra la isla sin navegar', async ({ page, campaign }) => {
    await page.goto(`/campaigns/${campaign.id}`);

    await page.getByRole('button', { name: 'Reparto' }).click();
    await expect(page.getByRole('dialog', { name: 'Reparto' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('IS3: la búsqueda filtra tiles dentro de la isla', async ({ page, campaign }) => {
    await page.goto(`/campaigns/${campaign.id}`);

    await page.getByRole('button', { name: 'Estudio' }).click();
    await page.getByRole('textbox', { name: 'Buscar' }).fill('Voz');

    await expect(page.getByRole('button', { name: 'Voz' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Imágenes' })).toHaveCount(0);
  });
});