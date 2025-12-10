/// <reference types="node" />

// frontend/playwright/e2e/admin.approve-download.spec.ts
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8080';

// Helper de login ADMIN
async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE_URL}/login`);

  const emailInput = page.getByLabel(/correo|usuario|email/i);
  const passInput  = page.getByLabel(/contraseña|password/i);
  const submitBtn  = page.getByRole('button', { name: /iniciar sesión|entrar|acceder/i });

  await emailInput.fill('admin@local.cl');
  await passInput.fill('admin1234');

  await Promise.all([
    page.waitForURL('**/admin**', { timeout: 30_000 }),
    submitBtn.click(),
  ]);

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { name: /inicio de admin/i })).toBeVisible();
}

test('ADMIN descarga y aprueba una licitación desde Mis departamentos', async ({ page }) => {
  // --- Login y navegación al inicio de admin ---
  await loginAsAdmin(page);

  // --- Ir a "Mis departamentos" desde la navbar ---
  await page.getByRole('link', { name: /mis departamentos/i }).click();
  await expect(page).toHaveURL(/\/admin\/departments$/);
  await expect(
    page.getByRole('heading', { name: /licitaciones por departamento/i }),
  ).toBeVisible();

  // No necesitamos usar el filtro de búsqueda.
  // Tomamos una fila que:
  //  - esté en estado IN_REVIEW
  //  - tenga botones "Descargar" y "Aprobar"
  const row = page
    .getByRole('row')
    .filter({ hasText: /in_review/i })
    .filter({ has: page.getByRole('button', { name: /descargar/i }) })
    .filter({ has: page.getByRole('button', { name: /^aprobar$/i }) })
    .first();

  await expect(row).toBeVisible();

  // ============================================
  // 1) PROBAR DESCARGA (botón "Descargar")
  // ============================================

  // Stub de window.open para comprobar que se intenta abrir la URL de descarga
  await page.evaluate(() => {
    (window as any).__openedDownloadUrls = [];
    const originalOpen = window.open;
    window.open = ((url: any, target?: string, features?: string) => {
      (window as any).__openedDownloadUrls.push(String(url));
      // Si quieres que siga abriendo la pestaña físicamente, descomenta:
      // return originalOpen?.(url, target, features) ?? null;
      return null as any;
    }) as any;
  });

  await row.getByRole('button', { name: /descargar/i }).click();

  // Esperamos a que la UI haya llamado a window.open
  await page.waitForFunction(() =>
    Array.isArray((window as any).__openedDownloadUrls) &&
    (window as any).__openedDownloadUrls.length > 0,
  );

  const openedUrls = await page.evaluate(
    () => (window as any).__openedDownloadUrls as string[],
  );

  expect(openedUrls.length).toBeGreaterThan(0);
  // Si quieres, puedes chequear un patrón:
  // expect(openedUrls[0]).toContain('https://');

  // ============================================
  // 2) PROBAR APROBAR (botón "Aprobar" + prompt)
  // ============================================

  // Columna "Nivel" (Código, Creada, Estado, Categoría, Nivel, Archivo, Acciones)
  const levelCell = row.getByRole('cell').nth(4);
  const initialLevel = (await levelCell.innerText()).trim();

  // --- Primera aprobación ---
  const firstDialogPromise = new Promise<string>(resolve => {
    page.once('dialog', async dialog => {
      const msg = dialog.message();
      await dialog.accept('Comentario desde Playwright 1');
      resolve(msg);
    });
  });

  await row.getByRole('button', { name: /^aprobar$/i }).click();

  const firstDialogMessage = await firstDialogPromise;
  expect(firstDialogMessage).toMatch(/comentario \(opcional\) para la aprobación/i);

  // Esperamos a que el nivel cambie (por ejemplo, de 0/2 a 1/2)
  await expect(levelCell).not.toHaveText(initialLevel);

  const afterFirstLevel = (await levelCell.innerText()).trim();

  // --- Segunda aprobación ---
  const secondDialogPromise = new Promise<string>(resolve => {
    page.once('dialog', async dialog => {
      await dialog.accept('Comentario desde Playwright 2');
      resolve(dialog.message());
    });
  });

  await row.getByRole('button', { name: /^aprobar$/i }).click();
  await secondDialogPromise;

  // El nivel debería cambiar de nuevo (1/2 -> 2/2, por ejemplo)
  await expect(levelCell).not.toHaveText(afterFirstLevel);

  // Si tu lógica es "x/2", esto verifica que quedó completo:
  await expect(levelCell).toContainText('/2');

  // Si más adelante tienes estado "APPROVED", puedes descomentar esto:
  // const statusChip = row.getByText(/approved|aprobada?/i);
  // await expect(statusChip).toBeVisible();
});
