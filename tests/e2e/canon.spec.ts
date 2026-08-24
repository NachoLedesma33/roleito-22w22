import { test, expect } from '@playwright/test';

const API = 'http://localhost:8000/api';

let campaignId = '';
let entryId = '';

test.describe('Canon Manager', () => {
  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${API}/campaigns`, {
      data: { name: 'Canon Test Campaign', description: 'Testing canon' },
    });
    const data = await res.json();
    campaignId = data.id;
  });

  test.afterAll(async ({ request }) => {
    if (campaignId) await request.delete(`${API}/campaigns/${campaignId}`);
  });

  test('CAN1: Propose canon entry creates PROPOSED', async ({ request }) => {
    const res = await request.post(`${API}/canon/${campaignId}/propose`, {
      data: { entity_type: 'npc', entity_id: 'varek', fact: 'Varek is a merchant' },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('PROPOSED');
    expect(data.fact).toBe('Varek is a merchant');
    entryId = data.entry_id;
  });

  test('CAN2: List canon entries returns array', async ({ request }) => {
    const res = await request.get(`${API}/canon/${campaignId}`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(1);
  });

  test('CAN3: Get specific canon entry', async ({ request }) => {
    const res = await request.get(`${API}/canon/${campaignId}/${entryId}`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.entry_id).toBe(entryId);
    expect(data.fact).toBe('Varek is a merchant');
  });

  test('CAN4: Approve canon entry changes status', async ({ request }) => {
    const res = await request.put(`${API}/canon/${campaignId}/${entryId}/approve`, {
      data: { reviewed_by: 'dm', notes: 'Confirmed' },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('APPROVED');
    expect(data.reviewed_by).toBe('dm');
  });

  test('CAN5: Propose contradicting entry flags review', async ({ request }) => {
    const proposeRes = await request.post(`${API}/canon/${campaignId}/propose`, {
      data: { entity_type: 'npc', entity_id: 'varek', fact: 'Varek is alive and well' },
    });
    const proposeData = await proposeRes.json();
    await request.put(`${API}/canon/${campaignId}/${proposeData.entry_id}/approve`, {
      data: { reviewed_by: 'dm' },
    });

    const res = await request.post(`${API}/canon/${campaignId}/propose`, {
      data: { entity_type: 'npc', entity_id: 'varek', fact: 'Varek is dead' },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('REVIEW');
    expect(data.contradictions.length).toBeGreaterThan(0);
  });

  test('CAN6: Reject canon entry', async ({ request }) => {
    const proposeRes = await request.post(`${API}/canon/${campaignId}/propose`, {
      data: { entity_type: 'location', entity_id: 'castle', fact: 'Castle is destroyed' },
    });
    const proposeData = await proposeRes.json();

    const res = await request.put(`${API}/canon/${campaignId}/${proposeData.entry_id}/reject`, {
      data: { reviewed_by: 'dm', notes: 'Not canon' },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('REJECTED');
  });

  test('CAN7: Filter by status', async ({ request }) => {
    const res = await request.get(`${API}/canon/${campaignId}?status=APPROVED`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.every((e: any) => e.status === 'APPROVED')).toBe(true);
  });

  test('CAN8: Non-existent entry returns 404', async ({ request }) => {
    const res = await request.get(`${API}/canon/${campaignId}/nonexistent`);
    expect(res.status()).toBe(404);
  });
});
