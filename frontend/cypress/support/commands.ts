// cypress/support/commands.ts
export {};

declare global {
  namespace Cypress {
    interface Chainable {
      loginUI(): Chainable<void>;
      seedSession(user?: Record<string, unknown>): Chainable<void>;
      loginAsAdmin(): Chainable<void>;

      // Nuevos / ajustados
      loginAsBidder(): Chainable<void>;
      /**
       * Si pasas path, visita esa ruta y siembra localStorage ANTES de que la app monte.
       * Úsalo para entrar directo a rutas protegidas sin rebotar a /login.
       */
      seedSessionWithRole(
        roleKey: string,
        user?: Record<string, unknown>,
        path?: string
      ): Chainable<void>;
      /**
       * Stub del refresh si tu app lo llama al montar.
       */
      stubAuthRefresh(roleKey?: string, userId?: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('loginUI', () => {
  const api = Cypress.env('API') || 'http://localhost:8000';
  cy.intercept('POST', `${api}/auth/login`).as('login');

  cy.visit('/login');
  cy.get(
    'input[name="identifier"], input[type="email"], input[placeholder*="usuario"], input[placeholder*="correo"], input[placeholder*="email"]'
  )
    .first()
    .type('admin@local.cl');
  cy.get('input[type="password"], input[placeholder*="contra"]').first().type('admin1234');
  cy.contains('button, [role="button"]', /entrar|login|iniciar sesión/i).click();

  cy.wait('@login').its('response.statusCode').should('be.oneOf', [200, 201]);
});

Cypress.Commands.add('seedSession', (user: Record<string, unknown> = {}) => {
  const baseUser = {
    id: 'u1',
    userName: 'Administrator',
    mail: 'admin@local.cl',
    rolId: null,
    role: { key: 'ADMIN', name: 'Administrador' },
    ...user, // <- ahora es objeto garantizado
  };

  cy.visit('/login', {
    onBeforeLoad(win) {
      win.localStorage.setItem('token', `dev-${String(baseUser.id)}`);
      win.localStorage.setItem('user', JSON.stringify(baseUser));
    },
  });
});

Cypress.Commands.add('loginAsAdmin', () => {
  const API = Cypress.env('API') || 'http://localhost:8000';

  cy.session('admin@local.cl', () => {
    cy.intercept('POST', `${API}/auth/login`).as('login');

    cy.visit('/login');
    cy.get(
      'input[name="identifier"], input[type="email"], input[placeholder*="usuario"], input[placeholder*="correo"], input[placeholder*="email"]'
    )
      .first()
      .type('admin@local.cl');
    cy.get('input[type="password"], input[placeholder*="contra"]').first().type('admin1234');
    cy.contains('button, [role="button"]', /entrar|login|iniciar sesión/i).click();

    cy.wait('@login').its('response.statusCode').should('be.oneOf', [200, 201]);
  });
});

// ===== NUEVO: helper para stubear /auth/refresh si tu app lo llama al montar =====
Cypress.Commands.add('stubAuthRefresh', (roleKey = 'BIDDER', userId = 'u-bid-1') => {
  cy.intercept('POST', '**/auth/refresh', {
    statusCode: 200,
    body: {
      token: 'refreshed-dev',
      user: { id: userId, role: { key: roleKey, name: roleKey.toUpperCase() } },
    },
  }).as('refresh');
});

// ===== NUEVO: sesión BIDDER antes de montar, con opción de visitar ruta protegida =====
Cypress.Commands.add(
  'seedSessionWithRole',
  (roleKey: string, user: Record<string, unknown> = {}, path: string = '/bidder/tenders/new') => {
    const baseUser = {
      id: 'u-bid-1',
      userName: 'BidderUser',
      mail: 'bidder@local.cl',
      role: { key: roleKey, name: roleKey.toUpperCase() },
      ...user,
    };

    cy.visit(path, {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', `dev-${String(baseUser.id)}`);
        win.localStorage.setItem('user', JSON.stringify(baseUser));
      },
    });
  }
);

// ===== Login real como BIDDER (si quieres smoke full-stack) =====
Cypress.Commands.add('loginAsBidder', () => {
  const API = Cypress.env('API') || 'http://localhost:8000';

  cy.session('bidder@local.cl', () => {
    cy.intercept('POST', `${API}/auth/login`).as('login');
    cy.visit('/login');

    cy.get(
      'input[name="identifier"], input[type="email"], input[placeholder*="usuario"], input[placeholder*="correo"], input[placeholder*="email"]'
    )
      .first()
      .type('bidder@local.cl');

    cy.get('input[type="password"], input[placeholder*="contra"]').first().type('bidder1234');
    cy.contains('button, [role="button"]', /entrar|login|iniciar sesión/i).click();

    cy.wait('@login').its('response.statusCode').should('be.oneOf', [200, 201]);
  });
});

declare global {
  namespace Cypress {
    interface Chainable {
      loginAsWorker(): Chainable<void>;
    }
  }
}

// ===== Login real como WORKER (si haces smoke) =====
Cypress.Commands.add('loginAsWorker', () => {
  const API = Cypress.env('API') || 'http://localhost:8000';

  cy.session('worker@local.cl', () => {
    cy.intercept('POST', `${API}/auth/login`).as('login');
    cy.visit('/login');

    cy.get(
      'input[name="identifier"], input[type="email"], input[placeholder*="usuario"], input[placeholder*="correo"], input[placeholder*="email"]'
    ).first().type('worker@local.cl');

    cy.get('input[type="password"], input[placeholder*="contra"]').first().type('worker1234');
    cy.contains('button, [role="button"]', /entrar|login|iniciar sesión/i).click();

    cy.wait('@login').its('response.statusCode').should('be.oneOf', [200, 201]);
  });
});
