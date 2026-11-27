import { expect, test } from '@playwright/test';

const VALID = {
  name: 'Visitante',
  email: 'visitante@example.com',
  subject: 'Consulta sobre una campaña',
  message: 'Hola, tengo una duda sobre el manejo de las sesiones.',
};

async function fill(page: import('@playwright/test').Page) {
  await page.getByLabel('Nombre').fill(VALID.name);
  await page.getByLabel('Correo electrónico').fill(VALID.email);
  await page.getByLabel('Asunto').fill(VALID.subject);
  await page.getByLabel('Mensaje').fill(VALID.message);
}

test.describe('Formulario de contacto', () => {
  test('C01: guarda, muestra el ticket y avisa conservación', async ({ page }) => {
    let payload: { consent_version?: string } | null = null;
    await page.route('**/api/contact', async (route) => {
      payload = route.request().postDataJSON() as { consent_version?: string };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, stored: true, ticket: 'ROL-ABCDEF1234', email_sent: false }),
      });
    });
    await page.goto('/contact');
    await expect(page.getByText(/durante 90 días/)).toBeVisible();
    await expect(page.getByText(/No es un canal de emergencias/)).toBeVisible();
    await expect(page.getByLabel(/Acepto que se guarden mis datos/)).not.toBeChecked();

    await fill(page);
    await page.getByLabel(/Acepto que se guarden mis datos/).check();
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();

    await expect(page.getByTestId('contact-success')).toBeVisible();
    await expect(page.getByTestId('contact-ticket')).toHaveText(/^ROL-[A-Z0-9]{10}$/);
    await expect(page.getByText(/No enviamos acuses por correo/)).toBeVisible();
    expect(payload?.consent_version).toBe('2026-11-27');
  });

  test('C02: sin consentimiento no envía', async ({ page }) => {
    let calls = 0;
    await page.route('**/api/contact', (route) => {
      calls += 1;
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    await page.goto('/contact');
    await fill(page);
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();

    await expect(page.getByTestId('contact-success')).toHaveCount(0);
    expect(calls).toBe(0);
  });

  test('C03: rate limit muestra mensaje claro', async ({ page }) => {
    await page.route('**/api/contact', (route) =>
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Demasiados mensajes. Probá más tarde.' }),
      }),
    );
    await page.goto('/contact');
    await fill(page);
    await page.getByLabel(/Acepto que se guarden mis datos/).check();
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();

    await expect(page.getByTestId('contact-error')).toHaveText('Demasiados mensajes. Probá más tarde.');
  });
});
