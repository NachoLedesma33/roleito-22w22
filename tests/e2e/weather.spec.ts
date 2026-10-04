import { expect, test } from '../fixtures/campaign-fixture';
import { createScene, generateInviteCode, PNG_1PX } from '../helpers/api-helpers';

const API = 'http://localhost:8000/api';

test.describe('Weather / Atmosphere', () => {
  test('W1: DM cambia clima desde el dashboard — persiste y se limpia', async ({
    page,
    campaign,
    request,
  }) => {
    const scene = await createScene(request, campaign.id, 'Pradera W1');

    await page.goto(`/campaigns/${campaign.id}`);
    await expect(page.locator('header select')).toContainText('Pradera W1', { timeout: 10_000 });
    await page.locator('header select').selectOption(scene.id);

    const weatherSelect = page.getByTestId('weather-select');
    await expect(weatherSelect).toContainText(WEATHER_NONE, { timeout: 10_000 });

    await weatherSelect.click();
    await expect(page.getByTestId('weather-menu')).toBeVisible();
    await page.getByRole('menuitem', { name: '🌧 Lluvia' }).click();

    // El menú sigue abierto al elegir (adentro está el slider de intensidad).
    await expect(page.getByTestId('weather-menu')).toBeVisible();
    await expect(weatherSelect).toContainText('Lluvia', { timeout: 10_000 });
    await expect
      .poll(async () => {
        const s = (await (await request.get(`${API}/campaigns/${campaign.id}/scenes/${scene.id}`)).json()) as {
          weather: string | null;
        };
        return s.weather;
      }, { timeout: 10_000 })
      .toBe('rain');

    // Limpiar: vuelve a Sin clima (el menú sigue abierto, no hay que reabrirlo)
    await page.getByRole('menuitem', { name: '🌤 Sin clima' }).click();
    await expect(weatherSelect).toContainText(WEATHER_NONE, { timeout: 10_000 });
  });

  test('W2: el clima llega al snapshot del jugador y renderiza el overlay', async ({
    page,
    campaign,
    request,
  }) => {
    const scene = await createScene(request, campaign.id, 'Llanura W2');
    await request.post(`${API}/campaigns/${campaign.id}/scenes/${scene.id}/upload-background`, {
      multipart: { file: { name: 'bg.png', mimeType: 'image/png', buffer: PNG_1PX } },
    });
    await request.put(`${API}/campaigns/${campaign.id}/scenes/${scene.id}`, {
      data: { weather: 'rain' },
    });
    const code = await generateInviteCode(request, campaign.id);

    const snap = (await (
      await request.get(`${API}/campaigns/invite/${code}`)
    ).json()) as { scene_id: string | null; weather: string | null };
    expect(snap.scene_id).toBe(scene.id);
    expect(snap.weather).toBe('rain');

    await page.goto(`/campaigns/join/${code}`);
    await expect(page.locator('header')).toContainText(campaign.name, { timeout: 10_000 });
    await expect(page.locator('[data-testid="weather-overlay"]')).toHaveAttribute('data-weather', 'rain', {
      timeout: 15_000,
    });
  });

  test('W3: la intensidad del clima se ajusta, persiste y llega al jugador', async ({
    page,
    campaign,
    request,
  }) => {
    const scene = await createScene(request, campaign.id, 'Tormenta W3');
    await request.post(`${API}/campaigns/${campaign.id}/scenes/${scene.id}/upload-background`, {
      multipart: { file: { name: 'bg.png', mimeType: 'image/png', buffer: PNG_1PX } },
    });
    await request.put(`${API}/campaigns/${campaign.id}/scenes/${scene.id}`, {
      data: { weather: 'rain' },
    });
    const code = await generateInviteCode(request, campaign.id);

    await page.goto(`/campaigns/${campaign.id}`);
    await expect(page.locator('header select')).toContainText('Tormenta W3', { timeout: 10_000 });
    await page.locator('header select').selectOption(scene.id);

    const weatherSelect = page.getByTestId('weather-select');
    await expect(weatherSelect).toContainText('Lluvia', { timeout: 10_000 });

    await weatherSelect.click();
    const slider = page.getByTestId('weather-intensity');
    await expect(slider).toBeVisible();
    await slider.fill('2');

    await expect(page.getByTestId('weather-intensity-value')).toHaveText('2.00×', { timeout: 10_000 });
    await expect
      .poll(
        async () => {
          const s = (await (
            await request.get(`${API}/campaigns/${campaign.id}/scenes/${scene.id}`)
          ).json()) as { weather_intensity: number };
          return s.weather_intensity;
        },
        { timeout: 10_000 },
      )
      .toBe(2);

    const snap = (await (await request.get(`${API}/campaigns/invite/${code}`)).json()) as {
      weather_intensity: number;
    };
    expect(snap.weather_intensity).toBe(2);

    await page.goto(`/campaigns/join/${code}`);
    await expect(page.locator('[data-testid="weather-overlay"]')).toHaveAttribute(
      'data-weather-intensity',
      '2',
      { timeout: 15_000 },
    );
  });

  test('W4: los menús abren con click (táctil) y se cierran con Escape', async ({
    page,
    campaign,
    request,
  }) => {
    const scene = await createScene(request, campaign.id, 'Pradera W4');
    await page.goto(`/campaigns/${campaign.id}`);
    await expect(page.locator('header select')).toContainText('Pradera W4', { timeout: 10_000 });
    await page.locator('header select').selectOption(scene.id);

    const weatherMenu = page.getByTestId('weather-menu');
    const lightingMenu = page.getByTestId('lighting-menu');
    const weatherSelect = page.getByTestId('weather-select');

    // Cerrados de entrada: en táctil no hay hover que los abra.
    await expect(weatherMenu).toBeHidden();
    await expect(lightingMenu).toBeHidden();

    // Un click los abre, sin mover el mouse.
    await weatherSelect.click();
    await expect(weatherMenu).toBeVisible();
    await weatherSelect.click();
    await expect(weatherMenu).toBeHidden();

    // Escape cierra.
    await weatherSelect.click();
    await expect(weatherMenu).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(weatherMenu).toBeHidden();

    // El de lighting también, y abre el que corresponde.
    await page.getByTestId('lighting-select').click();
    await expect(lightingMenu).toBeVisible();
    await expect(weatherMenu).toBeHidden();
  });

  test('W5: las variantes de clima se eligen, persisten y el menú las agrupa por tipo', async ({
    page,
    campaign,
    request,
  }) => {
    const scene = await createScene(request, campaign.id, 'Meseta W5');
    await request.post(`${API}/campaigns/${campaign.id}/scenes/${scene.id}/upload-background`, {
      multipart: { file: { name: 'bg.png', mimeType: 'image/png', buffer: PNG_1PX } },
    });
    await page.goto(`/campaigns/${campaign.id}`);
    await expect(page.locator('header select')).toContainText('Meseta W5', { timeout: 10_000 });
    await page.locator('header select').selectOption(scene.id);

    const weatherSelect = page.getByTestId('weather-select');
    await weatherSelect.click();
    const menu = page.getByTestId('weather-menu');
    await expect(menu).toBeVisible();

    // Los tres encabezados de grupo, en orden. Con las 7 variantes en una lista
    // plana no se distingue una tormenta de una llovizna.
    for (const header of ['Lluvia', 'Nieve', 'Niebla']) {
      await expect(menu.getByText(header, { exact: true })).toBeVisible();
    }

    // Tres variantes de tres familias distintas: el id guardado tiene que ser el
    // de la variante, no el de la familia (si no, elegir "Tormenta" persiste
    // "rain" y el DM nunca ve lo que eligió).
    for (const [label, id] of [
      ['⛈ Tormenta', 'rainStorm'],
      ['🌨 Ventisca', 'snowBlizzard'],
      ['🌁 Niebla densa', 'fogDense'],
    ] as const) {
      // El menú NO se reabre entre iteraciones: sigue abierto al elegir
      // (adentro está el slider), y clickear el disparador lo cerraría.
      await menu.getByRole('menuitem', { name: label }).click();
      await expect(weatherSelect).toContainText(label.slice(2), { timeout: 10_000 });
      await expect
        .poll(async () => {
          const s = (await (
            await request.get(`${API}/campaigns/${campaign.id}/scenes/${scene.id}`)
          ).json()) as { weather: string | null };
          return s.weather;
        }, { timeout: 10_000 })
        .toBe(id);
    }

    // Y el id viejo sigue funcionando: hay escenas guardadas con 'rain'.
    await menu.getByRole('menuitem', { name: '🌧 Lluvia' }).click();
    await expect
      .poll(async () => {
        const s = (await (
          await request.get(`${API}/campaigns/${campaign.id}/scenes/${scene.id}`)
        ).json()) as { weather: string | null };
        return s.weather;
      }, { timeout: 10_000 })
      .toBe('rain');
  });
});

const WEATHER_NONE = 'Sin clima';