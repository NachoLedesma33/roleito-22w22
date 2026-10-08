import type { APIRequestContext } from '@playwright/test';
import { expect, test } from '../fixtures/campaign-fixture';
import {
  PNG_1PX,
  createCharacter,
  createScene,
  generateInviteCode,
  seedTokens,
  updateScene,
} from '../helpers/api-helpers';

interface Handout {
  id: string;
  title: string;
  content: string;
  image_path: string | null;
  visible_to_players: boolean;
}

async function listHandouts(
  request: APIRequestContext,
  campaignId: string,
): Promise<Handout[]> {
  const res = await request.get(`/api/campaigns/${campaignId}/handouts`);
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as Handout[];
}

test.describe('Handouts', () => {
  test.beforeEach(async ({ request, campaign }) => {
    const scene = await createScene(request, campaign.id, 'Escena Handout');
    const aria = await createCharacter(request, campaign.id, { name: 'Aria' });
    await seedTokens(request, campaign.id, scene.id, [
      { entityType: 'character', entityId: aria.id, x: 0, z: 0 },
    ]);
    await updateScene(request, campaign.id, scene.id, { status: 'active' });
  });

  test('H1: DM crea un handout por UI y persiste via API', async ({ page, campaign, request }) => {
    await page.goto(`/campaigns/${campaign.id}`);
    await expect(page.getByText('On Scene (1)')).toBeVisible({ timeout: 10_000 });
    await page.getByTitle('Acciones del DM').hover();
    await page.getByTestId('handouts-toggle').click();
    await page.getByRole('button', { name: '＋ Nuevo documento' }).click();
    await page.getByPlaceholder('Título del documento').fill('Carta de Grimble');
    await page
      .getByPlaceholder('Texto (pista, nota, carta...)')
      .fill('La puerta de la bóveda abre con una canción.');
    await page.getByRole('button', { name: 'Guardar' }).click();

    await expect(page.getByText('Carta de Grimble')).toBeVisible();
    await expect(page.getByText('La puerta de la bóveda abre con una canción.')).toBeVisible();

    const handouts = await listHandouts(request, campaign.id);
    expect(handouts).toHaveLength(1);
    expect(handouts[0].title).toBe('Carta de Grimble');
    expect(handouts[0].content).toContain('bóveda');
    expect(handouts[0].visible_to_players).toBe(true);
  });

  test('H2: imagen del handout sube, se sirve y se puede quitar', async ({
    page,
    campaign,
    request,
  }) => {
    await page.goto(`/campaigns/${campaign.id}`);
    await expect(page.getByText('On Scene (1)')).toBeVisible({ timeout: 10_000 });
    await page.getByTitle('Acciones del DM').hover();
    await page.getByTestId('handouts-toggle').click();
    await page.getByRole('button', { name: '＋ Nuevo documento' }).click();
    await page.getByPlaceholder('Título del documento').fill('Mapa del bosque');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Mapa del bosque')).toBeVisible();

    await page.getByTestId('handout-image-input').setInputFiles({
      name: 'mapa.png',
      mimeType: 'image/png',
      buffer: PNG_1PX,
    });

    const img = page.getByTestId('handout-image');
    await expect(img).toBeVisible();
    await expect(img).toHaveAttribute('src', /\/api\/static\//);

    const withImage = await listHandouts(request, campaign.id);
    expect(withImage[0].image_path).toContain('handouts');
    expect(withImage[0].image_path).toMatch(/\.png$/);

    await page.getByRole('button', { name: 'Quitar imagen' }).click();
    await expect(page.getByTestId('handout-image')).toHaveCount(0);
    const cleared = await listHandouts(request, campaign.id);
    expect(cleared[0].image_path).toBeNull();
  });

  test('H3: visibilidad a jugadores y borrado', async ({ page, campaign, request }) => {
    await page.goto(`/campaigns/${campaign.id}`);
    await expect(page.getByText('On Scene (1)')).toBeVisible({ timeout: 10_000 });
    await page.getByTitle('Acciones del DM').hover();
    await page.getByTestId('handouts-toggle').click();
    await page.getByRole('button', { name: '＋ Nuevo documento' }).click();
    await page.getByPlaceholder('Título del documento').fill('Pista oculta');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Pista oculta')).toBeVisible();

    await page.getByTitle('Visible para jugadores').click();
    await expect
      .poll(async () => (await listHandouts(request, campaign.id))[0].visible_to_players)
      .toBe(false);

    await page.getByTitle('Eliminar').click();
    await expect.poll(async () => (await listHandouts(request, campaign.id)).length).toBe(0);
    await expect(page.getByText('Todavía no hay documentos.')).toBeVisible();
  });

  test('H4: el jugador lee los handouts visibles con imagen', async ({
    campaign,
    request,
    browser,
    authHeaders,
  }) => {
    const create = await request.post(`/api/campaigns/${campaign.id}/handouts`, {
      headers: authHeaders,
      data: {
        title: 'Carta de Grimble',
        content: 'La puerta de la bóveda abre con una canción.',
        image_path: null,
        visible_to_players: true,
      },
    });
    expect(create.ok()).toBeTruthy();
    const handout = (await create.json()) as Handout;

    await request.post(`/api/campaigns/${campaign.id}/handouts/${handout.id}/image`, {
      headers: authHeaders,
      multipart: {
        file: { name: 'mapa.png', mimeType: 'image/png', buffer: PNG_1PX },
      },
    });

    await request.post(`/api/campaigns/${campaign.id}/handouts`, {
      headers: authHeaders,
      data: {
        title: 'Borrador del DM',
        content: 'No deberia verse.',
        image_path: null,
        visible_to_players: false,
      },
    });

    const code = await generateInviteCode(request, campaign.id);
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.goto(`/campaigns/join/${code}`);
    await p.getByRole('button', { name: /Aria/ }).click();
    await expect(p.getByTestId('player-role')).toContainText('Aria', { timeout: 10_000 });

    await p.getByTestId('player-handouts-toggle').click();
    await expect(p.getByText('Carta de Grimble')).toBeVisible();
    await expect(p.getByText('Borrador del DM')).toHaveCount(0);

    // El contenido y la imagen aparecen al expandir el documento.
    await expect(p.getByTestId('player-handout-image')).toHaveCount(0);
    await p.getByText('Carta de Grimble').click();
    await expect(p.getByText(/La puerta de la bóveda/)).toBeVisible();
    const img = p.getByTestId('player-handout-image');
    await expect(img).toBeVisible();
    await expect(img).toHaveAttribute('src', /\/api\/static\//);

    await ctx.close();
  });

  test('H5: sync — handout creado por el DM aparece sin recargar', async ({
    campaign,
    request,
    browser,
    authHeaders,
  }) => {
    const code = await generateInviteCode(request, campaign.id);
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.goto(`/campaigns/join/${code}`);
    await p.getByRole('button', { name: /Aria/ }).click();
    await expect(p.getByTestId('player-role')).toContainText('Aria', { timeout: 10_000 });

    await p.getByTestId('player-handouts-toggle').click();
    await expect(p.getByText('Todavía no hay documentos.')).toBeVisible();

    const create = await request.post(`/api/campaigns/${campaign.id}/handouts`, {
      headers: authHeaders,
      data: {
        title: 'Recado urgente',
        content: 'Corre al norte.',
        image_path: null,
        visible_to_players: true,
      },
    });
    expect(create.ok()).toBeTruthy();

    await expect(p.getByText('Recado urgente')).toBeVisible({ timeout: 10_000 });

    await ctx.close();
  });
});