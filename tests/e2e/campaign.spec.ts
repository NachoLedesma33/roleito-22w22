import { expect, test } from '../fixtures/campaign-fixture';

test.describe('Campaign CRUD', () => {
  test('C1: crea campaña desde la UI y redirige al dashboard', async ({ page, request }) => {
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
