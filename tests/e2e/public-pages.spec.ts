import { expect, test } from '@playwright/test';

/** El footer no debe tener links muertos: cada sección tiene ruta propia. */
test.describe('Páginas públicas', () => {
  for (const [path, title] of [
    ['/faq', 'Preguntas frecuentes'],
    ['/discord', 'Discord'],
    ['/blog', 'Blog'],
    ['/news', 'Novedades'],
    ['/docs', 'Documentación'],
  ] as const) {
    test(`P0${path}: ${title} tiene ruta y mensaje de preparación`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByTestId('public-placeholder')).toBeVisible();
      await expect(page.getByRole('heading', { name: title })).toBeVisible();
      await expect(page.getByText(/Todavía no hay nada acá/)).toBeVisible();
    });
  }

  test('P06: el link del footer abre la sección correcta', async ({ page }) => {
    await page.goto('/');
    await page.locator('footer').getByRole('link', { name: 'Preguntas frecuentes' }).click();
    await expect(page).toHaveURL(/\/faq$/);
    await expect(page.getByTestId('public-placeholder')).toBeVisible();
  });

  test('P07: la navbar de la landing ofrece guía, FAQ y contacto', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Recursos' }).first();
    await expect(nav.getByRole('link', { name: 'Guía del DM' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Preguntas frecuentes' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Contacto' })).toBeVisible();
  });
});
