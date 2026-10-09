import { expect, test } from '../fixtures/campaign-fixture';

async function openRoller(page: import('@playwright/test').Page, campaignId: string) {
  await page.goto(`/campaigns/${campaignId}`);
  await page.getByTitle('Acciones del DM').hover();
  await expect(page.getByTitle('Tirar dados (D)')).toBeVisible();
  await page.keyboard.press('d');
  await expect(page.getByTestId('hud-dice-roller')).toBeVisible();
}

const grid = (v: number) => Math.round(v / 20) * 20;

test.describe('HUD resize/snap/minimizar', () => {
  test('H1: redimensiona por el borde inferior', async ({ page, campaign }) => {
    await openRoller(page, campaign.id);
    const panel = page.getByTestId('hud-dice-roller');
    const before = (await panel.boundingBox())!;

    await page.mouse.move(before.x + before.width / 2, before.y + before.height - 2);
    await page.mouse.down();
    await page.mouse.move(before.x + before.width / 2, before.y + before.height + 60, { steps: 8 });
    await page.mouse.up();

    await expect
      .poll(async () => (await panel.boundingBox())?.height ?? 0)
      .toBeGreaterThan(before.height + 40);
  });

  test('H2: el drag ajusta la posicion al grid de 20px', async ({ page, campaign }) => {
    await openRoller(page, campaign.id);
    const panel = page.getByTestId('hud-dice-roller');
    const before = (await panel.boundingBox())!;
    const dx = 37;
    const dy = 23;

    await page.mouse.move(before.x + 40, before.y + 12);
    await page.mouse.down();
    await page.mouse.move(before.x + 40 + dx, before.y + 12 + dy, { steps: 6 });
    await page.mouse.up();

    const expectedX = grid(before.x + dx);
    const expectedY = grid(before.y + dy);
    await expect
      .poll(async () => {
        const box = await panel.boundingBox();
        return box ? Math.abs(box.x - expectedX) + Math.abs(box.y - expectedY) : 1e9;
      })
      .toBeLessThan(4);
  });

  test('H3: minimizar envia el panel al MinimizedBar y restaura', async ({ page, campaign }) => {
    await openRoller(page, campaign.id);
    const panel = page.getByTestId('hud-dice-roller');
    const box = (await panel.boundingBox())!;

    await page.mouse.move(box.x + box.width - 24, box.y + 4);
    await page.getByTitle('Minimizar').click();

    await expect(panel).not.toBeVisible();
    const pill = page.getByRole('button', { name: 'Tirada de dados' });
    await expect(pill).toBeVisible();
    await pill.click();
    await expect(panel).toBeVisible();
    await expect(pill).not.toBeVisible();
  });

  test('H4: el tamaño persiste tras recargar', async ({ page, campaign }) => {
    await openRoller(page, campaign.id);
    const panel = page.getByTestId('hud-dice-roller');
    const before = (await panel.boundingBox())!;

    await page.mouse.move(before.x + before.width / 2, before.y + before.height - 2);
    await page.mouse.down();
    await page.mouse.move(before.x + before.width / 2, before.y + before.height + 60, { steps: 8 });
    await page.mouse.up();
    await expect
      .poll(async () => (await panel.boundingBox())?.height ?? 0)
      .toBeGreaterThan(before.height + 40);

    await page.reload();
    await page.getByTitle('Acciones del DM').hover();
    await expect(page.getByTitle('Tirar dados (D)')).toBeVisible();
    await page.keyboard.press('d');
    await expect(panel).toBeVisible();
    await expect
      .poll(async () => (await panel.boundingBox())?.height ?? 0)
      .toBeGreaterThan(before.height + 40);
  });
});