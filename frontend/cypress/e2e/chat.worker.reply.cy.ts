// cypress/e2e/chat.worker.reply.cy.ts
describe('Chat - WORKER responde a un chat', () => {
  it('ve chat existente y responde "Qué tal"', () => {
    // ---- Estado del stub compartido con la historia: un chat ya existe con 1 mensaje del BIDDER ----
    const bidderId = 'u-bid-1';
    const workerId = 'u-w-1';
    const chatId = 'chat-1';

    let chatsMineForWorker: any[] = [
      {
        id: chatId,
        tenderRequestId: null,
        bidderUserId: bidderId,
        workerUserId: workerId,
        status: 'OPEN',
        unreadBidder: 0,
        unreadWorker: 1, // 1 no leído (del BIDDER)
        lastMessagePreview: 'Hola',
        lastMessageAt: new Date().toISOString(),
      },
    ];

    // Mensajes: ya viene 1 del BIDDER
    let messagesForChat: any[] = [
      {
        id: 'm-1',
        chatId,
        senderUserId: bidderId,
        text: 'Hola',
        createdAt: new Date(Date.now() - 2000).toISOString(),
      },
    ];

    // ---- Intercepts ANTES del visit ----
    cy.stubAuthRefresh('WORKER', workerId);

    // Mis chats (WORKER)
    cy.intercept('GET', '**/chats/mine*', req => {
      const url = new URL(req.url);
      const uid = url.searchParams.get('userId');
      if (uid === workerId) {
        req.reply({ statusCode: 200, body: chatsMineForWorker });
      } else {
        req.reply({ statusCode: 200, body: [] });
      }
    }).as('mineWorker');

    // list users (tab "Usuarios") — no lo necesitamos aquí, pero devolvemos algo si se consulta
    cy.intercept('GET', '**/users/by_role_key*', { statusCode: 200, body: [] }).as('usersByRole');

    // markRead cuando abre
    cy.intercept('POST', `**/chats/${chatId}/read*`, req => {
      // al leer, unreadWorker = 0
      chatsMineForWorker = chatsMineForWorker.map(c =>
        c.id === chatId ? { ...c, unreadWorker: 0 } : c
      );
      req.reply({ statusCode: 200, body: { ok: true } });
    }).as('markRead');

    // listMessages (poll)
    cy.intercept('GET', `**/chats/${chatId}/messages*`, req => {
      req.reply({ statusCode: 200, body: messagesForChat });
    }).as('listMessages');

    // sendMessage del WORKER
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
      // actualiza preview visible al WORKER
      chatsMineForWorker = chatsMineForWorker.map(c =>
        c.id === chatId
          ? { ...c, lastMessagePreview: text, lastMessageAt: msg.createdAt, unreadBidder: (c.unreadBidder || 0) + 1 }
          : c
      );
      req.reply({ statusCode: 201, body: msg });
    }).as('sendMessage');

    // ---- Entrar a /worker/chats ya autenticado como WORKER ----
    cy.seedSessionWithRole('WORKER', { id: workerId }, '/worker/chats');

    // Debe listar el chat con preview "Hola"
    cy.wait('@mineWorker');
    cy.contains('.wc-item__sub', /^Hola$/).should('be.visible');

    // Abrir el chat
    cy.contains('.wc-item .wc-item__title', /Chat #/i).first().click();
    cy.wait('@markRead'); // al abrir marca leído
    cy.wait('@listMessages');

    // Enviar "Qué tal"
    cy.get('.wc__send input[placeholder*="Escribe"]').type('Qué tal');
    cy.get('.wc__send button').click();
    cy.wait('@sendMessage');

    // Esperar poll y ver el mensaje
    cy.wait('@listMessages'); // siguiente vuelta del poll
    cy.contains('.wc-msg .wc-msg__text', /^Qué tal$/).should('be.visible');
  });
});
