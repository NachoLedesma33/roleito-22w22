import { BACKEND_URL } from '../config';
import { expect, test } from '@playwright/test';

test.use({ locale: 'es-ES' });

const API = `${BACKEND_URL}/api`;

test('S5: cerrar todas las sesiones invalida otras pestañas', async ({ page, request }) => {
  const name = `E2E DM bulk ${Date.now()}`;
  const pin = '4321';
  const reg = await request.post(`${API}/auth/register`, { data: { name, pin } });
  expect(reg.ok()).toBeTruthy();

  const first = await request.post(`${API}/auth/login`, { data: { name, pin } });
  const second = await request.post(`${API}/auth/login`, { data: { name, pin } });
  expect(first.ok()).toBeTruthy();
  expect(second.ok()).toBeTruthy();
  const tokenA = (await first.json()).token as string;
  const tokenB = (await second.json()).token as string;

  await page.goto('/campaigns');
  await page.evaluate((token) => sessionStorage.setItem('roleito:auth:token', token), tokenA);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Tu mesa' })).toBeVisible();

  await page.getByLabel('Ajustes').click();
  await page.getByTestId('logout-all-button').click();
  await expect(page.getByTestId('logout-all-confirm')).toBeVisible();
  await page.getByTestId('logout-all-confirm').click();

  await expect(page).toHaveURL(/\/$/);
  for (const token of [tokenA, tokenB]) {
    const me = await request.get(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(me.status()).toBe(401);
  }
});
