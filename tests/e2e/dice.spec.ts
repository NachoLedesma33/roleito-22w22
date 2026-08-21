import { expect, test } from '../fixtures/campaign-fixture';

async function openRoller(page: import('@playwright/test').Page, campaignId: string) {
  await page.goto(`/campaigns/${campaignId}`);
  await expect(page.getByTitle('Roll dice (D)')).toBeVisible();
  await page.keyboard.press('d');
  await expect(page.getByText('Dice Roller')).toBeVisible();
}

test.describe('Dice Roller', () => {
  test('DR1: tecla D abre el roller', async ({ page, campaign }) => {
    await openRoller(page, campaign.id);

    await expect(page.getByRole('button', { name: 'Roll 1d6' })).toBeVisible();
  });

  test('DR2: roll d20 muestra resultado 1-20 y entra al historial', async ({ page, campaign }) => {
    await openRoller(page, campaign.id);

    await page.getByRole('button', { name: 'd20', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Roll 1d20' })).toBeVisible();
    await page.getByRole('button', { name: 'Roll 1d20' }).click();

    await expect(page.getByRole('button', { name: 'Rolling...' })).toBeVisible();
    const total = page.locator('span.text-lg.font-bold.font-mono');
    await expect(total).toBeVisible({ timeout: 5_000 });
    const value = parseInt(await total.textContent() || '0', 10);
    expect(value).toBeGreaterThanOrEqual(1);
    expect(value).toBeLessThanOrEqual(20);

    await expect(page.getByText('History')).toBeVisible();
    await expect(page.getByText('1d20').first()).toBeVisible();
  });

  test('DR3: roll 4d6 muestra 4 resultados', async ({ page, campaign }) => {
    await openRoller(page, campaign.id);

    const plus = page.getByRole('button', { name: '+' });
    await plus.click();
    await plus.click();
    await plus.click();

    await page.getByRole('button', { name: 'Roll 4d6' }).click();

    await expect(page.locator('span.w-7.h-7')).toHaveCount(4, { timeout: 5_000 });
    await expect(page.locator('span.w-7.h-7').first()).toHaveText(/^\d$/);
  });

  test('DR4: nat20 se destaca con highlight especial', async ({ page, campaign }) => {
    await openRoller(page, campaign.id);

    await page.getByRole('button', { name: 'd20', exact: true }).click();

    await page.evaluate(() => {
      Math.random = () => 0.999;
    });
    await page.getByRole('button', { name: 'Roll 1d20' }).click();

    const chip = page.locator('span.w-7.h-7').first();
    await expect(chip).toHaveText('20', { timeout: 5_000 });
    await expect(chip).toHaveClass(/ring-emerald-500/);
  });

  test('DR5: Escape cierra el roller', async ({ page, campaign }) => {
    await openRoller(page, campaign.id);

    await page.keyboard.press('Escape');
    await expect(page.getByText('Dice Roller')).toHaveCount(0);
  });
});
