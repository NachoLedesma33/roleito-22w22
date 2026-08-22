import { expect, test } from '../fixtures/campaign-fixture';
import { createNpc } from '../helpers/api-helpers';

test.describe('NPC CRUD', () => {
  test('N1: crea NPC desde la UI', async ({ page, campaign }) => {
    await page.goto(`/campaigns/${campaign.id}/npcs`);
    await page.getByRole('link', { name: 'New NPC' }).click();
    await expect(page).toHaveURL(/\/npcs\/new$/);

    await page.getByPlaceholder('NPC name').fill('Gorlok');
    await page.getByPlaceholder('Who is this NPC?').fill('Orco mercader de pieles');
    await page.getByRole('button', { name: 'Create NPC' }).click();

    await expect(page).toHaveURL(/\/npcs\/[a-z0-9-]+$/, { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Gorlok' })).toBeVisible();

    await page.goto(`/campaigns/${campaign.id}/npcs`);
    await expect(page.getByRole('heading', { name: 'NPCs', level: 1 })).toBeVisible();
    await expect(page.getByText('Gorlok')).toBeVisible();
    await expect(page.getByText('Orco mercader de pieles')).toBeVisible();
  });

  test('N2: edita NPC existente', async ({ page, campaign, request }) => {
    const npc = await createNpc(request, campaign.id, { name: 'Varek' });

    await page.goto(`/campaigns/${campaign.id}/npcs/${npc.id}`);
    await expect(page.getByRole('heading', { name: 'Varek' })).toBeVisible();

    await page.getByRole('link', { name: 'Edit' }).click();
    await expect(page.getByRole('heading', { name: 'Edit NPC' })).toBeVisible();

    await page
      .getByPlaceholder('Who is this NPC?')
      .fill('Contrabandista de la prisión');
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page).toHaveURL(new RegExp(`/npcs/${npc.id}$`));
    await expect(
      page.getByText('Contrabandista de la prisión'),
    ).toBeVisible();
  });

  test('N3: elimina NPC con confirmación', async ({ page, campaign, request }) => {
    const npc = await createNpc(request, campaign.id, { name: 'Nix' });

    await page.goto(`/campaigns/${campaign.id}/npcs`);
    await expect(page.getByText('Nix')).toBeVisible();
    page.on('dialog', (dialog) => dialog.accept());

    const card = page.locator('div.border.rounded-lg', { hasText: 'Nix' }).first();
    await card.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByText('Nix')).toHaveCount(0);
  });
});
