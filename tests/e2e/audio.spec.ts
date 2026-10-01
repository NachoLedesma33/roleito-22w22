import { expect, test } from '../fixtures/campaign-fixture';
import { createScene, generateInviteCode } from '../helpers/api-helpers';

const API = 'http://localhost:8000/api';

function wavBytes(): Buffer {
  const b = Buffer.alloc(44);
  b.write('RIFF', 0);
  b.writeUInt32LE(36, 4);
  b.write('WAVE', 8);
  b.write('fmt ', 12);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(8000, 24);
  b.writeUInt32LE(16000, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36);
  b.writeUInt32LE(0, 40);
  return b;
}

async function uploadSceneAudio(
  request: import('@playwright/test').APIRequestContext,
  campaignId: string,
  sceneId: string,
) {
  const res = await request.post(`${API}/campaigns/${campaignId}/scenes/${sceneId}/upload-audio`, {
    multipart: { file: { name: 'ambience.wav', mimeType: 'audio/wav', buffer: wavBytes() } },
  });
  if (!res.ok()) throw new Error(`upload-audio failed: ${res.status()}`);
  return (await res.json()) as { id: string; audio_path: string | null };
}

test.describe('Scene Audio', () => {
  test('A1: DM sube audio de escena — player en UI y archivo servido', async ({
    page,
    campaign,
    request,
  }) => {
    const scene = await createScene(request, campaign.id, 'Cripta A1');

    const updated = await uploadSceneAudio(request, campaign.id, scene.id);
    expect(updated.audio_path).toBeTruthy();

    const rel = updated.audio_path!.replace(/\\/g, '/').split('/assets/')[1];
    const staticRes = await request.get(`${API}/static/${rel}`);
    expect(staticRes.ok()).toBeTruthy();

    await page.goto(`/campaigns/${campaign.id}/scenes/${scene.id}`);
    const audioEl = page.getByTestId('scene-audio');
    await expect(audioEl).toBeVisible();
    await expect(audioEl).toHaveAttribute('src', /\/api\/static\//);

    const delRes = await request.delete(`${API}/campaigns/${campaign.id}/scenes/${scene.id}/audio`);
    expect(delRes.ok()).toBeTruthy();
    expect((await delRes.json()).audio_path).toBeNull();
  });

  test('A2: PlayerView carga el audio de la escena', async ({ page, campaign, request }) => {
    const scene = await createScene(request, campaign.id, 'Taberna A2');
    await uploadSceneAudio(request, campaign.id, scene.id);
    const code = await generateInviteCode(request, campaign.id);

    await page.goto(`/campaigns/join/${code}`);
    await expect(page.locator('header')).toContainText(campaign.name, { timeout: 10_000 });

    await expect
      .poll(
        () => page.evaluate(() => document.querySelector('audio')?.getAttribute('src') ?? null),
        { timeout: 10_000 },
      )
      .toMatch(/\/api\/static\//);
  });
});