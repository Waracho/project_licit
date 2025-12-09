/// <reference types="node" />
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8080';

test('ADMIN aprueba y luego rechaza la primera licitación IN_REVIEW', async ({ page }) => {
  // ---- Login como admin ----
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

  // ---- Ir a licitaciones por departamento ----
  await page.goto(`${BASE_URL}/admin/departments`);

  const deptSelect = page.locator('select').first();
  await deptSelect.selectOption({ label: 'Agua' });

  const table = page.getByRole('table');
  const rowInReview = table.getByRole('row', { name: /IN_REVIEW/i }).first();
  await expect(rowInReview).toBeVisible();

  // =======================
  // 1) APROBAR
  // =======================
  await page.once('dialog', async dialog => {
    if (dialog.type() === 'prompt') {
      await dialog.accept('Aprobación automática E2E');
    } else {
      await dialog.accept();
    }
  });

  await rowInReview.getByRole('button', { name: /aprobar/i }).click();

  // =======================
  // 2) RECHAZAR
  // =======================
  await page.once('dialog', async dialog => {
    if (dialog.type() === 'prompt') {
      await dialog.accept('Rechazo automático E2E');
    } else {
      await dialog.accept();
    }
  });

  await page.once('dialog', async dialog => {
    if (dialog.type() === 'confirm') {
      await dialog.accept();
    } else {
      await dialog.accept();
    }
  });

  await rowInReview.getByRole('button', { name: /rechazar/i }).click();

  await expect(rowInReview.getByText(/REJECTED/i)).toBeVisible();
});
