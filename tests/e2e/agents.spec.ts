import { expect, test } from '../fixtures/auth-fixture';
import {
  createCharacter,
  createNpc,
  createSession,
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
    // Y el contexto que vio la IA: el DM tiene que poder verificar la
    // respuesta (el advisor es un segundo arbitro, no un oraculo).
    expect(body.data.context).toContain('Varek');
  });

  test('AG2: lore sin campaign devuelve 404', async ({ request, authHeaders }) => {
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

    // Los eventos quedan en la DB como PROPOSED: la IA propone, el DM
    // aprueba. Antes el endpoint solo devolvia JSON y el DM los copiaba a mano.
    expect(body.proposed_events.length).toBeGreaterThan(0);
    const events = await (
      await request.get(`${API}/campaigns/${campaign.id}/events`, { headers: authHeaders })
    ).json();
    const proposed = events.filter((e: { status: string }) => e.status === 'PROPOSED');
    expect(proposed.length).toBe(body.proposed_events.length);
    for (const p of body.proposed_events) {
      const found = events.find((e: { id: string }) => e.id === p.event_id);
      expect(found, `evento ${p.event_id} en la DB`).toBeTruthy();
      expect(found.status).toBe('PROPOSED');
    }
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

  test('AG11: ingest normaliza y segmenta las notas', async ({
    request,
    campaign,
    authHeaders,
  }) => {
    const res = await request.post(`${API}/campaigns/${campaign.id}/agents/ingest`, {
      headers: authHeaders,
      data: { text: 'La party entro a la mazmorra.\n\n\nSe encontraron goblins.', title: 'Notas' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.agent_id).toBe('ingestion');
    expect(body.status).toBe('success');
    expect(body.data.chars).toBeGreaterThan(0);
    expect(body.data.segments).toHaveLength(2);
  });

  test('AG12: world-state responde con el estado de la campaña', async ({
    request,
    campaign,
    authHeaders,
  }) => {
    const res = await request.post(`${API}/campaigns/${campaign.id}/agents/world-state`, {
      headers: authHeaders,
      data: { question: '¿Dónde está el grupo?' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.agent_id).toBe('world-state');
    expect(body.status).toBe('success');
    expect(body.data.answer).toBeTruthy();
  });

  test('AG13: scene propone la configuración visual', async ({
    request,
    campaign,
    authHeaders,
  }) => {
    const res = await request.post(`${API}/campaigns/${campaign.id}/agents/scene`, {
      headers: authHeaders,
      data: { scene_description: 'Una cripta inundada', mood: 'dread' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.agent_id).toBe('scene');
    expect(body.status).toBe('success');
    expect(body.data.environment).toBeTruthy();
    expect(body.data.lighting).toBeTruthy();
  });

  test('AG14: el panel de agentes ofrece ingesta, estado y escena', async ({
    page,
    campaign,
    dmToken,
  }) => {
    // Esta spec usa la fixture de auth (no la de campaña), que no inyecta el
    // token en el browser: sin esto la app redirige a la landing.
    await page.addInitScript((token: string) => {
      sessionStorage.setItem('roleito:auth:token', token);
    }, dmToken);

    await page.goto(`/campaigns/${campaign.id}/agents`);
    await expect(page.getByRole('heading', { name: 'Agentes de IA' })).toBeVisible({
      timeout: 15_000,
    });

    // Ingesta: normaliza y segmenta.
    await page.getByRole('button', { name: 'Ingesta' }).click();
    await page
      .getByPlaceholder('Las notas crudas de la sesión...')
      .fill('Primera parte.\n\n\n\nSegunda parte.');
    await page.getByRole('button', { name: 'Normalizar y segmentar' }).click();
    await expect(page.getByText('2 segmentos')).toBeVisible({ timeout: 15_000 });

    // Estado del mundo: responde y dice sobre que estado.
    await page.getByRole('button', { name: 'Estado del mundo' }).click();
    await page.getByPlaceholder('¿Dónde está el grupo?').fill('¿Dónde está el grupo?');
    await page.getByRole('button', { name: 'Consultar el estado' }).click();
    await expect(
      page.getByText('El agente respondió sobre este estado:')
    ).toBeVisible({ timeout: 15_000 });
  });

  test('AG15: el panel corre el flujo completo de la sesión', async ({
    page,
    request,
    campaign,
    dmToken,
  }) => {
    await page.addInitScript((token: string) => {
      sessionStorage.setItem('roleito:auth:token', token);
    }, dmToken);

    const session = await createSession(request, campaign.id, {
      number: 1,
      date: '2026-01-02',
      title: 'Sesion del pipeline',
    });

    await page.goto(`/campaigns/${campaign.id}/agents`);
    await expect(page.getByRole('heading', { name: 'Agentes de IA' })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByPlaceholder('session-...').fill(session.id);
    await page.getByTestId('run-pipeline').click();

    const out = page.getByTestId('pipeline-result');
    await expect(out).toBeVisible({ timeout: 30_000 });
    await expect(out).toContainText('session_processor');
    await expect(out).toContainText('world_state');
    await expect(out).toContainText('recap');
    // Y los eventos quedaron propuestos para que el DM los apruebe.
    await expect(out).toContainText('eventos propuestos');
  });
});
