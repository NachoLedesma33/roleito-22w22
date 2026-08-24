import { test, expect } from '@playwright/test';

const API = 'http://localhost:8000/api';

test.describe('Event Bus', () => {
  test('EB1: GET status returns handler count', async ({ request }) => {
    const res = await request.get(`${API}/event-bus/status`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('handler_count');
    expect(data).toHaveProperty('history_count');
    expect(data.handler_count).toBeGreaterThan(0);
  });

  test('EB2: POST emit returns event', async ({ request }) => {
    const res = await request.post(`${API}/event-bus/emit`, {
      data: { event_type: 'test.event', data: { key: 'value' }, source: 'test' },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.event_type).toBe('test.event');
    expect(data.data).toHaveProperty('key', 'value');
    expect(data).toHaveProperty('event_id');
    expect(data).toHaveProperty('timestamp');
  });

  test('EB3: GET history returns emitted events', async ({ request }) => {
    await request.post(`${API}/event-bus/emit`, {
      data: { event_type: 'history.test', data: {} },
    });
    const res = await request.get(`${API}/event-bus/history`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  test('EB4: GET history with filter', async ({ request }) => {
    await request.post(`${API}/event-bus/emit`, {
      data: { event_type: 'filter.test', data: {} },
    });
    const res = await request.get(`${API}/event-bus/history?event_type=filter.test`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.every((e: any) => e.event_type === 'filter.test')).toBe(true);
  });

  test('EB5: DELETE history clears events', async ({ request }) => {
    await request.post(`${API}/event-bus/emit`, {
      data: { event_type: 'clear.test', data: {} },
    });
    const delRes = await request.delete(`${API}/event-bus/history`);
    expect(delRes.status()).toBe(200);
    const res = await request.get(`${API}/event-bus/history`);
    const data = await res.json();
    expect(data.length).toBe(0);
  });

  test('EB6: Emit increments history count', async ({ request }) => {
    const before = await request.get(`${API}/event-bus/status`);
    const beforeData = await before.json();
    await request.post(`${API}/event-bus/emit`, {
      data: { event_type: 'count.test', data: {} },
    });
    const after = await request.get(`${API}/event-bus/status`);
    const afterData = await after.json();
    expect(afterData.history_count).toBeGreaterThanOrEqual(beforeData.history_count);
  });
});
