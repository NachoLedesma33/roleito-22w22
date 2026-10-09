import { test, expect } from '../fixtures/campaign-fixture';
import AxeBuilder from '@axe-core/playwright';
import { generateInviteCode } from '../helpers/api-helpers';

async function expectNoViolations(page: import('@playwright/test').Page, label: string) {
  const results = await new AxeBuilder({ page }).analyze();
  const violations = results.violations.map(
    (v) => `${v.id} (${v.impact}) → ${v.nodes.map((n) => `${n.target.join(' ')} :: ${n.html} :: ${n.failureSummary?.replace(/\s+/g, ' ')}`).join(' | ')}`,
  );
  if (violations.length) console.log(`[axe ${label}]`, JSON.stringify(violations, null, 2));
  expect(violations, `${label}: ${violations.length} violaciones`).toEqual([]);
}

test('A1: landing + login sin violaciones axe', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.clear());
  await page.goto('/');
  await expect(
    page.getByRole('heading', { level: 1, name: 'El mundo que tus sesiones recuerdan' }),
  ).toBeVisible();
  await expectNoViolations(page, 'landing');

  await page.getByRole('link', { name: 'Ingresar' }).click();
  await expect(page.getByTestId('login-submit')).toBeVisible();
  await expectNoViolations(page, 'login');
});

test('A2: lobby sin violaciones axe', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expectNoViolations(page, 'lobby');
});

test('A3: detalle de campaña sin violaciones axe', async ({ page, campaign }) => {
  await page.goto(`/campaigns/${campaign.id}/manage`);
  await expect(page.getByRole('heading', { name: campaign.name })).toBeVisible();
  await expectNoViolations(page, 'campaign-detail');
});

test('A4: shell DM sin violaciones axe', async ({ page, campaign }) => {
  await page.goto(`/campaigns/${campaign.id}`);
  await expect(page.getByText(campaign.name).first()).toBeVisible();
  await expect(page.locator('select').first()).toBeVisible();
  await expectNoViolations(page, 'dm-shell');
});

test('A5: lista de jugadores sin violaciones axe', async ({ page, campaign }) => {
  await page.goto(`/campaigns/${campaign.id}/players`);
  await expect(page.getByRole('heading', { name: 'Jugadores' })).toBeVisible();
  await expectNoViolations(page, 'players');
});

test('A6: vista jugador sin violaciones axe', async ({ page, request, campaign }) => {
  const code = await generateInviteCode(request, campaign.id);
  await page.goto(`/campaigns/join/${code}`);
  await expect(page.getByTestId('player-role')).toBeVisible();
  await expectNoViolations(page, 'player-view');
});