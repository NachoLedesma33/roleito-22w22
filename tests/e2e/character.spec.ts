import { expect, test } from '../fixtures/campaign-fixture';
import { getCharacter, PNG_1PX } from '../helpers/api-helpers';

test.describe('Character CRUD', () => {
  async function fillCharacterForm(
    page: import('@playwright/test').Page,
    data: { name: string; race?: string; className?: string },
  ) {
    await page.getByPlaceholder('Nombre del personaje').fill(data.name);
    if (data.race) await page.getByPlaceholder('Humano, Elfo...').fill(data.race);
    if (data.className) await page.getByPlaceholder('Guerrero, Mago...').fill(data.className);

    await page.getByRole('radio', { name: 'Vigor más' }).click();
    await page.getByRole('radio', { name: 'Inteligencia menos' }).click();
    await page.getByRole('radio', { name: 'Astucia más' }).click();
  }

  test('CH1: crea personaje desde la UI', async ({ page, campaign }) => {
    await page.goto(`/campaigns/${campaign.id}/characters`);
    await page.getByRole('link', { name: 'Nuevo personaje' }).click();
    await expect(page).toHaveURL(/\/characters\/new$/);

    await fillCharacterForm(page, {
      name: 'Aria',
      race: 'Elfa',
      className: 'Guerrera',
    });
    await page.getByRole('button', { name: 'Crear personaje' }).click();

    await expect(page).toHaveURL(/\/characters\/[a-z0-9-]+$/, { timeout: 10_000 });

    await page.goto(`/campaigns/${campaign.id}/characters`);
    await expect(page.getByRole('heading', { name: 'Personajes' })).toBeVisible();
    await expect(page.getByText('Aria')).toBeVisible();
  });

  test('CH2: edita personaje existente', async ({ page, campaign, request }) => {
    const created = await request.post(
      `http://localhost:8000/api/campaigns/${campaign.id}/characters`,
      { data: { name: 'Borin', type: 'player' } },
    );
    const char = await created.json();

    await page.goto(`/campaigns/${campaign.id}/characters/${char.id}`);
    await page.getByRole('link', { name: 'Editar' }).click();
    await expect(page.getByRole('heading', { name: 'Editar personaje' })).toBeVisible();

    await page.getByPlaceholder('Nombre del personaje').fill('Borin Piedra');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(page).toHaveURL(new RegExp(`/characters/${char.id}$`));
    await expect(page.getByRole('heading', { name: 'Borin Piedra' })).toBeVisible();
  });

  test('CH3: elimina personaje con confirmación', async ({ page, campaign, request }) => {
    await request.post(
      `http://localhost:8000/api/campaigns/${campaign.id}/characters`,
      { data: { name: 'Nadia', type: 'player' } },
    );

    await page.goto(`/campaigns/${campaign.id}/characters`);

    const card = page.locator('div.border.rounded-lg', { hasText: 'Nadia' }).first();
    await card.getByRole('button', { name: 'Eliminar' }).click();
    await page.getByTestId('confirm-delete').click();

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

    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page).toHaveURL(new RegExp(`/characters/${char.id}$`));

    const updated = await getCharacter(request, campaign.id, char.id);
    expect(updated.portrait_path).toBeTruthy();
  });

  test('CH5: guarda stats definidas por el DM', async ({ page, campaign }) => {
    await page.goto(`/campaigns/${campaign.id}/characters/new`);

    await fillCharacterForm(page, { name: 'Dax' });

    await page.getByLabel('Max PV').fill('13');
    await page.getByLabel('Max PM').fill('8');
    await page.getByLabel('Defensa').fill('7');

    const postPromise = page.waitForResponse(
      (res) => res.url().includes(`/campaigns/${campaign.id}/characters`) && res.request().method() === 'POST',
      { timeout: 10_000 },
    );
    await page.getByRole('button', { name: 'Crear personaje' }).click();
    const res = await postPromise;
    expect(res.status()).toBe(200);

    const saved = (await res.json()) as {
      vigor: string;
      intelligence: string;
      dexterity: string;
      cunning: string;
      max_pv: number;
      max_pm: number;
      defense: number;
    };
    expect(saved.vigor).toBe('+');
    expect(saved.intelligence).toBe('-');
    expect(saved.dexterity).toBe('/');
    expect(saved.cunning).toBe('+');
    expect(saved.max_pv).toBe(13);
    expect(saved.max_pm).toBe(8);
    expect(saved.defense).toBe(7);
  });

  test('CH6: abre catálogo visual de marcos y aplica la selección', async ({ page, campaign }) => {
    await page.goto(`/campaigns/${campaign.id}/characters/new`);

    await page.getByRole('button', { name: 'Abrir editor de marcos' }).click();

    const dialog = page.getByRole('dialog', { name: 'Marco del personaje' });
    await expect(dialog).toBeVisible();
    const gold = dialog.getByRole('button', { name: 'Oro' });
    await gold.click();
    await expect(gold).toHaveAttribute('aria-pressed', 'true');
    await dialog.getByRole('button', { name: 'Aplicar' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: 'Abrir editor de marcos' })).toContainText('Oro');

    await fillCharacterForm(page, { name: 'MarcoTest' });
    const postPromise = page.waitForResponse(
      (res) => res.url().includes(`/campaigns/${campaign.id}/characters`) && res.request().method() === 'POST',
      { timeout: 10_000 },
    );
    await page.getByRole('button', { name: 'Crear personaje' }).click();
    const res = await postPromise;
    expect(((await res.json()) as { frame: string | null }).frame).toBe('gold');
  });

  test('CH7: importa un marco GIF propio y lo aplica', async ({ page, campaign }) => {
    await page.goto(`/campaigns/${campaign.id}/characters/new`);

    await page.getByRole('button', { name: 'Abrir editor de marcos' }).click();
    const dialog = page.getByRole('dialog', { name: 'Marco del personaje' });
    await expect(dialog).toBeVisible();

    await dialog.getByLabel('Importar marco').setInputFiles({
      name: 'marco.gif',
      mimeType: 'image/gif',
      buffer: Buffer.from('GIF89a\x01\x00\x01\x00', 'binary'),
    });

    const imported = dialog.getByRole('button', { name: 'marco.gif' });
    await expect(imported).toBeVisible();
    await expect(imported.locator('img')).toHaveAttribute('src', /\/api\/static\//);
    await imported.click();
    await dialog.getByRole('button', { name: 'Aplicar' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: 'Abrir editor de marcos' })).toContainText('marco.gif');

    await fillCharacterForm(page, { name: 'MarcoGif' });
    await page.getByRole('button', { name: 'Crear personaje' }).click();

    await expect(page.getByRole('heading', { name: 'MarcoGif' })).toBeVisible();
    await expect(page.locator('img[alt="marco"]')).toHaveAttribute('src', /\/api\/static\//);
  });
});
