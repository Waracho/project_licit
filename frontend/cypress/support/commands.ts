// cypress/support/commands.ts
export {};

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
    role: { key: 'admin', name: 'Administrador' },
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
    cy.get('input[name="identifier"], input[type="email"], input[placeholder*="usuario"], input[placeholder*="correo"], input[placeholder*="email"]')
      .first().type('admin@local.cl');
    cy.get('input[type="password"], input[placeholder*="contra"]').first().type('admin1234');
    cy.contains('button, [role="button"]', /entrar|login|iniciar sesión/i).click();

    cy.wait('@login').its('response.statusCode').should('be.oneOf', [200, 201]);
  });
});
