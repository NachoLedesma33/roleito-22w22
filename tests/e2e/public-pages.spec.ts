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
    const nav = page.getByRole('navigation', { name: /Guía del DM.*Preguntas frecuentes.*Contacto/ });
    await expect(nav.getByRole('link', { name: 'Guía del DM' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Preguntas frecuentes' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Contacto' })).toBeVisible();
  });

  test('P08: la guía explica canon, sesiones y límites de seguridad', async ({ page }) => {
    await page.goto('/guide');
    await expect(page.getByTestId('dm-guide')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Manual de uso del DM' })).toBeVisible();
    await expect(page.getByText(/Nada entra al mundo sin tu firma/)).toBeVisible();
    await expect(page.getByText(/5 intentos fallidos/)).toBeVisible();
  });

  for (const [path, title] of [
    ['/terms', 'Términos de uso'],
    ['/privacy', 'Privacidad'],
    ['/ai-notice', 'Aviso sobre IA'],
    ['/content-notice', 'Aviso sobre contenido'],
    ['/credits', 'Créditos'],
  ] as const) {
    test(`P09${path}: ${title} marca borrador legal`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByTestId('legal-page')).toBeVisible();
      await expect(page.getByRole('heading', { name: title })).toBeVisible();
      await expect(page.getByText(/revisión legal pendiente/)).toBeVisible();
    });
  }

  test('P10: el footer enlaza los avisos legales', async ({ page }) => {
    await page.goto('/');
    const legal = page.getByRole('navigation', { name: 'Avisos legales' });
    await expect(legal.getByRole('link', { name: 'Términos de uso' })).toBeVisible();
    await expect(legal.getByRole('link', { name: 'Privacidad' })).toBeVisible();
    await legal.getByRole('link', { name: 'Créditos' }).click();
    await expect(page).toHaveURL(/\/credits$/);
  });
});
