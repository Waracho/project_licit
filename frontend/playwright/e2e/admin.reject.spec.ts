/// <reference types="node" />

// frontend/playwright/e2e/admin.reject.spec.ts
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8080';

// Helper de login ADMIN (mismo estilo que los otros tests)
async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE_URL}/login`);

  const emailInput = page.getByLabel(/correo|usuario|email/i);
  const passInput  = page.getByLabel(/contraseña|password/i);
  const submitBtn  = page.getByRole('button', { name: /iniciar sesión|entrar|acceder/i });

  await emailInput.fill('admin@local.cl');
  await passInput.fill('admin1234');

  await Promise.all([
    page.waitForURL('**/admin**', { timeout: 10_000 }),
    submitBtn.click(),
  ]);

  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole('heading', { name: /inicio de admin/i }),
  ).toBeVisible();
}

// ADMIN - Rechazar licitación
test('ADMIN rechaza una licitación desde Mis departamentos', async ({ page }) => {
  // 1) Login real como admin
  await loginAsAdmin(page);

  // 2) Ir a /admin/departments usando la navbar
  await page.getByRole('link', { name: /mis departamentos/i }).click();
  await expect(page).toHaveURL(/\/admin\/departments$/);
  await expect(
    page.getByRole('heading', { name: /licitaciones por departamento/i }),
  ).toBeVisible();

  // 3) Tomar una fila que esté en IN_REVIEW y tenga botón "Rechazar"
  const row = page
    .getByRole('row')
    .filter({ hasText: /in_review/i })
    .filter({ has: page.getByRole('button', { name: /^rechazar$/i }) })
    .first();

  await expect(row).toBeVisible();

  const statusChip = row.locator('.chip');
  await expect(statusChip).toContainText('IN_REVIEW');

  // 4) Manejo de prompt (motivo) + confirm (confirmación de rechazo)
  let promptSeen = false;
  let confirmSeen = false;

  page.on('dialog', async dialog => {
    const type = dialog.type();
    if (type === 'prompt') {
      promptSeen = true;
      await dialog.accept('No cumple criterios (Playwright)');
    } else if (type === 'confirm') {
      confirmSeen = true;
      await dialog.accept();
    } else {
      await dialog.dismiss();
    }
  });

  // 5) Click en "Rechazar" esperando el POST al endpoint de review
  await Promise.all([
    page.waitForResponse(res =>
      res.url().includes('/tender-requests/') &&
      res.url().includes('/review') &&
      res.request().method() === 'POST',
    ),
    row.getByRole('button', { name: /^rechazar$/i }).click(),
  ]);

  expect(promptSeen).toBeTruthy();
  expect(confirmSeen).toBeTruthy();

  // 6) Verificar que el estado cambió de IN_REVIEW a algún equivalente de REJECTED
  await expect(statusChip).not.toContainText('IN_REVIEW');
  await expect(statusChip).toContainText(/rejected|rechazad/i);
});
