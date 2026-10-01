import { expect, test } from '../fixtures/campaign-fixture';
import { PNG_1PX, createScene } from '../helpers/api-helpers';

test.describe('Campaign CRUD', () => {
  test('C1: crea campaña desde la UI y redirige al dashboard', async ({ page }) => {
    const name = `UI Campaign ${Date.now()}`;

    await page.goto('/');
    await page.getByRole('link', { name: 'Nueva campaña' }).click();
    await expect(page).toHaveURL(/\/campaigns\/new$/);

    await page.getByPlaceholder('Nombre de la campaña').fill(name);
    await page.getByRole('button', { name: 'Crear campaña' }).click();

    await expect(page).toHaveURL(/\/campaigns\/[a-z0-9-]+$/, { timeout: 10_000 });
    await expect(page.getByRole('link', { name })).toBeVisible();
  });

  test('C2: lista campañas existentes', async ({ page, campaign }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Campañas' })).toBeVisible();
    await expect(page.getByRole('link', { name: campaign.name })).toBeVisible();
  });

  test('C3: edita nombre de campaña', async ({ page, campaign }) => {
    const newName = `${campaign.name} EDITED`;

    await page.goto(`/campaigns/${campaign.id}/edit`);
    await expect(page.getByRole('heading', { name: 'Editar campaña' })).toBeVisible();
    await expect(page.getByPlaceholder('Nombre de la campaña')).toHaveValue(campaign.name);

    await page.getByPlaceholder('Nombre de la campaña').fill(newName);
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(page).toHaveURL(new RegExp(`/campaigns/${campaign.id}$`));
    await page.goto('/');
    await expect(page.getByRole('link', { name: newName })).toBeVisible();
  });

  test('C4: elimina campaña con confirmación', async ({ page, campaign }) => {
    await page.goto('/');

    page.on('dialog', (dialog) => dialog.accept());

    const card = page.locator('div.border.rounded-lg', { hasText: campaign.name }).first();
    await card.getByRole('button', { name: 'Eliminar' }).click();

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

    await expect(page.getByText('2 seleccionadas')).toBeVisible();

    page.on('dialog', (dialog) => dialog.accept());
    const bulkBar = page.locator('div.mb-4.p-3.rounded-lg').filter({ hasText: '2 seleccionadas' });
    await bulkBar.getByRole('button', { name: 'Eliminar', exact: true }).click();

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

    await expect(page.getByText('2 seleccionadas')).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar (combinado)' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/campaigns-bulk-.*\.json/);

    for (const id of ids) {
      await request.delete(`http://localhost:8000/api/campaigns/${id}`, {
        headers: { Authorization: `Bearer ${dmToken}` },
      });
    }
  });

  test('C7: bulk edit campaigns', async ({ page, request, dmToken }) => {
    const names = [`Editar A ${Date.now()}`, `Editar B ${Date.now()}`];
    const ids: string[] = [];
    const newName = `Editado ${Date.now()}`;

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

    await expect(page.getByText('2 seleccionadas')).toBeVisible();

    await page.getByRole('button', { name: 'Editar' }).click();
    await page.getByPlaceholder('Nuevo nombre (vacío = mantener)').fill(newName);
    await page.getByRole('button', { name: 'Aplicar' }).click();

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

    const rows = page.locator('input[type="checkbox"]');
    const expectedCount = (await rows.count()) - 1;
    await rows.first().click();
    await expect(page.getByText(`${expectedCount} seleccionadas`)).toBeVisible();
    await expect(page.getByText('Deseleccionar todas')).toBeVisible();
  });
});

