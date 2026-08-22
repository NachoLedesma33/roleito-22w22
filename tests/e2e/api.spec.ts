import { expect, test } from '@playwright/test';

const API_BASE = 'http://localhost:8000';
const FRONTEND_ORIGIN = 'http://localhost:5173';

test.describe('API Health', () => {
  test('A1: health check devuelve 200 OK', async ({ request }) => {
    const res = await request.get(`${API_BASE}/health`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.version).toBeTruthy();
  });

  test('A2: CORS headers presentes para el origen del frontend', async ({ request }) => {
    const res = await request.fetch(`${API_BASE}/api/campaigns`, {
      method: 'OPTIONS',
      headers: {
        Origin: FRONTEND_ORIGIN,
        'Access-Control-Request-Method': 'GET',
      },
    });
    expect(res.status()).toBe(200);
    expect(res.headers()['access-control-allow-origin']).toBe(FRONTEND_ORIGIN);
  });

  test('A3: ruta inexistente devuelve 404 con JSON detail', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/nonexistent`);
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(typeof body.detail).toBe('string');
  });
});
