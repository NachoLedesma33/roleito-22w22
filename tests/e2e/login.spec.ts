import { expect, test } from '@playwright/test';

// A diferencia del resto de los specs, este usa el `test` de Playwright pelado:
// el fixture de campaign-fixture inyecta el token en sessionStorage y se
// saltearía justamente la pantalla que queremos probar.
const API = 'http://localhost:8000/api';

test.describe('Login ID + PIN', () => {
  test('L1: entra con ID + PIN escritos a mano', async ({ page, request }) => {
    const reg = await request.post(`${API}/auth/register`, {
      data: { name: `E2E DM login ${Date.now()}`, pin: '4321' },
    });
    expect(reg.ok()).toBeTruthy();
    const dm = (await reg.json()) as { dm_id: string; dm_name: string };

    await page.goto('/');
    await page.getByTestId('login-dm-id').fill(dm.dm_id);
    await page.getByTestId('login-pin').fill('4321');
    await page.getByTestId('login-submit').click();

    // Sesión válida = salimos de la pantalla de login.
    await expect(page.getByTestId('login-submit')).toHaveCount(0, { timeout: 10_000 });
  });

  test('L2: el ID guardado autocompleta el campo', async ({ page, request }) => {
    const name = `E2E DM saved ${Date.now()}`;
    const reg = await request.post(`${API}/auth/register`, {
      data: { name, pin: '1234' },
    });
    expect(reg.ok()).toBeTruthy();
    const dm = (await reg.json()) as { dm_id: string };

    await page.goto('/');
    const card = page.getByTestId('login-saved-dms');
    await expect(card).toContainText(name, { timeout: 10_000 });
    await card.getByText(dm.dm_id).click();

    await expect(page.getByTestId('login-dm-id')).toHaveValue(dm.dm_id);
    await page.getByTestId('login-pin').fill('1234');
    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('login-submit')).toHaveCount(0, { timeout: 10_000 });
  });

  test('L3: campos vacíos y PIN corto no pegan contra el back', async ({ page }) => {
    await page.goto('/');

    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('login-error')).toHaveText('Ingresá tu ID de DM');

    await page.getByTestId('login-dm-id').fill('no-existe');
    await page.getByTestId('login-pin').fill('12');
    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('login-error')).toHaveText('PIN debe tener 4-8 dígitos');
    await expect(page.getByTestId('login-submit')).toBeVisible();
  });
});
