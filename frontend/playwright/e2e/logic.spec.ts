// frontend/playwright/e2e/logic.spec.ts
import { test, expect } from '@playwright/test';

test.describe('LoginPage', () => {
  test('muestra el formulario de login', async ({ page }) => {
    await page.goto('http://localhost:8080/login');

    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible();
    await expect(page.getByText(/accede a tu cuenta/i)).toBeVisible();
  });

  test('login exitoso ADMIN redirige a /admin', async ({ page }) => {
    await page.goto('http://localhost:8080/login');

    // 👇 Ajusta estos selectores según tu LoginCard:
    const emailInput = page.getByLabel(/correo|usuario|email/i);
    const passInput  = page.getByLabel(/contraseña|password/i);
    const submitBtn  = page.getByRole('button', { name: /iniciar sesión|entrar|acceder/i });

    await emailInput.fill('admin@local.cl');
    await passInput.fill('admin1234');

    // Esperamos navegación a /admin DESPUÉS del click
    await Promise.all([
      page.waitForURL('**/admin**', { timeout: 10_000 }),
      submitBtn.click(),
    ]);

    // Verificamos URL
    await expect(page).toHaveURL(/\/admin/);

    // 👇 Aquí apuntamos DIRECTO al título que ves en la captura
    await expect(
      page.getByRole('heading', { name: /inicio de admin/i }),
    ).toBeVisible();
  });

  test('login fallido muestra mensaje de error', async ({ page }) => {
    await page.goto('http://localhost:8080/login');

    const emailInput = page.getByLabel(/correo|usuario|email/i);
    const passInput  = page.getByLabel(/contraseña|password/i);
    const submitBtn  = page.getByRole('button', { name: /iniciar sesión|entrar|acceder/i });

    await emailInput.fill('no-existe@local.cl');
    await passInput.fill('clave-mala');

    await submitBtn.click();

    await expect(
      page.getByText(/error de login|credenciales inválidas|no autorizado/i),
    ).toBeVisible();
  });
});
