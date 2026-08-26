import { expect, test } from '../fixtures/auth-fixture';
import {
  createCharacter,
  createNpc,
  createScene,
  createSession,
  seedEvent,
} from '../helpers/api-helpers';

const API = 'http://localhost:8000/api';

test.describe('Agent Routes', () => {
  test('AG1: lore query responde con answer y confidence', async ({
    request,
    campaign,
    authHeaders,
  }) => {
    await createCharacter(request, campaign.id, { name: 'Aria' });
    await createNpc(request, campaign.id, { name: 'Varek' });

    const res = await request.post(`${API}/campaigns/${campaign.id}/agents/lore`, {
      headers: authHeaders,
      data: { question: '¿Quién es Varek?' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.agent_id).toContain('lore');
    expect(body.status).toBe('success');
    expect(body.data.answer).toBeTruthy();
    expect(typeof body.data.confidence).toBe('number');
    expect(body.data.confidence).toBeGreaterThan(0);
  });

  test('AG2: lore sin campaign devuelve 404', async ({ request, campaign, authHeaders }) => {
    const res = await request.post(`${API}/campaigns/nonexistent/agents/lore`, {
      headers: authHeaders,
      data: { question: 'test' },
    });
    expect(res.status()).toBe(404);
  });

  test('AG3: lore sin auth devuelve 401', async ({ request, campaign }) => {
    const res = await request.post(`${API}/campaigns/${campaign.id}/agents/lore`, {
      data: { question: 'test' },
    });
    expect(res.status()).toBe(401);
  });

  test('AG4: recap genera recap, highlights y cliffhanger', async ({
    request,
    campaign,
    authHeaders,
  }) => {
    const session = await createSession(request, campaign.id, {
      number: 1,
      title: 'Sesión de prueba',
    });

    await request.put(
      `${API}/campaigns/${campaign.id}/sessions/${session.id}`,
      {
        headers: authHeaders,
        data: {
          raw_notes: 'Los jugadores exploraron la cueva y encontraron un dragón dormido.',
          summary: 'Sesión de exploración en la cueva del dragón.',
        },
      },
    );

    const res = await request.post(`${API}/campaigns/${campaign.id}/agents/recap`, {
      headers: authHeaders,
      data: { session_id: session.id },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.agent_id).toContain('recap');
    expect(body.status).toBe('success');
    expect(body.data.recap).toBeTruthy();
    expect(Array.isArray(body.data.highlights)).toBe(true);
    expect(body.data.cliffhanger).toBeTruthy();
    expect(body.data.next_session_hook).toBeTruthy();
  });

  test('AG5: recap con sesión inexistente devuelve 404', async ({
    request,
    campaign,
    authHeaders,
  }) => {
    const res = await request.post(`${API}/campaigns/${campaign.id}/agents/recap`, {
      headers: authHeaders,
      data: { session_id: 'nonexistent' },
    });
    expect(res.status()).toBe(404);
  });

  test('AG6: narrate genera narration y mood', async ({ request, campaign, authHeaders }) => {
    const res = await request.post(`${API}/campaigns/${campaign.id}/agents/narrate`, {
      headers: authHeaders,
      data: {
        scene_description: 'Una taberna oscura con música suave',
        mood_hint: 'mystery',
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.agent_id).toContain('narrator');
    expect(body.status).toBe('success');
    expect(body.data.narration).toBeTruthy();
    expect(body.data.mood).toBeTruthy();
    expect(Array.isArray(body.data.environmental_cues)).toBe(true);
  });

  test('AG7: process-session procesa notas en datos estructurados', async ({
    request,
    campaign,
    authHeaders,
  }) => {
    const session = await createSession(request, campaign.id, {
      number: 1,
      title: 'Procesamiento',
    });

    const res = await request.post(
      `${API}/campaigns/${campaign.id}/agents/process-session`,
      {
        headers: authHeaders,
        data: { session_id: session.id },
      },
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.agent_id).toContain('session-processor');
    expect(body.status).toBe('success');
    expect(body.data.summary).toBeTruthy();
    expect(Array.isArray(body.data.events)).toBe(true);
    expect(Array.isArray(body.data.thread_hooks)).toBe(true);
  });

  test('AG8: orchestrator ejecuta task_type válido', async ({
    request,
    campaign,
    authHeaders,
  }) => {
    const res = await request.post(`${API}/orchestrator/${campaign.id}/execute`, {
      headers: authHeaders,
      data: {
        task_type: 'lore_inquiry',
        query: '¿Qué hay en el bosque?',
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.task_type).toBe('lore_inquiry');
    expect(typeof body.execution_time_ms).toBe('number');
  });

  test('AG9: orchestrator con task_type inválido devuelve 400', async ({
    request,
    campaign,
    authHeaders,
  }) => {
    const res = await request.post(`${API}/orchestrator/${campaign.id}/execute`, {
      headers: authHeaders,
      data: { task_type: 'bogus' },
    });
    expect(res.status()).toBe(400);
  });

  test('AG10: orchestrator sin auth devuelve 401', async ({ request, campaign }) => {
    const res = await request.post(`${API}/orchestrator/${campaign.id}/execute`, {
      data: { task_type: 'lore_query', query: 'test' },
    });
    expect(res.status()).toBe(401);
  });
});
