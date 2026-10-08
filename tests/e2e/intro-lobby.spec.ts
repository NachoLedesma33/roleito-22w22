import { expect, test, type Page } from '@playwright/test';

// Flujo intro → lobby: entrada real por login (sin fixture que inyecte token).
// El lobby usa strings i18n y 'Saltar' es fijo; fijar idioma para aserciones estables.
test.use({ locale: 'es-ES' });

const API = 'http://localhost:8000/api';

async function loginAndSkipIntro(page: Page, name: string) {
  await page.goto('/login');
  await page.getByTestId('login-dm-name').fill(name);
  await page.getByTestId('login-pin').fill('4321');
  await page.getByTestId('login-submit').click();

  // Tras el remolino (0.85s) monta la intro; saltarla para llegar al lobby.
  // Si el video falla (LFS fuera) o hay reduced-motion la intro se salta sola:
  // ambos caminos (click Saltar o URL /campaigns) son válidos.
  const skip = page.getByRole('button', { name: /Saltar/ });
  const skipClicked = skip.click({ timeout: 15_000 }).catch(() => {});
  await Promise.race([skipClicked, page.waitForURL(/\/campaigns$/, { timeout: 25_000 })]);
  await expect(page).toHaveURL(/\/campaigns$/);
  await expect(page.getByRole('heading', { name: 'Tu mesa' })).toBeVisible();
}

test.describe('Intro + Lobby', () => {
  test('IL1: login → intro con Saltar → lobby de campañas', async ({ page, request }) => {
    const name = `E2E DM intro ${Date.now()}`;
    const reg = await request.post(`${API}/auth/register`, { data: { name, pin: '4321' } });
    expect(reg.ok()).toBeTruthy();

    await loginAndSkipIntro(page, name);
  });

  test('IL2: el tema elegido en preferencias aplica data-theme', async ({ page, request }) => {
    const name = `E2E DM theme ${Date.now()}`;
    const reg = await request.post(`${API}/auth/register`, { data: { name, pin: '4321' } });
    expect(reg.ok()).toBeTruthy();

    await loginAndSkipIntro(page, name);

    await page.getByLabel('Ajustes').click();
    await page.getByLabel('Tema').selectOption('vitela');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'vitela');
  });

  test('IL3: el idioma se cambia desde preferencias y re-traduce el lobby', async ({
    page,
    request,
  }) => {
    const name = `E2E DM lang ${Date.now()}`;
    const reg = await request.post(`${API}/auth/register`, { data: { name, pin: '4321' } });
    expect(reg.ok()).toBeTruthy();

    await loginAndSkipIntro(page, name);

    await page.getByLabel('Ajustes').click();
    await page.getByLabel('Idioma').selectOption('en');
    // Cerrar el drawer: el lobby traducido queda a la vista.
    await page.getByRole('button', { name: 'Cerrar' }).click();
    await expect(page.getByRole('heading', { name: 'Your table' })).toBeVisible({
      timeout: 10_000,
    });
  });
});