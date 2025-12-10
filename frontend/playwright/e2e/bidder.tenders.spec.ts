/// <reference types="node" />

// frontend/playwright/e2e/bidder.tenders.spec.ts
import { test, expect, Page } from '@playwright/test';
import path from 'path';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8080';

// --- helper: login como BIDDER ---
async function loginAsBidder(page: Page) {
  await page.goto(`${BASE_URL}/login`);

  const emailInput = page.getByLabel(/correo|usuario|email/i);
  const passInput  = page.getByLabel(/contraseña|password/i);
  const submitBtn  = page.getByRole('button', { name: /iniciar sesión|entrar|acceder/i });

  await emailInput.fill('bidder@local.cl');
  await passInput.fill('bidder1234');

  await Promise.all([
    page.waitForURL('**/bidder**', { timeout: 10_000 }),
    submitBtn.click(),
  ]);

  await expect(page).toHaveURL(/\/bidder/);
  await expect(
    page.getByRole('heading', { name: /encuentra y postula tu licitación en minutos/i }),
  ).toBeVisible();
}

test('BIDDER crea una nueva licitación con PDF y la ve en "Mis postulaciones"', async ({ page }) => {
  // 1) Login como bidder
  await loginAsBidder(page);

  // 2) Ir a la pestaña "Mis licitaciones" del navbar
  await Promise.all([
    page.waitForURL('**/bidder/tenders', { timeout: 10_000 }),
    page.getByRole('link', { name: /^mis licitaciones$/i }).click(),
  ]);

  await expect(page).toHaveURL(/\/bidder\/tenders$/);

  // Confirmamos que estamos en la pantalla con las 3 tarjetas
  await expect(page.getByText('¿Cómo postular?')).toBeVisible();
  await expect(page.getByText('Ver mis postulaciones')).toBeVisible();

  // 3) Click SOLO en la tarjeta "Postular" (la de la derecha)
  const postularTile = page.locator('a.bt-tile', {
    hasText: 'Crear una nueva licitación',
  });

  await expect(postularTile).toBeVisible();

  await Promise.all([
    page.waitForURL('**/bidder/tenders/new', { timeout: 10_000 }),
    postularTile.click(),
  ]);

  await expect(
    page.getByRole('heading', { name: /nueva postulación/i }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/bidder\/tenders\/new$/);

  // 4) Paso 1 – seleccionar departamento
  const deptSelect = page.locator('form.tcard select');
  await expect(deptSelect).toBeVisible();

  try {
    await deptSelect.selectOption({ label: 'Agua' });
  } catch {
    await deptSelect.selectOption({ index: 0 });
  }

  await page.getByRole('button', { name: /^siguiente$/i }).click();

  // 5) Paso 2 – subir PDF desde fixtures
  await expect(page.getByText(/archivo pdf/i)).toBeVisible();

  const fileInput = page.locator('input[type="file"]');

  // 👇 Ruta portable: desde la raíz del frontend
  // En tu máquina: D:\project_licit\frontend\playwright\fixtures\sample.pdf
  // En Docker:     /app/playwright/fixtures/sample.pdf
  const filePath = path.join(
    process.cwd(),
    'playwright',
    'fixtures',
    'sample.pdf',
  );

  await fileInput.setInputFiles(filePath);

  await page.getByRole('button', { name: /crear y adjuntar/i }).click();

  // 6) Paso 3 – confirmación
  await expect(
    page.getByText(/¡postulación enviada!/i),
  ).toBeVisible();

  // 7) "Ver mis postulaciones"
  const verMisPostLink = page.getByRole('link', { name: /ver mis postulaciones/i });
  await expect(verMisPostLink).toBeVisible();

  await Promise.all([
    page.waitForURL('**/bidder/tenders/list', { timeout: 10_000 }),
    verMisPostLink.click(),
  ]);

  await expect(
    page.getByRole('heading', { name: /mis postulaciones/i }),
  ).toBeVisible();

  const filas = page.getByText(/TR-AG-/i);
  await expect(filas.first()).toBeVisible();
});
