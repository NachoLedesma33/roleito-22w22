import { test as base, expect, Page } from '@playwright/test';
import { Campaign, withAuth } from '../helpers/api-helpers';

const API = 'http://localhost:8000/api';

let _cachedToken: string | null = null;

async function getDmToken(req: import('@playwright/test').APIRequestContext): Promise<string> {
  if (_cachedToken) return _cachedToken;
  const statusRes = await req.get(`${API}/auth/status`);
  const { pin_set } = await statusRes.json();
  if (!pin_set) {
    const setupRes = await req.post(`${API}/auth/setup`, { data: { pin: '1234' } });
    if (!setupRes.ok()) throw new Error(`auth setup failed: ${setupRes.status()}`);
  }
  const loginRes = await req.post(`${API}/auth/login`, { data: { pin: '1234' } });
  if (!loginRes.ok()) throw new Error(`auth login failed: ${loginRes.status()}`);
  const login = await loginRes.json();
  _cachedToken = login.token;
  return _cachedToken;
}

type Fixtures = {
  campaign: Campaign;
  dmToken: string;
  authHeaders: { Authorization: string };
};

export const test = base.extend<Fixtures>({
  dmToken: async ({ request }, use) => {
    const token = await getDmToken(request);
    await use(token);
  },

  authHeaders: async ({ dmToken }, use) => {
    await use(withAuth(dmToken));
  },

  campaign: async ({ request, dmToken }, use) => {
    const name = `E2E Campaign ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const res = await request.post(`${API}/campaigns`, {
      headers: withAuth(dmToken),
      data: { name, description: 'E2E test campaign' },
    });
    if (!res.ok()) throw new Error(`createCampaign failed: ${res.status()}`);
    const campaign = await res.json();
    await use(campaign);
    await request.delete(`${API}/campaigns/${campaign.id}`, {
      headers: withAuth(dmToken),
    });
  },

  page: async ({ page, dmToken }, use) => {
    await page.addInitScript((token: string) => {
      sessionStorage.setItem('roleito:auth:token', token);
    }, dmToken);
    await use(page);
  },
});

export { expect };
