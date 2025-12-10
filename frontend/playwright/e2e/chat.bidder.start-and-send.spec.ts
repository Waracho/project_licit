/// <reference types="node" />

// frontend/playwright/e2e/chat.bidder.start-and-send.spec.ts
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8080';

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

test('BIDDER abre el chat desde el FAB y envía un mensaje', async ({ page }) => {
  // 1) Login como BIDDER y llegar al home /bidder
  await loginAsBidder(page);

  // 2) Abrir el FAB de chat
  const fabChat = page.locator('button.fab-chat');
  await expect(fabChat).toBeVisible();
  await fabChat.click();

  // Panel de chat abierto
  await expect(page.getByText(/mis chats/i)).toBeVisible();

  // 3) Presionar "Conectar" para crear/iniciar un chat
  await page.getByRole('button', { name: /conectar/i }).click();

  // 4) Esperar que aparezca al menos un chat en la lista (ej: "Chat #341bdc")
  const firstChatTitle = page
    .locator('.list-item .li-title')
    .filter({ hasText: /Chat #/i })
    .first();

  await expect(firstChatTitle).toBeVisible();
  await firstChatTitle.click();

  // 5) Escribir y enviar mensaje "Hola"
  const inputMensaje = page.locator('.chat-send input[placeholder*="Escribe"]');
  await expect(inputMensaje).toBeVisible();
  await inputMensaje.fill('Hola');

  const botonEnviar = page.locator('.chat-send button').first();
  await botonEnviar.click();

  // 6) Ver que el mensaje "Hola" aparece en la conversación
  const miMensaje = page
    .locator('.msg .msg-t')
    .filter({ hasText: /^Hola$/ })
    .first();

  await expect(miMensaje).toBeVisible();
});
