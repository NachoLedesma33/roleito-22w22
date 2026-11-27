import { BACKEND_URL } from '../config';
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
    await page.getByTestId('fichas-toggle').click();
    await expect(page.getByText('En escena (1)')).toBeVisible({ timeout: 10_000 });
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
      { timeout: 30_000 },
    );
    await page.getByRole('button', { name: '+ Agregar objeto' }).click();
    await putPromise;

    await expect(page.getByPlaceholder('Nombre del objeto')).toHaveValue('Nuevo objeto');

    const stored = await request.get(`${BACKEND_URL}/api/campaigns/${campaign.id}/characters/${char.id}`);
    const body = await stored.json();
    expect(body.inventory_json).toHaveLength(1);
    expect(body.inventory_json[0].name).toBe('Nuevo objeto');
  });

  test('CS5: toggle equipped cambia estado del item', async ({ page, campaign, request }) => {
    const scene = await createScene(request, campaign.id, 'Escena Equip');
    const char = await createCharacter(request, campaign.id, { name: 'Cedric' });
    await request.put(`${BACKEND_URL}/api/campaigns/${campaign.id}/characters/${char.id}`, {
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
      { timeout: 30_000 },
    );
    await checkbox.click();
    await putPromise;
    await expect(checkbox).toBeChecked();

    const stored = await request.get(`${BACKEND_URL}/api/campaigns/${campaign.id}/characters/${char.id}`);
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
      { timeout: 30_000 },
    );
    await page.getByRole('button', { name: '+ Agregar conjuro' }).click();
    await putPromise;

    const nueva = page
      .locator('div.group')
      .filter({ has: page.getByPlaceholder('Nombre del conjuro') });
    await expect(page.getByPlaceholder('Nombre del conjuro')).toHaveValue('Nuevo conjuro');
    await expect(nueva).toContainText('Lv1');
    await expect(nueva).toContainText('1 PM');

    const stored = await request.get(`${BACKEND_URL}/api/campaigns/${campaign.id}/characters/${char.id}`);
    const body = await stored.json();
    expect(body.spells_json).toHaveLength(1);
    expect(body.spells_json[0].name).toBe('Nuevo conjuro');
  });

  test('CS8: control PV ajusta current_pv y persiste', async ({ page, campaign, request }) => {
    // Cargar la escena 3D + abrir la ficha lleva el test al borde del timeout
    // default: en el runner del CI (mas lento) se pasaba.
    test.setTimeout(60_000);

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
      { timeout: 30_000 },
    );
    await page.locator('button.bg-red-900\\/50').first().click();
    await pvInput.focus();
    await page.keyboard.press('Tab');
    await putPromise;

    await expect(pvInput).toHaveValue('12');

    const stored = await request.get(`${BACKEND_URL}/api/campaigns/${campaign.id}/characters/${char.id}`);
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
      `${BACKEND_URL}/api/campaigns/${campaign.id}/characters/${a.id}`,
      {
        data: {
          spells_json: [
            { id: spellId, name: 'Bola de Fuego', description: '', level: 3, cost_pm: 5 },
          ],
        },
      },
    );
    expect(put.status()).toBe(200);

    const catalog = await request.get(`${BACKEND_URL}/api/campaigns/${campaign.id}/abilities`);
    expect(catalog.status()).toBe(200);
    const rowsBefore = await catalog.json();
    expect(rowsBefore.filter((r: { id: string }) => r.id === spellId)).toHaveLength(1);

    await openSheet(page, campaign.id, scene.id, request, b);
    await page.getByRole('button', { name: 'Conjuros' }).click();

    await expect(page.getByText('Catálogo de la campaña')).toBeVisible();
    const fila = page
      .getByText('Bola de Fuego', { exact: true })
      .locator('..')
      .filter({ hasText: '5 PM' });
    await expect(fila).toHaveCount(1);
    await expect(fila).toBeVisible();

    const putPromise = page.waitForResponse(
      (res) =>
        res.url().includes(`/characters/${b.id}`) &&
        res.request().method() === 'PUT' &&
        res.status() === 200,
      { timeout: 30_000 },
    );
    await fila.getByTitle('Aprender').click();
    await putPromise;

    const stored = await request.get(
      `${BACKEND_URL}/api/campaigns/${campaign.id}/characters/${b.id}`,
    );
    const body = await stored.json();
    expect(body.spells_json).toHaveLength(1);
    expect(body.spells_json[0].id).toBe(spellId);
    expect(body.spells_json[0].cost_pm).toBe(5);

    // Una sola fila en el catalogo aunque dos fichas la sepan.
    const finalCatalog = await request.get(
      `${BACKEND_URL}/api/campaigns/${campaign.id}/abilities`,
    );
    const rows = await finalCatalog.json();
    expect(rows.filter((r: { id: string }) => r.id === spellId)).toHaveLength(1);
    expect(rows.find((r: { id: string }) => r.id === spellId)?.owners).toBe(2);
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
      `${BACKEND_URL}/api/campaigns/${campaign.id}/characters/${a.id}`,
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

    // Sin icono, el chip muestra la inicial del nombre. El pack base ya llena
    // el catálogo, así que el chip se busca en la fila de esta habilidad.
    const chip = page
      .getByText('Bola de Fuego', { exact: true })
      .locator('..')
      .filter({ hasText: '5 PM' })
      .getByTitle('Elegir icono');
    await expect(chip).toHaveText('B');

    await chip.click();
    const savedPromise = page.waitForResponse(
      (res) =>
        res.url().includes(`/abilities/${spellId}/icon/flame`) &&
        res.request().method() === 'PUT' &&
        res.status() === 200,
      { timeout: 30_000 },
    );
    await page.getByTitle('Llama').click();
    await savedPromise;

    await expect(chip).toHaveText('🔥');

    // El icono vive en la fila del catálogo: Aria, que sí sabe la habilidad,
    // la ve igual sin tocar su ficha.
    const catalog = await request.get(`${BACKEND_URL}/api/campaigns/${campaign.id}/abilities`);
    const rows = await catalog.json();
    expect(rows.find((r: { id: string }) => r.id === spellId)?.icon).toBe('flame');

    const stored = await request.get(
      `${BACKEND_URL}/api/campaigns/${campaign.id}/characters/${a.id}`,
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
        `${BACKEND_URL}/api/campaigns/${campaign.id}/characters/${char.id}`,
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
    const fila = page
      .getByText('Bola de Fuego', { exact: true })
      .locator('..')
      .filter({ hasText: '5 PM' });
    await expect(fila).toHaveCount(1);
    await expect(fila).toBeVisible();

    // Modal de confirmación centrado, no un alert del navegador.
    await fila.getByTitle('Eliminar del catálogo').click();
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    // El aviso tenía que decir que la saben dos fichas, no una.
    await expect(modal).toContainText('2 fichas');

    // Cancelar cierra el modal y no borra nada.
    await modal.getByRole('button', { name: 'Cancelar' }).click();
    await expect(modal).toHaveCount(0);
    const stillThere = await request.get(
      `${BACKEND_URL}/api/campaigns/${campaign.id}/abilities`,
    );
    const stillRows = await stillThere.json();
    expect(stillRows.filter((r: { id: string }) => r.id === spellId)).toHaveLength(1);

    const delPromise = page.waitForResponse(
      (res) =>
        res.url().includes(`/abilities/${spellId}`) &&
        res.request().method() === 'DELETE' &&
        res.status() === 200,
      { timeout: 30_000 },
    );
    await fila.getByTitle('Eliminar del catálogo').click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Eliminar', exact: true })
      .click();
    await delPromise;
    await expect(fila).toHaveCount(0);
    // La del pack base sigue; solo se fue la fila creada por el test.
    await expect(page.getByText('Bola de Fuego', { exact: true })).toHaveCount(1);

    const catalog = await request.get(`${BACKEND_URL}/api/campaigns/${campaign.id}/abilities`);
    const finalRows = await catalog.json();
    expect(finalRows.filter((r: { id: string }) => r.id === spellId)).toHaveLength(0);

    // Aria y Calen sí la sabían: el borrado es del catálogo, les desaparece.
    for (const char of [a, c]) {
      const stored = await request.get(
        `${BACKEND_URL}/api/campaigns/${campaign.id}/characters/${char.id}`,
      );
      expect((await stored.json()).spells_json).toHaveLength(0);
    }
  });

  test('CS12: agregar pack base repuebla el catálogo de una campaña vacía', async ({
    page,
    campaign,
    request,
  }) => {
    const initial = (await (
      await request.get(`${BACKEND_URL}/api/campaigns/${campaign.id}/abilities`)
    ).json()) as Array<{ id: string }>;
    for (const ability of initial) {
      const del = await request.delete(
        `${BACKEND_URL}/api/campaigns/${campaign.id}/abilities/${ability.id}`,
      );
      expect(del.status()).toBe(200);
    }

    const scene = await createScene(request, campaign.id, 'Escena CS12');
    const char = await createCharacter(request, campaign.id, { name: 'Bruja CS12' });
    await openSheet(page, campaign.id, scene.id, request, char);
    await page.getByRole('button', { name: 'Conjuros' }).click();

    const button = page.getByRole('button', { name: 'Agregar pack base' });
    await expect(button).toBeVisible();
    await button.click();
    await expect(page.getByText('Catálogo de la campaña')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Bola de Fuego', { exact: true })).toBeVisible();

    const after = (await (
      await request.get(`${BACKEND_URL}/api/campaigns/${campaign.id}/abilities`)
    ).json()) as Array<{ vfx_type: string | null }>;
    expect(after).toHaveLength(36);
  });

  test('CS20: muestra el marco propio animado en la ficha del tablero', async ({ page, campaign, request }) => {
    const scene = await createScene(request, campaign.id, 'Escena Marco');
    const uploaded = await request.post(`${BACKEND_URL}/api/campaigns/${campaign.id}/assets`, {
      multipart: {
        file: { name: 'aur.gif', mimeType: 'image/gif', buffer: Buffer.from('GIF89a\x01\x00\x01\x00', 'binary') },
        category: 'frames',
      },
    });
    expect(uploaded.ok()).toBeTruthy();
    const assetId = (await uploaded.json()).asset_id as string;

    const created = await request.post(`${BACKEND_URL}/api/campaigns/${campaign.id}/characters`, {
      data: {
        name: 'Mara',
        frame: 'custom',
        visual_config_json: { frame: { version: 1, assetId, scale: 1, x: 0, y: 0 } },
      },
    });
    expect(created.ok()).toBeTruthy();
    const char = (await created.json()) as { id: string; name: string };

    await openSheet(page, campaign.id, scene.id, request, char);
    await expect(page.locator('img[alt="marco"]')).toHaveAttribute('src', /\/api\/static\//);
  });
});
