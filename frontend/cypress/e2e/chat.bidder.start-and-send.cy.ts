// cypress/e2e/chat.bidder.start-and-send.cy.ts
describe('Chat - BIDDER inicia chat y envía mensaje', () => {
  it('abre el FAB, conecta, envía "Hola" y ve el mensaje', () => {
    // ---- Estado del stub en memoria ----
    const bidderId = 'u-bid-1';
    const workerId = 'u-w-1';
    const chatId = 'chat-1';
    let chatsMineForBidder: any[] = [];         // listado de chats del bidder
    let messagesForChat: any[] = [];            // mensajes del chat (poll)

    // ---- Intercepts ANTES del visit ----
    cy.stubAuthRefresh('BIDDER', bidderId);

    // badge del FAB
    cy.intercept('GET', '**/chats/unread_count*', req => {
      req.reply({ statusCode: 200, body: { total: 0 } });
    }).as('unreadCount');

    // listado de mis chats (BIDDER)
    cy.intercept('GET', `**/chats/mine*`, req => {
      const url = new URL(req.url);
      const uid = url.searchParams.get('userId');
      if (uid === bidderId) {
        req.reply({ statusCode: 200, body: chatsMineForBidder });
      } else {
        req.reply({ statusCode: 200, body: [] });
      }
    }).as('mine');

    // startChat (sin workerUserId => asigna al azar; aquí devolvemos fijo)
    cy.intercept('POST', '**/chats/start', req => {
      const body = req.body || {};
      if (body.bidderUserId === bidderId && !body.workerUserId) {
        // crea el chat "chat-1"
        const chat = {
          id: chatId,
          tenderRequestId: null,
          bidderUserId: bidderId,
          workerUserId: workerId,
          status: 'OPEN',
          unreadBidder: 0,
          unreadWorker: 0,
          lastMessagePreview: null,
          lastMessageAt: null,
        };
        // agrega al listado del bidder
        chatsMineForBidder = [chat, ...chatsMineForBidder];
        req.reply({ statusCode: 200, body: chat });
      } else {
        req.reply({ statusCode: 400, body: 'bad start' });
      }
    }).as('startChat');

    // markRead
    cy.intercept('POST', `**/chats/${chatId}/read*`, { statusCode: 200, body: { ok: true } }).as('markRead');

    // listMessages (poll)
    cy.intercept('GET', `**/chats/${chatId}/messages*`, req => {
      req.reply({ statusCode: 200, body: messagesForChat });
    }).as('listMessages');

    // sendMessage: agrega el mensaje al arreglo y actualiza preview
    cy.intercept('POST', `**/chats/${chatId}/messages`, req => {
      const { senderUserId, text } = req.body || {};
      const msg = {
        id: `m-${Date.now()}`,
        chatId,
        senderUserId,
        text,
        createdAt: new Date().toISOString(),
      };
      messagesForChat.push(msg);
      // actualiza preview en la lista del BIDDER
      chatsMineForBidder = chatsMineForBidder.map(c =>
        c.id === chatId
          ? { ...c, lastMessagePreview: text, lastMessageAt: msg.createdAt, unreadWorker: (c.unreadWorker || 0) + 1 }
          : c
      );
      req.reply({ statusCode: 201, body: msg });
    }).as('sendMessage');

    // ---- Entrar a /bidder (FAB aparece sólo para rol BIDDER) ----
    cy.seedSessionWithRole('BIDDER', { id: bidderId }, '/bidder');

    // Ver FAB
    cy.get('button.fab-chat').should('be.visible').click();

    // Panel abierto, conectar (crea chat con worker aleatorio)
    cy.contains('button', /conectar/i).click();
    cy.wait('@startChat');
    cy.wait('@mine'); // el panel refresca su lista

    // Ya debe haber un chat en la lista; abrirlo si no quedó seleccionado
    cy.contains('.list-item .li-title', /Chat #/i).should('exist').first().click();

    // Enviar "Hola"
    cy.get('.chat-send input[placeholder*="Escribe"]').type('Hola');
    cy.get('.chat-send button').click();
    cy.wait('@sendMessage');

    // Esperar a que el poll traiga el mensaje
    cy.wait('@listMessages'); // al menos una vuelta
    cy.contains('.msg .msg-t', /^Hola$/).should('be.visible');
  });
});
