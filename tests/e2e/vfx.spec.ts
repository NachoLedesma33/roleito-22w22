import { expect, test } from '../fixtures/campaign-fixture';
import { createCharacter, createScene, seedTokens } from '../helpers/api-helpers';

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
    await expect(page.locator('header select')).toContainText('Escena VFX1', { timeout: 10_000 });
    await page.locator('header select').selectOption(scene.id);

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
    await page.getByRole('button', { name: 'Rayo' }).click();
    await tray.getByRole('button', { name: 'Objetivo VFX' }).click();
    await page.waitForTimeout(600);

    await page.getByTestId(`hud-char-${target.id}`).getByRole('button', { name: 'Cerrar' }).click();
    await page.locator('[data-anchor="vfx"] button').click();
    const menu = page.getByTestId('vfx-menu');
    await expect(menu.getByRole('button')).toHaveCount(23);
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
});
