/// <reference types="node" />

// frontend/playwright/e2e/chat.worker.reply.spec.ts
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8080';

/** Login como BIDDER y deja al usuario en /bidder */
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

/** Login como WORKER y deja al usuario en /worker */
async function loginAsWorker(page: Page) {
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
}

/** El BIDDER abre el FAB, conecta y envía "Hola" en el chat. */
async function bidderCreatesChatAndSendsHola(page: Page) {
  await loginAsBidder(page);

  // FAB flotante de chat
  const fabChat = page.locator('button.fab-chat');
  await expect(fabChat).toBeVisible();
  await fabChat.click();

  // Panel de chat abierto
  await expect(page.getByText(/mis chats/i)).toBeVisible();

  // Botón "Conectar" para crear / asociar un chat
  await page.getByRole('button', { name: /conectar/i }).click();

  // Esperar que exista un chat en la lista
  const firstChatTitle = page
    .locator('.list-item .li-title')
    .filter({ hasText: /Chat #/i })
    .first();

  await expect(firstChatTitle).toBeVisible();
  await firstChatTitle.click();

  // Enviar mensaje "Hola"
  const inputMensaje = page.locator('.chat-send input[placeholder*="Escribe"]');
  await expect(inputMensaje).toBeVisible();
  await inputMensaje.fill('Hola');

  const botonEnviar = page.locator('.chat-send button').first();
  await botonEnviar.click();

  // Asegurarnos de que el mensaje quedó en el chat del BIDDER
  const miMensaje = page
    .locator('.msg .msg-t')
    .filter({ hasText: /^Hola$/ })
    .first();

  await expect(miMensaje).toBeVisible();
}

test('WORKER ve un chat existente y responde "Qué tal"', async ({ browser }) => {
  // 1) En un contexto separado, el BIDDER crea un chat y envía "Hola"
  const bidderContext = await browser.newContext();
  const bidderPage = await bidderContext.newPage();
  await bidderCreatesChatAndSendsHola(bidderPage);
  await bidderContext.close(); // ya dejamos el chat creado en el backend

  // 2) En otro contexto nuevo, el WORKER entra a /worker/chats y responde
  const workerContext = await browser.newContext();
  const workerPage = await workerContext.newPage();

  await loginAsWorker(workerPage);
  await workerPage.goto(`${BASE_URL}/worker/chats`);

  // Debe existir al menos un chat cuyo preview sea "Hola"
  const chatWithHolaPreview = workerPage
    .locator('.wc-item', {
      has: workerPage.locator('.wc-item__sub', { hasText: /^Hola$/ }),
    })
    .first();

  await expect(chatWithHolaPreview).toBeVisible();

  // Abrir ese chat (clic sobre el item completo)
  await chatWithHolaPreview.click();

  // Ver el mensaje "Hola" del BIDDER en la conversación
  const holaMsg = workerPage
    .locator('.wc-msg .wc-msg__text')
    .filter({ hasText: /^Hola$/ })
    .first();
  await expect(holaMsg).toBeVisible();

  // Enviar respuesta "Qué tal"
  const input = workerPage.locator('.wc__send input[placeholder*="Escribe"]');
  await expect(input).toBeVisible();
  await input.fill('Qué tal');

  const sendBtn = workerPage.locator('.wc__send button').first();
  await sendBtn.click();

  // Esperar a ver el mensaje del WORKER "Qué tal"
  const replyMsg = workerPage
    .locator('.wc-msg .wc-msg__text')
    .filter({ hasText: /^Qué tal$/ })
    .first();
  await expect(replyMsg).toBeVisible();

  await workerContext.close();
});
