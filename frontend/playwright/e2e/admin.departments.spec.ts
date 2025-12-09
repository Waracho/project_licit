import { test, expect } from '@playwright/test';

test('ADMIN aprueba y luego rechaza la primera licitación IN_REVIEW', async ({ page }) => {
  // ---- Login como admin ----
  await page.goto('/login');  // 👈 ahora usa baseURL

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
  await page.goto('/admin/departments');  // 👈 también relativa

  // Seleccionar depto "Agua" (sin usar label accesible)
  const deptSelect = page.locator('select').first();
  await deptSelect.selectOption({ label: 'Agua' });

  // ---- Tomar la primera fila con IN_REVIEW ----
  const table = page.getByRole('table');
  const rowInReview = table.getByRole('row', { name: /IN_REVIEW/i }).first();

  await expect(rowInReview).toBeVisible();

  // =======================
  // 1) APROBAR
  // =======================
  await page.once('dialog', async dialog => {
    // prompt: "Comentario (opcional) para la aprobación:"
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

  // Primer dialog: comentario de rechazo
  await page.once('dialog', async dialog => {
    if (dialog.type() === 'prompt') {
      await dialog.accept('Rechazo automático E2E');
    } else {
      await dialog.accept();
    }
  });

  // Segundo dialog: confirmación de rechazo
  await page.once('dialog', async dialog => {
    if (dialog.type() === 'confirm') {
      await dialog.accept();
    } else {
      await dialog.accept();
    }
  });

  await rowInReview.getByRole('button', { name: /rechazar/i }).click();

  // ---- Resultado final: la misma fila debe quedar REJECTED ----
  await expect(rowInReview.getByText(/REJECTED/i)).toBeVisible();
});
