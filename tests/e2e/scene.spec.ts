import { expect, test } from '../fixtures/campaign-fixture';
import { listScenes, PNG_1PX } from '../helpers/api-helpers';

test.describe('Scene Management', () => {
  test('S1: crea escena desde SceneList', async ({ page, campaign, request }) => {
    await page.goto(`/campaigns/${campaign.id}/scenes`);

    await page.getByRole('button', { name: 'New Scene' }).click();
    await page.getByPlaceholder('Tavern, Forest, Dungeon...').fill('Taverna');
    await page.getByRole('button', { name: 'Create Scene' }).click();

    await expect(page).toHaveURL(
      new RegExp(`/campaigns/${campaign.id}/scenes/[a-z0-9-]+$`),
      { timeout: 10_000 },
    );

    const scenes = await listScenes(request, campaign.id);
    expect(scenes.some((s) => s.name === 'Taverna')).toBe(true);
  });

  test('S2: sube background a escena existente y lo renderiza', async ({ page, campaign, request }) => {
    const created = await request.post(
      `http://localhost:8000/api/campaigns/${campaign.id}/scenes`,
      { data: { name: 'Bosque' } },
    );
    const scene = await created.json();

    await page.goto(`/campaigns/${campaign.id}`);
    await expect(page.locator('header select')).toContainText('Bosque');

    await page.locator('header select').selectOption(scene.id);

    await page.setInputFiles('header input[type="file"]', {
      name: 'bg.png',
      mimeType: 'image/png',
      buffer: PNG_1PX,
    });

    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15_000 });

    const scenes = await listScenes(request, campaign.id);
    const updated = scenes.find((s) => s.id === scene.id);
    expect(updated?.background_path).toBeTruthy();
  });

  test('S3: auto-crea escena al subir BG sin escenas previas', async ({ page, campaign, request }) => {
    await page.goto(`/campaigns/${campaign.id}`);

    await expect(page.getByText('Create a scene to get started.')).toBeVisible();

    await page.setInputFiles('header input[type="file"]', {
      name: 'bg.png',
      mimeType: 'image/png',
      buffer: PNG_1PX,
    });

    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('header select')).toContainText('Scene 1');

    const scenes = await listScenes(request, campaign.id);
    expect(scenes).toHaveLength(1);
    expect(scenes[0].name).toBe('Scene 1');
    expect(scenes[0].background_path).toBeTruthy();
  });
});
