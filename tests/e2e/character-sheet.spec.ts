import { randomUUID } from 'node:crypto';
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
    await expect(page.getByText('PV máx.')).toBeVisible();
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
    await expect(page.getByText('Vivo')).toBeVisible();
  });

  test('CS2: tab Stats muestra VIDA y derivados correctos', async ({ page, campaign, request }) => {
    const scene = await createScene(request, campaign.id, 'Escena Stats');
    const char = await createCharacter(request, campaign.id, {
      name: 'Cedric',
      vigor: '+',
      intelligence: '/',
      dexterity: '-',
      cunning: '/',
      max_pv: 13,
      max_pm: 8,
      defense: 7,
    });

    await openSheet(page, campaign.id, scene.id, request, char);

    const statValue = (label: string) =>
      page.locator(`div:has(> p:text-is("${label}")) > p`).nth(1);

    await expect(page.getByText('Vigor', { exact: true })).toBeVisible();
    await expect(statValue('Vigor')).toHaveText('+');
    await expect(statValue('Intel')).toHaveText('/');
    await expect(statValue('Dest')).toHaveText('−');
    await expect(statValue('Astuc')).toHaveText('/');
    await expect(statValue('PV máx.')).toHaveText('13');
    await expect(statValue('PM máx.')).toHaveText('8');
    await expect(statValue('Defensa')).toHaveText('7');
  });

  test('CS3: tab Inventory muestra lista vacía inicial', async ({ page, campaign, request }) => {
    const scene = await createScene(request, campaign.id, 'Escena Inv');
    const char = await createCharacter(request, campaign.id, { name: 'Cedric' });

    await openSheet(page, campaign.id, scene.id, request, char);

    await page.getByRole('button', { name: 'Inventario' }).click();

    await expect(page.getByRole('button', { name: '+ Agregar objeto' })).toBeVisible();
  });

  test('CS4: add item lo agrega a la lista y persiste', async ({ page, campaign, request }) => {
    const scene = await createScene(request, campaign.id, 'Escena AddItem');
    const char = await createCharacter(request, campaign.id, { name: 'Cedric' });

    await openSheet(page, campaign.id, scene.id, request, char);
    await page.getByRole('button', { name: 'Inventario' }).click();

    const putPromise = page.waitForResponse(
      (res) =>
        res.url().includes(`/characters/${char.id}`) &&
        res.request().method() === 'PUT',
      { timeout: 10_000 },
    );
    await page.getByRole('button', { name: '+ Agregar objeto' }).click();
    await putPromise;

    await expect(page.getByPlaceholder('Nombre del objeto')).toHaveValue('Nuevo objeto');

    const stored = await request.get(`http://localhost:8000/api/campaigns/${campaign.id}/characters/${char.id}`);
    const body = await stored.json();
    expect(body.inventory_json).toHaveLength(1);
    expect(body.inventory_json[0].name).toBe('Nuevo objeto');
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
    await page.getByRole('button', { name: 'Inventario' }).click();

    const checkbox = page.getByTitle('Equipado');
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

    await page.getByRole('button', { name: 'Conjuros' }).click();

    await expect(page.getByRole('button', { name: '+ Agregar conjuro' })).toBeVisible();
  });

  test('CS7: add spell lo agrega a la lista y persiste', async ({ page, campaign, request }) => {
    const scene = await createScene(request, campaign.id, 'Escena AddSpell');
    const char = await createCharacter(request, campaign.id, { name: 'Cedric' });

    await openSheet(page, campaign.id, scene.id, request, char);
    await page.getByRole('button', { name: 'Conjuros' }).click();

    const putPromise = page.waitForResponse(
      (res) =>
        res.url().includes(`/characters/${char.id}`) &&
        res.request().method() === 'PUT',
      { timeout: 10_000 },
    );
    await page.getByRole('button', { name: '+ Agregar conjuro' }).click();
    await putPromise;

    await expect(page.getByPlaceholder('Nombre del conjuro')).toHaveValue('Nuevo conjuro');
    await expect(page.getByText('Lv1')).toBeVisible();
    await expect(page.getByText('1 PM')).toBeVisible();

    const stored = await request.get(`http://localhost:8000/api/campaigns/${campaign.id}/characters/${char.id}`);
    const body = await stored.json();
    expect(body.spells_json).toHaveLength(1);
    expect(body.spells_json[0].name).toBe('Nuevo conjuro');
  });

  test('CS8: control PV ajusta current_pv y persiste', async ({ page, campaign, request }) => {
    const scene = await createScene(request, campaign.id, 'Escena PV');
    const char = await createCharacter(request, campaign.id, {
      name: 'Cedric',
      max_pv: 13,
      max_pm: 8,
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

  test('CS9: catálogo permite aprender una habilidad ya existente', async ({ page, campaign, request }) => {
    const scene = await createScene(request, campaign.id, 'Escena Catalogo');
    const a = await createCharacter(request, campaign.id, { name: 'Aria' });
    const b = await createCharacter(request, campaign.id, { name: 'Borin' });
    // id por corrida: una fila vieja en el catalogo no tiene que colisionar.
    const spellId = `spell-${randomUUID()}`;

    // Aria ya sabe una habilidad: tiene que aparecer en el catalogo de Borin,
    // sin duplicar la fila del catalogo.
    const put = await request.put(
      `http://localhost:8000/api/campaigns/${campaign.id}/characters/${a.id}`,
      {
        data: {
          spells_json: [
            { id: spellId, name: 'Bola de Fuego', description: '', level: 3, cost_pm: 5 },
          ],
        },
      },
    );
    expect(put.status()).toBe(200);

    const catalog = await request.get(`http://localhost:8000/api/campaigns/${campaign.id}/abilities`);
    expect(catalog.status()).toBe(200);
    expect(await catalog.json()).toHaveLength(1);

    await openSheet(page, campaign.id, scene.id, request, b);
    await page.getByRole('button', { name: 'Conjuros' }).click();

    await expect(page.getByText('Catálogo de la campaña')).toBeVisible();
    await expect(page.getByText('Bola de Fuego')).toBeVisible();

    const putPromise = page.waitForResponse(
      (res) =>
        res.url().includes(`/characters/${b.id}`) &&
        res.request().method() === 'PUT' &&
        res.status() === 200,
      { timeout: 10_000 },
    );
    await page.getByTitle('Aprender').click();
    await putPromise;

    const stored = await request.get(
      `http://localhost:8000/api/campaigns/${campaign.id}/characters/${b.id}`,
    );
    const body = await stored.json();
    expect(body.spells_json).toHaveLength(1);
    expect(body.spells_json[0].id).toBe(spellId);
    expect(body.spells_json[0].cost_pm).toBe(5);

    // Una sola fila en el catalogo aunque dos fichas la sepan.
    const finalCatalog = await request.get(
      `http://localhost:8000/api/campaigns/${campaign.id}/abilities`,
    );
    const rows = await finalCatalog.json();
    expect(rows).toHaveLength(1);
    expect(rows[0].owners).toBe(2);
  });

  test('CS10: el icono elegido en la ficha queda en el catálogo compartido', async ({
    page,
    campaign,
    request,
  }) => {
    const scene = await createScene(request, campaign.id, 'Escena Iconos');
    const a = await createCharacter(request, campaign.id, { name: 'Aria' });
    const b = await createCharacter(request, campaign.id, { name: 'Borin' });
    const spellId = `spell-${randomUUID()}`;

    const put = await request.put(
      `http://localhost:8000/api/campaigns/${campaign.id}/characters/${a.id}`,
      {
        data: {
          spells_json: [
            { id: spellId, name: 'Bola de Fuego', description: '', level: 3, cost_pm: 5 },
          ],
        },
      },
    );
    expect(put.status()).toBe(200);

    await openSheet(page, campaign.id, scene.id, request, b);
    await page.getByRole('button', { name: 'Conjuros' }).click();

    // Sin icono, el chip muestra la inicial del nombre.
    const chip = page.getByTitle('Elegir icono');
    await expect(chip).toHaveText('B');

    await chip.click();
    const savedPromise = page.waitForResponse(
      (res) =>
        res.url().includes(`/abilities/${spellId}/icon/flame`) &&
        res.request().method() === 'PUT' &&
        res.status() === 200,
      { timeout: 10_000 },
    );
    await page.getByTitle('Llama').click();
    await savedPromise;

    await expect(chip).toHaveText('🔥');

    // El icono vive en la fila del catálogo: Aria, que sí sabe la habilidad,
    // la ve igual sin tocar su ficha.
    const catalog = await request.get(`http://localhost:8000/api/campaigns/${campaign.id}/abilities`);
    const rows = await catalog.json();
    expect(rows).toHaveLength(1);
    expect(rows[0].icon).toBe('flame');

    const stored = await request.get(
      `http://localhost:8000/api/campaigns/${campaign.id}/characters/${a.id}`,
    );
    expect((await stored.json()).spells_json[0].icon).toBe('flame');
  });

  test('CS11: borrar del catálogo la saca de la campaña entera', async ({
    page,
    campaign,
    request,
  }) => {
    const scene = await createScene(request, campaign.id, 'Escena Borrado');
    const a = await createCharacter(request, campaign.id, { name: 'Aria' });
    const b = await createCharacter(request, campaign.id, { name: 'Borin' });
    // Dos fichas ajenas la saben: Borin (el que abre la ficha) no.
    const c = await createCharacter(request, campaign.id, { name: 'Calen' });
    const spellId = `spell-${randomUUID()}`;

    for (const char of [a, c]) {
      const put = await request.put(
        `http://localhost:8000/api/campaigns/${campaign.id}/characters/${char.id}`,
        {
          data: {
            spells_json: [
              { id: spellId, name: 'Bola de Fuego', description: '', level: 3, cost_pm: 5 },
            ],
          },
        },
      );
      expect(put.status()).toBe(200);
    }

    await openSheet(page, campaign.id, scene.id, request, b);
    await page.getByRole('button', { name: 'Conjuros' }).click();
    await expect(page.getByText('Bola de Fuego')).toBeVisible();

    // Modal de confirmación centrado, no un alert del navegador.
    await page.getByTitle('Eliminar del catálogo').click();
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    // El aviso tenía que decir que la saben dos fichas, no una.
    await expect(modal).toContainText('2 fichas');

    // Cancelar cierra el modal y no borra nada.
    await modal.getByRole('button', { name: 'Cancelar' }).click();
    await expect(modal).toHaveCount(0);
    const stillThere = await request.get(
      `http://localhost:8000/api/campaigns/${campaign.id}/abilities`,
    );
    expect(await stillThere.json()).toHaveLength(1);

    const delPromise = page.waitForResponse(
      (res) =>
        res.url().includes(`/abilities/${spellId}`) &&
        res.request().method() === 'DELETE' &&
        res.status() === 200,
      { timeout: 10_000 },
    );
    await page.getByTitle('Eliminar del catálogo').click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Eliminar', exact: true })
      .click();
    await delPromise;
    await expect(page.getByText('Bola de Fuego')).toHaveCount(0);

    const catalog = await request.get(`http://localhost:8000/api/campaigns/${campaign.id}/abilities`);
    expect(await catalog.json()).toHaveLength(0);

    // Aria y Calen sí la sabían: el borrado es del catálogo, les desaparece.
    for (const char of [a, c]) {
      const stored = await request.get(
        `http://localhost:8000/api/campaigns/${campaign.id}/characters/${char.id}`,
      );
      expect((await stored.json()).spells_json).toHaveLength(0);
    }
  });
});
