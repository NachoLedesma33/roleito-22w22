import { appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { test as base, expect } from '@playwright/test';
import { Campaign, withAuth } from '../helpers/api-helpers';

const API = 'http://localhost:8000/api';

// Registro de lo que crean los tests. El fixture borra la campaña por la API al
// final de cada test, así que después la fila ya no está y la única forma de
// saber que `data/assets/{id}/` es basura (y no tuya) es este archivo.
// scripts/purge_e2e_junk.py lo lee y lo consume en cada purga.
const REGISTRY = join(tmpdir(), 'roleito-e2e-ids.txt');

function register(id: string): void {
  appendFileSync(REGISTRY, `${id}\n`);
}

let _cachedToken: string | null = null;

async function getDmToken(req: import('@playwright/test').APIRequestContext): Promise<string> {
  if (_cachedToken) return _cachedToken;
  const name = `E2E DM ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const registerRes = await req.post(`${API}/auth/register`, {
    data: { name, pin: '1234' },
  });
  if (!registerRes.ok()) throw new Error(`auth register failed: ${registerRes.status()}`);
  const registered = await registerRes.json();
  _cachedToken = registered.token;
  register(registered.dm_id);
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
    register(campaign.id);
    await use(campaign);
    // La limpieza es best-effort: si el backend corta la conexion al cerrar (lo
    // hace cuando hay carga o un reload del server) el test ya paso y no puede
    // dar rojo por eso. El id quedo en el REGISTRY, asi que `purge_e2e_junk.py`
    // lo limpia igual en la proxima corrida.
    await request
      .delete(`${API}/campaigns/${campaign.id}`, { headers: withAuth(dmToken) })
      .catch(() => {});
  },

  page: async ({ page, dmToken }, use) => {
    await page.addInitScript((token: string) => {
      sessionStorage.setItem('roleito:auth:token', token);
    }, dmToken);
    await use(page);
  },
});

export { expect };
