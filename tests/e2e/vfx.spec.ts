import { expect, test } from '../fixtures/campaign-fixture';
import { createCharacter, createMapWithFile, createScene, generateInviteCode, PNG_1PX, seedTokens, updateScene } from '../helpers/api-helpers';

test.describe('VFX', () => {
  test('VFX1: menú dispara ataque y hace POST /vfx con from/to', async ({
    page,
    campaign,
    request,
  }) => {
    const scene = await createScene(request, campaign.id, 'Escena VFX1');
    const attacker = await createCharacter(request, campaign.id, { name: 'Atacante VFX' });
    const target = await createCharacter(request, campaign.id, { name: 'Objetivo VFX' });
    await seedTokens(request, campaign.id, scene.id, [
      { entityType: 'character', entityId: attacker.id, x: -1, z: 0 },
      { entityType: 'character', entityId: target.id, x: 2, z: 0 },
    ]);

    const renderErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') renderErrors.push(msg.text());
    });
    page.on('pageerror', (err) => renderErrors.push(err.message));

    await page.goto(`/campaigns/${campaign.id}`);
    await expect(page.getByLabel('Escena activa')).toContainText('Escena VFX1', { timeout: 10_000 });
    await page.getByLabel('Escena activa').selectOption(scene.id);

    await page.getByTestId('fichas-toggle').click();
    const tray = page.getByTestId('hud-dm-token-tray-dock');
    await expect(tray).toBeVisible();
    await expect(tray.getByText('En escena (2)')).toBeVisible();

    // Seleccionar atacante (primer clic, sin VFX pendiente -> selección normal).
    await tray.getByRole('button', { name: 'Atacante VFX' }).click();
    // El clic en fichas abre la ficha del personaje; cerrarla para que no intercepte clics.
    await page.getByTestId(`hud-char-${attacker.id}`).getByRole('button', { name: 'Cerrar' }).click();

    const vfxPost = page.waitForRequest(
      (r) =>
        r.url().includes(`/api/campaigns/${campaign.id}/vfx`) && r.method() === 'POST',
      { timeout: 15_000 },
    );

    await page.locator('[data-anchor="vfx"] button').click();
    await expect(page.getByTestId('vfx-menu')).toBeVisible();
    await page.getByRole('button', { name: 'Fuego' }).click();

    // Clic en objetivo -> handleTokenClick dispara el efecto y el broadcast.
    await tray.getByRole('button', { name: 'Objetivo VFX' }).click();

    const req = await vfxPost;
    const body = req.postDataJSON() as { type: string; from_x: number; from_z: number; to_x: number; to_z: number };
    expect(body.type).toBe('fire');
    expect(body.from_x).toBe(-1);
    expect(body.from_z).toBe(0);
    expect(body.to_x).toBe(2);
    expect(body.to_z).toBe(0);

    await page.getByTestId(`hud-char-${target.id}`).getByRole('button', { name: 'Cerrar' }).click();
    await page.locator('[data-anchor="vfx"] button').click();
    await page.getByRole('button', { name: 'Rayo', exact: true }).click();
    await tray.getByRole('button', { name: 'Objetivo VFX' }).click();
    await page.waitForTimeout(600);

    await page.getByTestId(`hud-char-${target.id}`).getByRole('button', { name: 'Cerrar' }).click();
    await page.locator('[data-anchor="vfx"] button').click();
    const menu = page.getByTestId('vfx-menu');
    await expect(menu.getByRole('button')).toHaveCount(36);
    const meleePost = page.waitForRequest(
      (r) =>
        r.url().includes(`/api/campaigns/${campaign.id}/vfx`) && r.method() === 'POST',
      { timeout: 15_000 },
    );
    await menu.getByRole('button', { name: 'Cuchillazo' }).click();
    await tray.getByRole('button', { name: 'Objetivo VFX' }).click();
    const meleeReq = await meleePost;
    expect((meleeReq.postDataJSON() as { type: string }).type).toBe('slash');

    await page.waitForTimeout(600);
    expect(renderErrors.filter((msg) => /WebGL|shader|ERROR: 0:/i.test(msg))).toEqual([]);
  });

  test('VFX2: jugador dispara habilidad desde su POV', async ({
    campaign,
    request,
    browser,
  }) => {
    const scene = await createScene(request, campaign.id, 'Escena VFX2');
    const attacker = await createCharacter(request, campaign.id, { name: 'Jugador VFX' });
    const target = await createCharacter(request, campaign.id, { name: 'Objetivo VFX POV' });
    await seedTokens(request, campaign.id, scene.id, [
      { entityType: 'character', entityId: attacker.id, x: 0, z: 0 },
      { entityType: 'character', entityId: target.id, x: 2, z: 0 },
    ]);
    const map = await createMapWithFile(request, campaign.id, 'Mapa VFX2');
    await updateScene(request, campaign.id, scene.id, { map_id: map.id, status: 'active' });
    await request.post(
      `http://localhost:8000/api/campaigns/${campaign.id}/scenes/${scene.id}/upload-background`,
      { multipart: { file: { name: 'background.png', mimeType: 'image/png', buffer: PNG_1PX } } },
    );
    await request.post(`http://localhost:8000/api/campaigns/${campaign.id}/scenes/${scene.id}/sync`);
    const code = await generateInviteCode(request, campaign.id);
    await request.put(
      `http://localhost:8000/api/campaigns/${campaign.id}/characters/${attacker.id}`,
      { data: { name: attacker.name, can_use_vfx: true } },
    );

    const pctx = await browser.newContext();
    const player = await pctx.newPage();
    await player.goto(`/campaigns/join/${code}`);
    await player.getByRole('button', { name: /Jugador VFX/ }).click();
    await expect(player.getByTestId('pv-vfx-toggle')).toBeVisible({ timeout: 10_000 });

    await player.getByTestId('pv-vfx-toggle').click();
    const menu = player.getByTestId('pv-vfx-menu');
    await expect(menu).toBeVisible();
    await menu.getByRole('button', { name: 'Fuego' }).click();

    let posted = false;
    const vfxPost = player.waitForRequest(
      (r) => r.url().includes(`/api/campaigns/invite/${code}/vfx`) && r.method() === 'POST',
      { timeout: 15_000 },
    ).then((r) => { posted = true; return r; });

    const box = await player.locator('canvas').first().boundingBox();
    expect(box).not.toBeNull();
    for (const fx of [0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8]) {
      if (posted) break;
      for (const fy of [0.4, 0.5, 0.6, 0.7]) {
        if (posted) break;
        await player.mouse.click(box!.x + box!.width * fx, box!.y + box!.height * fy);
      }
    }

    const req = await vfxPost;
    const body = req.postDataJSON() as { type: string; from_x: number; from_z: number; to_x: number; to_z: number };
    expect(body.type).toBe('fire');
    expect(body.from_x).toBe(0);
    expect(body.from_z).toBe(0);
    expect(body.to_x).toBe(2);
    expect(body.to_z).toBe(0);
    await pctx.close();
  });

  test('VFX3: nuevas habilidades renderizan sin errores de shader', async ({
    page,
    campaign,
    request,
  }) => {
    const scene = await createScene(request, campaign.id, 'Escena VFX3');
    const attacker = await createCharacter(request, campaign.id, { name: 'Atacante VFX3' });
    const target = await createCharacter(request, campaign.id, { name: 'Objetivo VFX3' });
    await seedTokens(request, campaign.id, scene.id, [
      { entityType: 'character', entityId: attacker.id, x: -1, z: 0 },
      { entityType: 'character', entityId: target.id, x: 2, z: 0 },
    ]);

    const renderErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') renderErrors.push(msg.text());
    });
    page.on('pageerror', (err) => renderErrors.push(err.message));

    await page.goto(`/campaigns/${campaign.id}`);
    await page.getByLabel('Escena activa').selectOption(scene.id);
    await page.getByTestId('fichas-toggle').click();
    const tray = page.getByTestId('hud-dm-token-tray-dock');
    await expect(tray).toBeVisible();
    await tray.getByRole('button', { name: 'Atacante VFX3' }).click();
    await page.getByTestId(`hud-char-${attacker.id}`).getByRole('button', { name: 'Cerrar' }).click();

    const posted: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes(`/api/campaigns/${campaign.id}/vfx`) && r.method() === 'POST') {
        posted.push((r.postDataJSON() as { type: string }).type);
      }
    });

    for (const label of ['Rayo en cadena', 'Drenaje de vida', 'Maldición', 'Terremoto']) {
      await page.locator('[data-anchor="vfx"] button').click();
      await page.getByRole('button', { name: label, exact: true }).click();
      await tray.getByRole('button', { name: 'Objetivo VFX3' }).click();
      await page.getByTestId(`hud-char-${target.id}`).getByRole('button', { name: 'Cerrar' }).click();
      await page.waitForTimeout(250);
    }

    expect(posted).toEqual(['chainlightning', 'lifedrain', 'hex', 'earthquake']);
    expect(renderErrors.filter((msg) => /WebGL|shader|ERROR: 0:/i.test(msg))).toEqual([]);
  });
});
