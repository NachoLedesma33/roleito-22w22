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

    await weatherSelect.hover();
    await page.getByRole('button', { name: '🌧 Lluvia' }).click();

    await expect(weatherSelect).toContainText('Lluvia', { timeout: 10_000 });
    await expect
      .poll(async () => {
        const s = (await (await request.get(`${API}/campaigns/${campaign.id}/scenes/${scene.id}`)).json()) as {
          weather: string | null;
        };
        return s.weather;
      }, { timeout: 10_000 })
      .toBe('rain');

    // Limpiar: vuelve a Sin clima
    await weatherSelect.hover();
    await page.getByRole('button', { name: '🌤 Sin clima' }).click();
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

    await weatherSelect.hover();
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
});

const WEATHER_NONE = 'Sin clima';