import { expect, test } from '../fixtures/campaign-fixture';
import { API_BASE } from '../helpers/api-helpers';

import type { APIRequestContext, Page } from '@playwright/test';

interface TestNote {
  id: string;
  title: string;
  content: string;
  category: string;
}

async function createNote(
  request: APIRequestContext,
  campaignId: string,
  data: { title: string; content?: string; category?: string },
): Promise<TestNote> {
  const res = await request.post(`${API_BASE}/campaigns/${campaignId}/notebooks`, {
    data,
  });
  if (!res.ok()) throw new Error(`createNote failed: ${res.status()}`);
  return res.json();
}

async function updateNote(
  request: APIRequestContext,
  campaignId: string,
  noteId: string,
  data: { content?: string; pinned?: number; category?: string },
): Promise<void> {
  const res = await request.put(
    `${API_BASE}/campaigns/${campaignId}/notebooks/${noteId}`,
    { data },
  );
  if (!res.ok()) throw new Error(`updateNote failed: ${res.status()}`);
}

test.describe('DM Notebook', () => {
  async function openDashboard(page: Page, campaignId: string) {
    await page.goto(`/campaigns/${campaignId}`);
    await expect(page.getByTitle('Roll dice (D)')).toBeVisible();
  }

  async function openNotebook(page: Page) {
    await page.getByTitle('DM Notebook (N)').click();
    const panel = page.locator('div.fixed', {
      has: page.getByRole('heading', { name: 'DM Notebook' }),
    });
    await expect(panel).toBeVisible();
    return panel;
  }

  function noteDetailGet(page: Page) {
    return page.waitForResponse(
      (r) =>
        r.request().method() === 'GET' &&
        /notebooks\/[0-9a-f-]+$/.test(new URL(r.url()).pathname),
    );
  }

  test('NB1: crea nota nueva y entra en modo edición', async ({ page, campaign }) => {
    await openDashboard(page, campaign.id);
    const panel = await openNotebook(page);

    const getPromise = noteDetailGet(page);
    await panel.getByRole('button', { name: '+ New Note' }).click();
    await getPromise;

    await expect(panel.locator('input')).toHaveValue('New Note');
    await expect(panel.locator('textarea')).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
  });

  test('NB2: edita y guarda nota', async ({ page, campaign, request }) => {
    await openDashboard(page, campaign.id);
    const panel = await openNotebook(page);

    const getPromise = noteDetailGet(page);
    await panel.getByRole('button', { name: '+ New Note' }).click();
    await getPromise;

    await panel.locator('input').fill('Loot de la mazmorra');
    await panel
      .locator('textarea')
      .fill('El cofre está bajo el altar. Código: 7-3-1');
    await panel.getByRole('button', { name: 'Save', exact: true }).click();

    await expect(panel.getByText('Loot de la mazmorra')).toBeVisible();
    await expect(
      panel.getByText('El cofre está bajo el altar. Código: 7-3-1'),
    ).toBeVisible();

    const list = await request.get(`${API_BASE}/campaigns/${campaign.id}/notebooks`);
    const notes = (await list.json()) as TestNote[];
    expect(notes[0].title).toBe('Loot de la mazmorra');
    expect(notes[0].content).toContain('bajo el altar');
  });

  test('NB3: filtra notas por categoría', async ({ page, campaign, request }) => {
    await createNote(request, campaign.id, {
      title: 'Crítico en 19+',
      category: 'rules',
      content: 'Regla de casa',
    });
    await createNote(request, campaign.id, {
      title: 'Rey desaparecido',
      category: 'lore',
      content: 'Nadie sabe dónde está',
    });

    await openDashboard(page, campaign.id);
    const panel = await openNotebook(page);

    await expect(panel.getByText('Crítico en 19+')).toBeVisible();
    await expect(panel.getByText('Rey desaparecido')).toBeVisible();

    await panel.getByRole('button', { name: /Rules \(1\)/ }).click();
    await expect(panel.getByText('Crítico en 19+')).toBeVisible();
    await expect(panel.getByText('Rey desaparecido')).toHaveCount(0);

    await panel.getByRole('button', { name: /All \(2\)/ }).click();
    await expect(panel.getByText('Rey desaparecido')).toBeVisible();
  });

  test('NB4: pin deja la nota primera en la lista', async ({ page, campaign, request }) => {
    const oldNote = await createNote(request, campaign.id, {
      title: 'Anotación vieja',
      content: 'vieja',
    });
    await createNote(request, campaign.id, {
      title: 'Anotación nueva',
      content: 'nueva',
    });

    await openDashboard(page, campaign.id);
    const panel = await openNotebook(page);

    await panel.getByRole('button', { name: /Anotación vieja/ }).click();
    await panel.getByTitle('Pin').click();
    await expect(panel.getByTitle('Unpin')).toBeVisible();

    await panel.getByRole('button', { name: '← Back to list' }).click();

    const vieja = await panel.getByText('Anotación vieja').boundingBox();
    const nueva = await panel.getByText('Anotación nueva').boundingBox();
    expect(vieja).not.toBeNull();
    expect(nueva).not.toBeNull();
    expect(vieja!.y).toBeLessThan(nueva!.y);

    void oldNote;
  });

  test('NB5: muestra historial de versiones', async ({ page, campaign, request }) => {
    const note = await createNote(request, campaign.id, {
      title: 'Nota versionada',
      content: 'Contenido original de la nota',
    });
    await updateNote(request, campaign.id, note.id, {
      content: 'Segunda versión del contenido',
    });

    await openDashboard(page, campaign.id);
    const panel = await openNotebook(page);

    await panel.getByRole('button', { name: /Nota versionada/ }).click();
    await panel.getByRole('button', { name: 'History' }).click();

    await expect(panel.getByText('Version History')).toBeVisible();
    await expect(panel.getByText('v1')).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Restore' })).toBeVisible();
  });

  test('NB6: restaura versión anterior', async ({ page, campaign, request }) => {
    const note = await createNote(request, campaign.id, {
      title: 'Nota restaurable',
      content: 'Contenido original de la nota',
    });
    await updateNote(request, campaign.id, note.id, {
      content: 'Segunda versión del contenido',
    });

    await openDashboard(page, campaign.id);
    const panel = await openNotebook(page);

    await panel.getByRole('button', { name: /Nota restaurable/ }).click();
    await panel.getByRole('button', { name: 'History' }).click();

    await panel
      .locator('div.group')
      .filter({ hasText: 'v1' })
      .getByRole('button', { name: 'Restore' })
      .click();

    await expect(panel.getByText('Contenido original de la nota')).toBeVisible();
    await expect(panel.getByText('Segunda versión del contenido')).toHaveCount(0);

    const res = await request.get(
      `${API_BASE}/campaigns/${campaign.id}/notebooks/${note.id}`,
    );
    const saved = (await res.json()) as TestNote;
    expect(saved.content).toBe('Contenido original de la nota');
  });

  test('NB7: elimina nota con confirmación', async ({ page, campaign, request }) => {
    await createNote(request, campaign.id, {
      title: 'Nota basura',
      content: 'borrar',
    });

    await openDashboard(page, campaign.id);
    const panel = await openNotebook(page);

    page.on('dialog', (dialog) => dialog.accept());
    await panel.getByRole('button', { name: /Nota basura/ }).click();
    await panel.getByTitle('Delete').click();

    await expect(panel.getByText('Nota basura')).toHaveCount(0);
    await expect(panel.getByText(/No notes yet/)).toBeVisible();
  });
});
