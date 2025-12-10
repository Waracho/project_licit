/// <reference types="node" />
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8080';

test.describe('LoginPage', () => {
  test('muestra el formulario de login', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible();
    await expect(page.getByText(/accede a tu cuenta/i)).toBeVisible();
  });

  test('login exitoso ADMIN redirige a /admin', async ({ page }) => {
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

    await expect(page).toHaveURL(/\/admin/);
    await expect(
      page.getByRole('heading', { name: /inicio de admin/i }),
    ).toBeVisible();
  });

  test('login exitoso WORKER redirige a /worker', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    const emailInput = page.getByLabel(/correo|usuario|email/i);
    const passInput  = page.getByLabel(/contraseña|password/i);
    const submitBtn  = page.getByRole('button', { name: /iniciar sesión|entrar|acceder/i });

    await emailInput.fill('worker@local.cl');
    await passInput.fill('worker1234');

    await Promise.all([
      page.waitForURL('**/worker**', { timeout: 10_000 }),
      submitBtn.click(),
    ]);

    await expect(page).toHaveURL(/\/worker/);
    await expect(
      page.getByRole('heading', { name: /inicio de worker/i }),
    ).toBeVisible();
  });

  test('login exitoso BIDDER redirige a /bidder', async ({ page }) => {
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
      page.getByRole('heading', { name: /Encuentra y postula/i }),
    ).toBeVisible();
  });
});
