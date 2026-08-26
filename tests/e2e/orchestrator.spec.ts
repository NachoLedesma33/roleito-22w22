import { test, expect } from '../fixtures/auth-fixture';

const API = 'http://localhost:8000/api';

test.describe('Orchestrator Agent', () => {
  test('ORCH1: Invalid task type returns 400', async ({ request, authHeaders, campaign }) => {
    const res = await request.post(`${API}/orchestrator/${campaign.id}/execute`, {
      headers: authHeaders,
      data: { task_type: 'invalid_type' },
    });
    expect(res.status()).toBe(400);
  });

  test('ORCH2: Process session task executes', async ({
    request,
    authHeaders,
    campaign,
  }) => {
    const sessRes = await request.post(`${API}/campaigns/${campaign.id}/sessions`, {
      data: { number: 1, date: '2026-01-01', title: 'Test Session' },
    });
    const sessData = await sessRes.json();

    const res = await request.post(`${API}/orchestrator/${campaign.id}/execute`, {
      headers: authHeaders,
      data: {
        task_type: 'process_session',
        session_id: sessData.id,
        raw_notes: 'Party fought goblins',
      },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.task_type).toBe('process_session');
  });

  test('ORCH3: Lore inquiry task executes', async ({
    request,
    authHeaders,
    campaign,
  }) => {
    const res = await request.post(`${API}/orchestrator/${campaign.id}/execute`, {
      headers: authHeaders,
      data: { task_type: 'lore_inquiry', query: 'What is the capital?' },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.task_type).toBe('lore_inquiry');
  });

  test('ORCH4: Narrate scene task executes', async ({
    request,
    authHeaders,
    campaign,
  }) => {
    const res = await request.post(`${API}/orchestrator/${campaign.id}/execute`, {
      headers: authHeaders,
      data: { task_type: 'narrate_scene', scene_description: 'Dark forest at night', mood: 'tense' },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.task_type).toBe('narrate_scene');
  });

  test('ORCH5: Full pipeline executes all agents', async ({
    request,
    authHeaders,
    campaign,
  }) => {
    const sessRes = await request.post(`${API}/campaigns/${campaign.id}/sessions`, {
      data: { number: 2, date: '2026-01-02', title: 'Pipeline Session' },
    });
    const sessData = await sessRes.json();

    const res = await request.post(`${API}/orchestrator/${campaign.id}/execute`, {
      headers: authHeaders,
      data: { task_type: 'full_pipeline', session_id: sessData.id, raw_notes: 'Session notes' },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.task_type).toBe('full_pipeline');
    expect(data.agent_results).toHaveProperty('session_processor');
    expect(data.agent_results).toHaveProperty('lore');
    expect(data.agent_results).toHaveProperty('narrator');
  });

  test('ORCH6: Generate recap task executes', async ({
    request,
    authHeaders,
    campaign,
  }) => {
    const sessRes = await request.post(`${API}/campaigns/${campaign.id}/sessions`, {
      data: { number: 3, date: '2026-01-03', title: 'Recap Session' },
    });
    const sessData = await sessRes.json();

    const res = await request.post(`${API}/orchestrator/${campaign.id}/execute`, {
      headers: authHeaders,
      data: { task_type: 'generate_recap', session_id: sessData.id },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.task_type).toBe('generate_recap');
  });

  test('ORCH7: Missing session_id for process_session returns error', async ({
    request,
    authHeaders,
    campaign,
  }) => {
    const res = await request.post(`${API}/orchestrator/${campaign.id}/execute`, {
      headers: authHeaders,
      data: { task_type: 'process_session' },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.errors.length).toBeGreaterThan(0);
  });

  test('ORCH8: Missing query for lore_inquiry returns error', async ({
    request,
    authHeaders,
    campaign,
  }) => {
    const res = await request.post(`${API}/orchestrator/${campaign.id}/execute`, {
      headers: authHeaders,
      data: { task_type: 'lore_inquiry' },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.errors.length).toBeGreaterThan(0);
  });
});
