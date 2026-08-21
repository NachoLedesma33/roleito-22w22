import { expect, test } from '../fixtures/campaign-fixture';
import { createCharacter, createScene, seedToken } from '../helpers/api-helpers';

test.describe('Character Sheet HUD', () => {
  async function openSheet(
    page: import('@playwright/test').Page,
    campaignId: string,
    sceneId: string,
    request: import('@playwright/test').APIRequestContext,
    char: { id: string; name: string },
  ) {
    await seedToken(request, campaignId, sceneId, 'character', char.id, 0, 0);
    await page.goto(`/campaigns/${campaignId}`);
    await expect(page.getByText('On Scene (1)')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: char.name }).click();
    await expect(page.getByText(`${char.name} — Sheet`)).toBeVisible();
  }

  test('CS1: click en token abre sheet con nombre y clase', async ({ page, campaign, request }) => {
    const scene = await createScene(request, campaign.id, 'Escena CS');
    const char = await createCharacter(request, campaign.id, {
      name: 'Cedric',
      class_name: 'Guerrero',
      race: 'Humano',
    });

    await openSheet(page, campaign.id, scene.id, request, char);

    await expect(page.getByText('Humano Guerrero')).toBeVisible();
    await expect(page.getByText('alive')).toBeVisible();
  });

  test('CS2: tab Stats muestra VIDA y derivados correctos', async ({ page, campaign, request }) => {
    const scene = await createScene(request, campaign.id, 'Escena Stats');
    const char = await createCharacter(request, campaign.id, {
      name: 'Cedric',
      vigor: 4,
      intelligence: 3,
      dexterity: 5,
      cunning: 2,
    });

    await openSheet(page, campaign.id, scene.id, request, char);

    const statValue = (label: string) =>
      page.locator(`div:has(> p:text-is("${label}")) > p`).nth(1);

    await expect(page.getByText('Vigor', { exact: true })).toBeVisible();
    await expect(statValue('Vigor')).toHaveText('4');
    await expect(statValue('Intel')).toHaveText('3');
    await expect(statValue('Dest')).toHaveText('5');
    await expect(statValue('Astuc')).toHaveText('2');
    await expect(statValue('Max PV')).toHaveText('13');
    await expect(statValue('Max PM')).toHaveText('8');
    await expect(statValue('Defensa')).toHaveText('7');
  });

  test('CS3: tab Inventory muestra lista vacía inicial', async ({ page, campaign, request }) => {
    const scene = await createScene(request, campaign.id, 'Escena Inv');
    const char = await createCharacter(request, campaign.id, { name: 'Cedric' });

    await openSheet(page, campaign.id, scene.id, request, char);

    await page.getByRole('button', { name: 'inventory' }).click();

    await expect(page.getByRole('button', { name: '+ Add Item' })).toBeVisible();
  });

  test('CS4: add item lo agrega a la lista y persiste', async ({ page, campaign, request }) => {
    const scene = await createScene(request, campaign.id, 'Escena AddItem');
    const char = await createCharacter(request, campaign.id, { name: 'Cedric' });

    await openSheet(page, campaign.id, scene.id, request, char);
    await page.getByRole('button', { name: 'inventory' }).click();

    const putPromise = page.waitForResponse(
      (res) =>
        res.url().includes(`/characters/${char.id}`) &&
        res.request().method() === 'PUT',
      { timeout: 10_000 },
    );
    await page.getByRole('button', { name: '+ Add Item' }).click();
    await putPromise;

    await expect(page.getByPlaceholder('Item name')).toHaveValue('New Item');

    const stored = await request.get(`http://localhost:8000/api/campaigns/${campaign.id}/characters/${char.id}`);
    const body = await stored.json();
    expect(body.inventory_json).toHaveLength(1);
    expect(body.inventory_json[0].name).toBe('New Item');
  });

  test('CS5: toggle equipped cambia estado del item', async ({ page, campaign, request }) => {
    const scene = await createScene(request, campaign.id, 'Escena Equip');
    const char = await createCharacter(request, campaign.id, { name: 'Cedric' });
    await request.put(`http://localhost:8000/api/campaigns/${campaign.id}/characters/${char.id}`, {
      data: {
        inventory_json: [{ id: 'item-1', name: 'Espada', description: '', quantity: 1 }],
      },
    });

    await openSheet(page, campaign.id, scene.id, request, char);
    await page.getByRole('button', { name: 'inventory' }).click();

    const checkbox = page.getByTitle('Equipped');
    await expect(checkbox).not.toBeChecked();

    const putPromise = page.waitForResponse(
      (res) =>
        res.url().includes(`/characters/${char.id}`) &&
        res.request().method() === 'PUT' &&
        res.status() === 200,
      { timeout: 10_000 },
    );
    await checkbox.click();
    await putPromise;
    await expect(checkbox).toBeChecked();

    const stored = await request.get(`http://localhost:8000/api/campaigns/${campaign.id}/characters/${char.id}`);
    const body = await stored.json();
    expect(body.inventory_json[0].equipped).toBe(true);
  });

  test('CS6: tab Spells visible', async ({ page, campaign, request }) => {
    const scene = await createScene(request, campaign.id, 'Escena Spells');
    const char = await createCharacter(request, campaign.id, { name: 'Cedric' });

    await openSheet(page, campaign.id, scene.id, request, char);

    await page.getByRole('button', { name: 'spells' }).click();

    await expect(page.getByRole('button', { name: '+ Add Spell' })).toBeVisible();
  });

  test('CS7: add spell lo agrega a la lista y persiste', async ({ page, campaign, request }) => {
    const scene = await createScene(request, campaign.id, 'Escena AddSpell');
    const char = await createCharacter(request, campaign.id, { name: 'Cedric' });

    await openSheet(page, campaign.id, scene.id, request, char);
    await page.getByRole('button', { name: 'spells' }).click();

    const putPromise = page.waitForResponse(
      (res) =>
        res.url().includes(`/characters/${char.id}`) &&
        res.request().method() === 'PUT',
      { timeout: 10_000 },
    );
    await page.getByRole('button', { name: '+ Add Spell' }).click();
    await putPromise;

    await expect(page.getByPlaceholder('Spell name')).toHaveValue('New Spell');
    await expect(page.getByText('Lv1')).toBeVisible();
    await expect(page.getByText('1 PM')).toBeVisible();

    const stored = await request.get(`http://localhost:8000/api/campaigns/${campaign.id}/characters/${char.id}`);
    const body = await stored.json();
    expect(body.spells_json).toHaveLength(1);
    expect(body.spells_json[0].name).toBe('New Spell');
  });

  test('CS8: control PV ajusta current_pv y persiste', async ({ page, campaign, request }) => {
    const scene = await createScene(request, campaign.id, 'Escena PV');
    const char = await createCharacter(request, campaign.id, {
      name: 'Cedric',
      vigor: 4,
      dexterity: 5,
    });

    await openSheet(page, campaign.id, scene.id, request, char);

    const pvInput = page.locator('input.text-red-400');
    await expect(pvInput).toHaveValue('13');

    const putPromise = page.waitForResponse(
      (res) =>
        res.url().includes(`/characters/${char.id}`) &&
        res.request().method() === 'PUT' &&
        res.status() === 200,
      { timeout: 10_000 },
    );
    await page.locator('button.bg-red-900\\/50').first().click();
    await pvInput.focus();
    await page.keyboard.press('Tab');
    await putPromise;

    await expect(pvInput).toHaveValue('12');

    const stored = await request.get(`http://localhost:8000/api/campaigns/${campaign.id}/characters/${char.id}`);
    const body = await stored.json();
    expect(body.current_pv).toBe(12);
  });
});
