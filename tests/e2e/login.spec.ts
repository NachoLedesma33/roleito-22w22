import { expect, test } from '@playwright/test';

// A diferencia del resto de los specs, este usa el `test` de Playwright pelado:
// el fixture de campaign-fixture inyecta el token en sessionStorage y se
// saltearía justamente la pantalla que queremos probar.
const API = 'http://localhost:8000/api';

test.describe('Login nombre + PIN', () => {
  test('L1: entra con nombre de perfil + PIN', async ({ page, request }) => {
    const name = `E2E DM login ${Date.now()}`;
    const reg = await request.post(`${API}/auth/register`, {
      data: { name, pin: '4321' },
    });
    expect(reg.ok()).toBeTruthy();

    await page.goto('/login');
    await page.getByTestId('login-dm-name').fill(name);
    await page.getByTestId('login-pin').fill('4321');
    await page.getByTestId('login-submit').click();

    // Sesión válida = salimos de la pantalla de login.
    await expect(page.getByTestId('login-submit')).toHaveCount(0, { timeout: 10_000 });
  });

  test('L2: el perfil guardado completa el NOMBRE, y el id interno no se muestra', async ({
    page,
    request,
  }) => {
    const name = `E2E DM saved ${Date.now()}`;
    const reg = await request.post(`${API}/auth/register`, {
      data: { name, pin: '1234' },
    });
    expect(reg.ok()).toBeTruthy();
    const dm = (await reg.json()) as { dm_id: string };

    await page.goto('/login');
    const card = page.getByTestId('login-saved-dms');
    await expect(card).toContainText(name, { timeout: 10_000 });

    // El id interno es interno: no aparece en la pantalla.
    await expect(card).not.toContainText(dm.dm_id);

    await card.getByRole('button', { name }).click();
    await expect(page.getByTestId('login-dm-name')).toHaveValue(name);

    await page.getByTestId('login-pin').fill('1234');
    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('login-submit')).toHaveCount(0, { timeout: 10_000 });
  });

  test('L3: campos vacíos, PIN corto y nombre inexistente no entran', async ({ page }) => {
    await page.goto('/login');

    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('login-error')).toHaveText('Ingresá el nombre de tu perfil');

    await page.getByTestId('login-dm-name').fill('nombre-que-no-existe');
    await page.getByTestId('login-pin').fill('12');
    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('login-error')).toHaveText('PIN debe tener 4-8 dígitos');

    await page.getByTestId('login-pin').fill('1234');
    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('login-error')).toHaveText('Nombre o PIN incorrectos.');
    await expect(page.getByTestId('login-submit')).toBeVisible();
  });
});
