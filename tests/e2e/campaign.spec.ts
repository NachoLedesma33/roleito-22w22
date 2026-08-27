import { expect, test } from '../fixtures/campaign-fixture';

test.describe('Campaign CRUD', () => {
  test('C1: crea campaña desde la UI y redirige al dashboard', async ({ page }) => {
    const name = `UI Campaign ${Date.now()}`;

    await page.goto('/');
    await page.getByRole('link', { name: 'New Campaign' }).click();
    await expect(page).toHaveURL(/\/campaigns\/new$/);

    await page.getByPlaceholder('Campaign name').fill(name);
    await page.getByRole('button', { name: 'Create Campaign' }).click();

    await expect(page).toHaveURL(/\/campaigns\/[a-z0-9-]+$/, { timeout: 10_000 });
    await expect(page.getByRole('link', { name })).toBeVisible();
  });

  test('C2: lista campañas existentes', async ({ page, campaign }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Campaigns' })).toBeVisible();
    await expect(page.getByRole('link', { name: campaign.name })).toBeVisible();
  });

  test('C3: edita nombre de campaña', async ({ page, campaign }) => {
    const newName = `${campaign.name} EDITED`;

    await page.goto(`/campaigns/${campaign.id}/edit`);
    await expect(page.getByRole('heading', { name: 'Edit Campaign' })).toBeVisible();
    await expect(page.getByPlaceholder('Campaign name')).toHaveValue(campaign.name);

    await page.getByPlaceholder('Campaign name').fill(newName);
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page).toHaveURL(new RegExp(`/campaigns/${campaign.id}$`));
    await page.goto('/');
    await expect(page.getByRole('link', { name: newName })).toBeVisible();
  });

  test('C4: elimina campaña con confirmación', async ({ page, campaign }) => {
    await page.goto('/');

    page.on('dialog', (dialog) => dialog.accept());

    const card = page.locator('div.border.rounded-lg', { hasText: campaign.name }).first();
    await card.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByRole('link', { name: campaign.name })).toHaveCount(0);
  });
});

test.describe('Campaign Bulk Operations', () => {
  test('C5: bulk delete campaigns', async ({ page, request, dmToken }) => {
    const names = [`Bulk A ${Date.now()}`, `Bulk B ${Date.now()}`];
    const ids: string[] = [];

    for (const name of names) {
      const res = await request.post('http://localhost:8000/api/campaigns', {
        headers: { Authorization: `Bearer ${dmToken}` },
        data: { name },
      });
      const c = await res.json();
      ids.push(c.id);
    }

    await page.goto('/');

    for (const name of names) {
      await expect(page.getByRole('link', { name })).toBeVisible();
    }

    const checkboxes = page.locator('input[type="checkbox"]');
    await checkboxes.nth(1).click();
    await checkboxes.nth(2).click();

    await expect(page.getByText('2 selected')).toBeVisible();

    page.on('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Delete' }).click();

    for (const name of names) {
      await expect(page.getByRole('link', { name })).toHaveCount(0);
    }
  });

  test('C6: bulk export campaigns combined', async ({ page, request, dmToken }) => {
    const names = [`Export A ${Date.now()}`, `Export B ${Date.now()}`];
    const ids: string[] = [];

    for (const name of names) {
      const res = await request.post('http://localhost:8000/api/campaigns', {
        headers: { Authorization: `Bearer ${dmToken}` },
        data: { name },
      });
      const c = await res.json();
      ids.push(c.id);
    }

    await page.goto('/');

    const checkboxes = page.locator('input[type="checkbox"]');
    await checkboxes.nth(1).click();
    await checkboxes.nth(2).click();

    await expect(page.getByText('2 selected')).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export (combined)' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/campaigns-bulk-.*\.json/);

    for (const id of ids) {
      await request.delete(`http://localhost:8000/api/campaigns/${id}`, {
        headers: { Authorization: `Bearer ${dmToken}` },
      });
    }
  });

  test('C7: bulk edit campaigns', async ({ page, request, dmToken }) => {
    const names = [`Edit A ${Date.now()}`, `Edit B ${Date.now()}`];
    const ids: string[] = [];
    const newName = `Edited ${Date.now()}`;

    for (const name of names) {
      const res = await request.post('http://localhost:8000/api/campaigns', {
        headers: { Authorization: `Bearer ${dmToken}` },
        data: { name },
      });
      const c = await res.json();
      ids.push(c.id);
    }

    await page.goto('/');

    const checkboxes = page.locator('input[type="checkbox"]');
    await checkboxes.nth(1).click();
    await checkboxes.nth(2).click();

    await expect(page.getByText('2 selected')).toBeVisible();

    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByPlaceholder('New name (leave empty to keep)').fill(newName);
    await page.getByRole('button', { name: 'Apply' }).click();

    await expect(page.getByRole('link', { name: newName })).toHaveCount(2);

    for (const id of ids) {
      await request.delete(`http://localhost:8000/api/campaigns/${id}`, {
        headers: { Authorization: `Bearer ${dmToken}` },
      });
    }
  });

  test('C8: select all campaigns', async ({ page, campaign }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: campaign.name })).toBeVisible();

    await page.getByText('Select all').click();
    await expect(page.getByText(`${1} selected`)).toBeVisible();
    await expect(page.getByText('Deselect all')).toBeVisible();
  });
});
