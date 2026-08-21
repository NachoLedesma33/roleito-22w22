import { expect, test } from '../fixtures/campaign-fixture';
import { getCharacter, PNG_1PX } from '../helpers/api-helpers';

test.describe('Character CRUD', () => {
  const VIDA = { vigor: 4, intelligence: 3, dexterity: 5, cunning: 2 };

  async function fillCharacterForm(
    page: import('@playwright/test').Page,
    data: { name: string; race?: string; className?: string },
  ) {
    await page.getByPlaceholder('Character name').fill(data.name);
    if (data.race) await page.getByPlaceholder('Humano, Elfo...').fill(data.race);
    if (data.className) await page.getByPlaceholder('Guerrero, Mago...').fill(data.className);

    const numbers = page.locator('input[type="number"]');
    await numbers.nth(0).fill(String(VIDA.vigor));
    await numbers.nth(1).fill(String(VIDA.intelligence));
    await numbers.nth(2).fill(String(VIDA.dexterity));
    await numbers.nth(3).fill(String(VIDA.cunning));
  }

  test('CH1: crea personaje desde la UI', async ({ page, campaign }) => {
    await page.goto(`/campaigns/${campaign.id}/characters`);
    await page.getByRole('link', { name: 'New Character' }).click();
    await expect(page).toHaveURL(/\/characters\/new$/);

    await fillCharacterForm(page, {
      name: 'Aria',
      race: 'Elfa',
      className: 'Guerrera',
    });
    await page.getByRole('button', { name: 'Create Character' }).click();

    await expect(page).toHaveURL(/\/characters\/[a-z0-9-]+$/, { timeout: 10_000 });

    await page.goto(`/campaigns/${campaign.id}/characters`);
    await expect(page.getByRole('heading', { name: 'Characters' })).toBeVisible();
    await expect(page.getByText('Aria')).toBeVisible();
  });

  test('CH2: edita personaje existente', async ({ page, campaign, request }) => {
    const created = await request.post(
      `http://localhost:8000/api/campaigns/${campaign.id}/characters`,
      { data: { name: 'Borin', type: 'player' } },
    );
    const char = await created.json();

    await page.goto(`/campaigns/${campaign.id}/characters/${char.id}`);
    await page.getByRole('link', { name: 'Edit' }).click();
    await expect(page.getByRole('heading', { name: 'Edit Character' })).toBeVisible();

    await page.getByPlaceholder('Character name').fill('Borin Piedra');
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page).toHaveURL(new RegExp(`/characters/${char.id}$`));
    await expect(page.getByRole('heading', { name: 'Borin Piedra' })).toBeVisible();
  });

  test('CH3: elimina personaje con confirmación', async ({ page, campaign, request }) => {
    const created = await request.post(
      `http://localhost:8000/api/campaigns/${campaign.id}/characters`,
      { data: { name: 'Nadia', type: 'player' } },
    );
    const char = await created.json();

    await page.goto(`/campaigns/${campaign.id}/characters`);
    page.on('dialog', (dialog) => dialog.accept());

    const card = page.locator('div.border.rounded-lg', { hasText: 'Nadia' }).first();
    await card.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByText('Nadia')).toHaveCount(0);
  });

  test('CH4: sube portrait de personaje', async ({ page, campaign, request }) => {
    const created = await request.post(
      `http://localhost:8000/api/campaigns/${campaign.id}/characters`,
      { data: { name: 'Cael', type: 'player' } },
    );
    const char = await created.json();

    await page.goto(`/campaigns/${campaign.id}/characters/${char.id}/edit`);

    await page.setInputFiles('input[type="file"]', {
      name: 'portrait.png',
      mimeType: 'image/png',
      buffer: PNG_1PX,
    });
    await expect(page.getByText('portrait.png')).toBeVisible();

    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page).toHaveURL(new RegExp(`/characters/${char.id}$`));

    const updated = await getCharacter(request, campaign.id, char.id);
    expect(updated.portrait_path).toBeTruthy();
  });

  test('CH5: calcula stats derivadas VIDA correctamente', async ({ page, campaign }) => {
    await page.goto(`/campaigns/${campaign.id}/characters/new`);

    await fillCharacterForm(page, { name: 'Dax' });

    const derived = page.locator('div.grid.grid-cols-3');
    await expect(derived.getByText('13', { exact: true })).toBeVisible();
    await expect(derived.getByText('8', { exact: true })).toBeVisible();
    await expect(derived.getByText('7', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Create Character' }).click();
    await expect(page).toHaveURL(/\/characters\/[a-z0-9-]+$/, { timeout: 10_000 });
  });
});
