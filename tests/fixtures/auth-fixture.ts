import { test as base, expect, APIRequestContext } from '@playwright/test';
import {
  Campaign,
  withAuth,
} from '../helpers/api-helpers';

const API = 'http://localhost:8000/api';

let _cachedToken: string | null = null;

async function getDmTokenCached(req: APIRequestContext): Promise<string> {
  if (_cachedToken) return _cachedToken;
  const name = `E2E DM ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const registerRes = await req.post(`${API}/auth/register`, { data: { name, pin: '1234' } });
  if (!registerRes.ok()) throw new Error(`auth register failed: ${registerRes.status()}`);
  const registered = await registerRes.json();
  _cachedToken = registered.token;
  return _cachedToken;
}

type AuthFixtures = {
  campaign: Campaign;
  dmToken: string;
  authHeaders: { Authorization: string };
};

export const test = base.extend<AuthFixtures>({
  /**
   * El contexto de API habla **como el DM**: la superficie de la campaña
   * (personajes, misiones, escenas, cuaderno, ...) pide rol. Así los specs no
   * tienen que acordarse de mandar el token en cada llamada.
   *
   * Los specs que prueban el "sin token" (401) usan un contexto anónimo
   * aparte: `playwright.request.newContext()`.
   */
  request: async ({ playwright, dmToken }, use) => {
    const ctx = await playwright.request.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${dmToken}` },
    });
    await use(ctx);
    await ctx.dispose();
  },

  dmToken: async ({ playwright }, use) => {
    // No usa el fixture `request` (que ahora depende de `dmToken`): se crea
    // un contexto propio.
    const req = await playwright.request.newContext();
    const token = await getDmTokenCached(req);
    await use(token);
    await req.dispose();
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
});

export { expect };