test.describe('Campaign Import', () => {
  test('C9: import roundtrip preserva campaña y remapea referencias', async ({ request, authHeaders }) => {
    const name = `Importado ${Date.now()}`;
    const payload = {
      campaign: {
        id: 'camp-old',
        name,
        description: 'desc import',
        created_at: '2026-01-01T00:00:00',
        updated_at: '2026-01-01T00:00:00',
        current_session_id: null,
        current_location_id: null,
        settings_json: { theme: 'dark' },
        invite_code: null,
      },
      sessions: [{ id: 'sess-old', number: 1, date: '2026-01-01', title: 'Sesión import', raw_notes: '', summary: '', status: 'DRAFT' }],
      characters: [{ id: 'char-old', name: 'Ardan', type: 'player', description: '', class: 'guerrero', race: 'humano', status: 'alive', vigor: '10', intelligence: '10', dexterity: '10', cunning: '10', max_pv: 12, max_pm: 6, defense: 8 }],
      npcs: [{ id: 'npc-old', name: 'Varek', description: '', status: 'alive', max_pv: 10, max_pm: 4, defense: 5 }],
      locations: [{ id: 'loc-old', name: 'Prisión', type: 'dungeon', description: '', status: 'ACTIVE' }],
      events: [{ id: 'evt-old', session_id: 'sess-old', type: 'ACTION', actor_id: 'char-old', target_id: 'npc-old', location_id: 'loc-old', description: 'Ardan encontró a Varek', confidence: 1.0, status: 'APPROVED' }],
      relationships: [{ id: 'rel-old', source_entity_id: 'char-old', target_entity_id: 'loc-old', type: 'LOCATED_IN', strength: 1.0, status: 'active', source_event_id: 'evt-old' }],
    };

    const importRes = await request.post('http://localhost:8000/api/campaigns/import', {
      headers: authHeaders,
      data: payload,
    });
    expect(importRes.status()).toBe(200);
    const imported = await importRes.json();
    expect(imported.name).toBe(name);
    expect(imported.description).toBe('desc import');
    expect(imported.settings_json?.theme).toBe('dark');

    const exportRes = await request.get(`http://localhost:8000/api/campaigns/${imported.id}/export`, {
      headers: authHeaders,
    });
    expect(exportRes.status()).toBe(200);
    const exp = await exportRes.json();

    expect(exp.sessions).toHaveLength(1);
    expect(exp.characters).toHaveLength(1);
    expect(exp.npcs).toHaveLength(1);
    expect(exp.locations).toHaveLength(1);
    expect(exp.events).toHaveLength(1);
    expect(exp.relationships).toHaveLength(1);

    const [sess] = exp.sessions;
    const [ch] = exp.characters;
    const [npc] = exp.npcs;
    const [loc] = exp.locations;
    const [evt] = exp.events;
    const [rel] = exp.relationships;

    expect(sess.campaign_id).toBe(imported.id);
    expect(ch.class_).toBe('guerrero');
    expect(evt.session_id).toBe(sess.id);
    expect(evt.actor_id).toBe(ch.id);
    expect(evt.target_id).toBe(npc.id);
    expect(evt.location_id).toBe(loc.id);
    expect(rel.source_entity_id).toBe(ch.id);
    expect(rel.target_entity_id).toBe(loc.id);
    expect(rel.source_event_id).toBe(evt.id);

    await request.delete(`http://localhost:8000/api/campaigns/${imported.id}`, {
      headers: authHeaders,
    });
  });

  test('C10: import roundtrip incluye escenas, mapas y notebook con remap', async ({ request, authHeaders }) => {
    const name = `Importado VTT ${Date.now()}`;
    const payload = {
      campaign: {
        id: 'camp-old',
        name,
        description: '',
        created_at: '2026-01-01T00:00:00',
        updated_at: '2026-01-01T00:00:00',
        current_session_id: null,
        current_location_id: null,
        settings_json: {},
        invite_code: null,
      },
      sessions: [],
      characters: [{ id: 'char-old', name: 'Ardan', type: 'player', description: '', class: 'guerrero', race: '', status: 'alive', vigor: '10', intelligence: '10', dexterity: '10', cunning: '10', max_pv: 12, max_pm: 6, defense: 8 }],
      npcs: [],
      locations: [],
      events: [],
      relationships: [],
      maps: [{ id: 'map-old', name: 'Mapa del bosque', description: '', file_path: 'data/assets/maps/bosque.png', thumbnail_path: null, map_type: 'dungeon' }],
      scenes: [{ id: 'scene-old', name: 'Bosque', description: '', background_path: 'data/assets/bg/bosque.png', map_id: 'map-old', lighting: 'neutral', audio_path: null, status: 'active', notes: 'nota escena', entrance_x: 1.5, entrance_z: -2.0, map_scale: 1.0, model_y_offset: 0.0, grid_size: 0.5, grid_snap: 0, items_json: '[{"id":"item-1","type":"wall","x":1}]' }],
      scene_characters: [{ id: 'sc-old', scene_id: 'scene-old', entity_type: 'character', entity_id: 'char-old', x: 3.0, y: 0.0, z: 3.0, visible: 1, order: 0, rotation: 0.0, token_scale: 1.0, move_speed: 1.0, brightness: 0.0, vx: 0.0, vz: 0.0, vrot: 0.0, last_move_at: 0.0, facing_offset: 0.0, vision_type: 'normal', vision_range: 6.0, statuses_json: '[]' }],
      map_markers: [{ id: 'mk-old', map_id: 'map-old', label: 'Entrada', marker_type: 'transition', target_scene_id: 'scene-old', x: 0.5, y: 0.5, color: '#60a5fa', description: '' }],
      notebooks: [{ id: 'nb-old', title: 'Plan sesión', content: 'matar dragón', category: 'notes', pinned: 1 }],
      notebook_versions: [{ id: 'nv-old', notebook_id: 'nb-old', title: 'Plan sesión', content: 'matar dragón', version_number: 1 }],
    };

    const importRes = await request.post('http://localhost:8000/api/campaigns/import', {
      headers: authHeaders,
      data: payload,
    });
    expect(importRes.status()).toBe(200);
    const imported = await importRes.json();

    const exportRes = await request.get(`http://localhost:8000/api/campaigns/${imported.id}/export`, {
      headers: authHeaders,
    });
    expect(exportRes.status()).toBe(200);
    const exp = await exportRes.json();

    expect(exp.maps).toHaveLength(1);
    expect(exp.scenes).toHaveLength(1);
    expect(exp.scene_characters).toHaveLength(1);
    expect(exp.map_markers).toHaveLength(1);
    expect(exp.notebooks).toHaveLength(1);
    expect(exp.notebook_versions).toHaveLength(1);

    const [map] = exp.maps;
    const [scene] = exp.scenes;
    const [sc] = exp.scene_characters;
    const [mk] = exp.map_markers;
    const [nb] = exp.notebooks;
    const [nv] = exp.notebook_versions;

    expect(scene.map_id).toBe(map.id);
    expect(sc.scene_id).toBe(scene.id);
    expect(sc.entity_id).toBe(exp.characters[0].id);
    expect(sc.entity_id).not.toBe('char-old');
    expect(mk.map_id).toBe(map.id);
    expect(mk.target_scene_id).toBe(scene.id);
    expect(nv.notebook_id).toBe(nb.id);
    expect(scene.items_json).toContain('item-1');

    await request.delete(`http://localhost:8000/api/campaigns/${imported.id}`, {
      headers: authHeaders,
    });
  });

  test('C11: assets binarios viajan en export e import', async ({ request, authHeaders }) => {
    const res = await request.post('http://localhost:8000/api/campaigns', {
      headers: authHeaders,
      data: { name: `Assets ${Date.now()}` },
    });
    expect(res.status()).toBe(200);
    const camp = await res.json();

    const charRes = await request.post(`http://localhost:8000/api/campaigns/${camp.id}/characters`, {
      headers: authHeaders,
      data: { name: 'Ardan imgs', type: 'player', vigor: '/', intelligence: '/', dexterity: '/', cunning: '/' },
    });
    expect(charRes.status()).toBe(200);
    const char = await charRes.json();

    const uploadRes = await request.post(
      `http://localhost:8000/api/campaigns/${camp.id}/characters/${char.id}/portrait`,
      {
        headers: authHeaders,
        multipart: { file: { name: 'portrait.png', mimeType: 'image/png', buffer: PNG_1PX } },
      },
    );
    expect(uploadRes.status()).toBe(200);

    const expRes = await request.get(`http://localhost:8000/api/campaigns/${camp.id}/export`, {
      headers: authHeaders,
    });
    expect(expRes.status()).toBe(200);
    const exp = await expRes.json();

    const asset = (exp.assets as Array<{ path: string; data_base64: string }>).find((a) =>
      a.path.includes('/characters/'),
    );
    expect(asset).toBeTruthy();
    expect(asset!.data_base64.length).toBeGreaterThan(0);
    expect(exp.characters[0].portrait_path).toBeTruthy();

    const impRes = await request.post('http://localhost:8000/api/campaigns/import', {
      headers: authHeaders,
      data: exp,
    });
    expect(impRes.status()).toBe(200);
    const imported = await impRes.json();

    const impExpRes = await request.get(`http://localhost:8000/api/campaigns/${imported.id}/export`, {
      headers: authHeaders,
    });
    expect(impExpRes.status()).toBe(200);
    const impExp = await impExpRes.json();

    const asset2 = (impExp.assets as Array<{ path: string; data_base64: string }>).find((a) =>
      a.path.includes('/characters/'),
    );
    expect(asset2).toBeTruthy();
    expect(asset2!.data_base64).toBe(asset!.data_base64);

    const dstPath = impExp.characters[0].portrait_path;
    expect(dstPath).not.toBe(exp.characters[0].portrait_path);
    expect(dstPath).toMatch(/data[\\/]assets/);

    await request.delete(`http://localhost:8000/api/campaigns/${imported.id}`, {
      headers: authHeaders,
    });
    await request.delete(`http://localhost:8000/api/campaigns/${camp.id}`, {
      headers: authHeaders,
    });
  });

  test('C12: recurso arrastrado al mapa crea item imagen', async ({ page, request, authHeaders }) => {
    const res = await request.post('http://localhost:8000/api/campaigns', {
      headers: authHeaders,
      data: { name: `Drag Asset ${Date.now()}` },
    });
    expect(res.status()).toBe(200);
    const camp = await res.json();

    const scene = await createScene(request, camp.id, 'Escena Assets');

    const bgRes = await request.post(
      `http://localhost:8000/api/campaigns/${camp.id}/scenes/${scene.id}/upload-background`,
      {
        headers: authHeaders,
        multipart: { file: { name: 'fondo.png', mimeType: 'image/png', buffer: PNG_1PX } },
      },
    );
    expect(bgRes.status()).toBe(200);

    const uploadRes = await request.post(`http://localhost:8000/api/campaigns/${camp.id}/assets/upload`, {
      headers: authHeaders,
      multipart: {
        file: { name: 'arbol.png', mimeType: 'image/png', buffer: PNG_1PX },
        name: 'Árbol',
      },
    });
    expect(uploadRes.status()).toBe(200);
    const asset = await uploadRes.json();

    await page.goto(`/campaigns/${camp.id}`);
    await expect(page.getByText('Recursos (1)')).toBeVisible({ timeout: 10_000 });
    await page.waitForSelector('canvas', { timeout: 15_000 });

    const relUrl = `/api/static/${asset.file_path.replace(/\\/g, '/').split('/assets/')[1]}`;
    let dropped = false;
    for (let attempt = 0; attempt < 10 && !dropped; attempt++) {
      dropped = await page.evaluate(
      (payload) => {
        const dt = new DataTransfer();
        dt.setData('roleito/asset', JSON.stringify(payload));
        let accepted = false;
        for (const cv of Array.from(document.querySelectorAll('canvas'))) {
          const rect = cv.getBoundingClientRect();
          const clientX = rect.left + rect.width / 2;
          const clientY = rect.top + rect.height / 2;
          const over = new DragEvent('dragover', { bubbles: true, cancelable: true, clientX, clientY, dataTransfer: dt });
          if (!cv.dispatchEvent(over)) {
            cv.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, clientX, clientY, dataTransfer: dt }));
            accepted = true;
            break;
          }
          cv.dispatchEvent(new DragEvent('dragleave', { bubbles: true, cancelable: true }));
        }
        return accepted;
      },
      { name: 'Árbol', url: relUrl, assetId: asset.id },
    );
      if (!dropped) await page.waitForTimeout(300);
    }
    expect(dropped).toBe(true);

    await page.waitForTimeout(900);
    const itemsRes = await request.get(`http://localhost:8000/api/campaigns/${camp.id}/scenes/${scene.id}/items`, {
      headers: authHeaders,
    });
    expect(itemsRes.status()).toBe(200);
    const { items } = await itemsRes.json();
    const placed = (items as Array<{ metadata: { type: string; assetId: string }; image: string; name: string }>).find(
      (i) => i.metadata?.type === 'image',
    );
    expect(placed).toBeTruthy();
    expect(placed!.metadata.assetId).toBe(asset.id);
    expect(placed!.image).toContain(relUrl);
    expect(placed!.name).toBe('Árbol');

    await request.delete(`http://localhost:8000/api/campaigns/${camp.id}`, {
      headers: authHeaders,
    });
  });
});
