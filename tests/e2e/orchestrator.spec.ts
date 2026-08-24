import { test, expect } from '@playwright/test';

const API = 'http://localhost:8000/api';

let campaignId = '';
let sessionId = '';

test.describe('Orchestrator Agent', () => {
  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${API}/campaigns`, {
      data: { name: 'Orch Test Campaign', description: 'Testing orchestrator' },
    });
    const data = await res.json();
    campaignId = data.id;

    const sessRes = await request.post(`${API}/campaigns/${campaignId}/sessions`, {
      data: { number: 1, date: '2026-01-01', title: 'Test Session' },
    });
    const sessData = await sessRes.json();
    sessionId = sessData.id;
  });

  test.afterAll(async ({ request }) => {
    if (campaignId) await request.delete(`${API}/campaigns/${campaignId}`);
  });

  test('ORCH1: Invalid task type returns 400', async ({ request }) => {
    const res = await request.post(`${API}/orchestrator/${campaignId}/execute`, {
      data: { task_type: 'invalid_type' },
    });
    expect(res.status()).toBe(400);
  });

  test('ORCH2: Process session task executes', async ({ request }) => {
    const res = await request.post(`${API}/orchestrator/${campaignId}/execute`, {
      data: { task_type: 'process_session', session_id: sessionId, raw_notes: 'Party fought goblins' },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.task_type).toBe('process_session');
    expect(data.status).toBe('completed');
    expect(data).toHaveProperty('agent_results');
    expect(data).toHaveProperty('execution_time_ms');
  });

  test('ORCH3: Lore inquiry task executes', async ({ request }) => {
    const res = await request.post(`${API}/orchestrator/${campaignId}/execute`, {
      data: { task_type: 'lore_inquiry', query: 'What is the capital?' },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.task_type).toBe('lore_inquiry');
    expect(data.status).toBe('completed');
  });

  test('ORCH4: Narrate scene task executes', async ({ request }) => {
    const res = await request.post(`${API}/orchestrator/${campaignId}/execute`, {
      data: { task_type: 'narrate_scene', scene_description: 'Dark forest at night', mood: 'tense' },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.task_type).toBe('narrate_scene');
    expect(data.status).toBe('completed');
  });

  test('ORCH5: Full pipeline executes all agents', async ({ request }) => {
    const res = await request.post(`${API}/orchestrator/${campaignId}/execute`, {
      data: { task_type: 'full_pipeline', session_id: sessionId, raw_notes: 'Session notes' },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.task_type).toBe('full_pipeline');
    expect(data.status).toBe('completed');
    expect(data.agent_results).toHaveProperty('session_processor');
    expect(data.agent_results).toHaveProperty('lore');
    expect(data.agent_results).toHaveProperty('narrator');
  });

  test('ORCH6: Generate recap task executes', async ({ request }) => {
    const res = await request.post(`${API}/orchestrator/${campaignId}/execute`, {
      data: { task_type: 'generate_recap', session_number: 1 },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.task_type).toBe('generate_recap');
    expect(data.status).toBe('completed');
  });

  test('ORCH7: Missing session_id for process_session returns error', async ({ request }) => {
    const res = await request.post(`${API}/orchestrator/${campaignId}/execute`, {
      data: { task_type: 'process_session' },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.errors.length).toBeGreaterThan(0);
  });

  test('ORCH8: Missing query for lore_inquiry returns error', async ({ request }) => {
    const res = await request.post(`${API}/orchestrator/${campaignId}/execute`, {
      data: { task_type: 'lore_inquiry' },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.errors.length).toBeGreaterThan(0);
  });
});
