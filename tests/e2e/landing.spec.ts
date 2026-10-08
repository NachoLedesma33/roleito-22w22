import { expect, test } from '@playwright/test';

// El lobby usa strings i18n; fijar idioma para aserciones estables en español.
test.use({ locale: 'es-ES' });

// Spec pelado (sin fixture de campaña): el fixture inyecta token y justamente
// saltearía la pantalla pre-login que queremos probar.
const API = 'http://localhost:8000/api';

test.describe('Landing pre-login', () => {
  test('W1: hero + CTA Ingresar lleva al login', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { level: 1, name: 'El mundo que tus sesiones recuerdan' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Comenzar' })).toBeVisible();

    await page.getByRole('link', { name: 'Ingresar' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByTestId('login-submit')).toBeVisible();
  });

  test('W2: features visibles y "Ver cómo funciona" ancla a la sección', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Ver cómo funciona' }).click();
    await expect(page).toHaveURL(/#features$/);
    await expect(page.getByRole('heading', { name: 'Todo en una sola mesa' })).toBeVisible();
    await expect(page.getByText('Mesa VTT')).toBeVisible();
    await expect(page.getByText('Canon aprobado')).toBeVisible();
  });

  test('W3: con sesión, / redirige al lobby de campañas', async ({ page, request }) => {
    const name = `E2E DM landing ${Date.now()}`;
    const reg = await request.post(`${API}/auth/register`, {
      data: { name, pin: '4321' },
    });
    expect(reg.ok()).toBeTruthy();
    const { token } = (await reg.json()) as { token: string };

    await page.addInitScript((t: string) => {
      sessionStorage.setItem('roleito:auth:token', t);
    }, token);

    await page.goto('/');
    await expect(page).toHaveURL(/\/campaigns$/);
    await expect(page.getByRole('heading', { name: 'Tu mesa' })).toBeVisible();
  });
});
