import { readFile } from 'node:fs/promises';
import { BACKEND_URL } from '../config';
import { expect, test } from '@playwright/test';

test.use({ locale: 'es-ES' });

const API = `${BACKEND_URL}/api`;

async function registerDm(request: import('@playwright/test').APIRequestContext, label: string) {
  const name = `E2E DM ${label} ${Date.now()}`;
  const res = await request.post(`${API}/auth/register`, { data: { name, pin: '1234' } });
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as { token: string; dm_id: string; dm_name: string };
}

test('L1: descargar datos incluye el perfil y las campañas', async ({ page, request }) => {
  const dm = await registerDm(request, 'export');
  const headers = { Authorization: `Bearer ${dm.token}` };
  const created = await request.post(`${API}/campaigns`, {
    data: { name: `Campana E2E ${Date.now()}`, description: '' },
    headers,
  });
  expect(created.ok()).toBeTruthy();
  const campaignId = (await created.json()).id as string;

  await page.goto('/campaigns');
  await page.evaluate((token) => sessionStorage.setItem('roleito:auth:token', token), dm.token);
  await page.reload();
  await page.getByLabel('Ajustes').click();
  await expect(page.getByTestId('privacy-section')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('privacy-export-button').click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();
  const body = JSON.parse(await readFile(path!, 'utf8')) as {
    dm: { id: string };
    campaigns: Array<{ campaign: { id: string } }>;
  };
  expect(body.dm.id).toBe(dm.dm_id);
  expect(body.campaigns.some((c) => c.campaign.id === campaignId)).toBeTruthy();
});

test('L2: borrar perfil cierra sus sesiones y deja las campañas', async ({ page, request }) => {
  const dm = await registerDm(request, 'delete');
  const second = await request.post(`${API}/auth/login`, {
    data: { name: dm.dm_name, pin: '1234' },
  });
  expect(second.ok()).toBeTruthy();
  const token2 = (await second.json()).token as string;

  const created = await request.post(`${API}/campaigns`, {
    data: { name: `Campana E2E ${Date.now()}`, description: '' },
    headers: { Authorization: `Bearer ${dm.token}` },
  });
  expect(created.ok()).toBeTruthy();
  const campaignId = (await created.json()).id as string;

  await page.goto('/campaigns');
  await page.evaluate((token) => sessionStorage.setItem('roleito:auth:token', token), dm.token);
  await page.reload();
  await page.getByLabel('Ajustes').click();
  await page.getByTestId('privacy-delete-button').click();
  await expect(page.getByTestId('privacy-delete-confirm')).toBeVisible();
  await page.getByTestId('privacy-delete-confirm').click();

  await expect(page).toHaveURL(/\/$/);
  for (const token of [dm.token, token2]) {
    const me = await request.get(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(me.status()).toBe(401);
  }
  const campaign = await request.get(`${API}/campaigns/${campaignId}`);
  expect(campaign.ok()).toBeTruthy();
});
