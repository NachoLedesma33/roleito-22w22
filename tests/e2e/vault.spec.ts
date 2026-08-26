import { expect, test } from '../fixtures/auth-fixture';

const API = 'http://localhost:8000/api';

test.describe('Vault Routes', () => {
  test('VT1: status devuelve providers con booleanos', async ({
    request,
    authHeaders,
  }) => {
    const res = await request.get(`${API}/vault/status`, {
      headers: authHeaders,
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.providers).toBe('object');
  });

  test('VT2: store y delete un provider', async ({ request, authHeaders }) => {
    const store = await request.post(`${API}/vault/store`, {
      headers: authHeaders,
      data: { provider: 'test-provider', api_key: 'sk-test-12345' },
    });
    expect(store.status()).toBe(200);
    const storeBody = await store.json();
    expect(storeBody.status).toBe('ok');
    expect(storeBody.provider).toBe('test-provider');

    const status = await request.get(`${API}/vault/status`, {
      headers: authHeaders,
    });
    const statusBody = await status.json();
    expect(statusBody.providers['test-provider']).toBe(true);

    const del = await request.post(`${API}/vault/delete`, {
      headers: authHeaders,
      data: { provider: 'test-provider' },
    });
    expect(del.status()).toBe(200);
    const delBody = await del.json();
    expect(delBody.deleted).toBe(true);

    const statusAfter = await request.get(`${API}/vault/status`, {
      headers: authHeaders,
    });
    const statusAfterBody = await statusAfter.json();
    expect(statusAfterBody.providers['test-provider']).toBeFalsy();
  });

  test('VT3: delete provider inexistente retorna deleted:false', async ({
    request,
    authHeaders,
  }) => {
    const res = await request.post(`${API}/vault/delete`, {
      headers: authHeaders,
      data: { provider: 'nonexistent' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.deleted).toBe(false);
  });

  test('VT4: vault sin auth devuelve 401', async ({ request }) => {
    const res = await request.get(`${API}/vault/status`);
    expect(res.status()).toBe(401);
  });

  test('VT5: store sin auth devuelve 401', async ({ request }) => {
    const res = await request.post(`${API}/vault/store`, {
      data: { provider: 'x', api_key: 'y' },
    });
    expect(res.status()).toBe(401);
  });
});
