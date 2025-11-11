// cypress/e2e/departments.smoke.cy.ts
describe('Departments (smoke, full-stack)', () => {
  it('login real y navega a Mis departamentos', () => {
    const API = Cypress.env('API') || 'http://localhost:8000';

    // Login real
    cy.intercept('POST', `${API}/auth/login`).as('login');
    cy.visit('/login');

    cy.get(
      'input[name="identifier"], input[type="email"], input[placeholder*="usuario"], input[placeholder*="correo"], input[placeholder*="email"]'
    ).first().type('admin@local.cl');

    cy.get('input[type="password"], input[placeholder*="contra"]').first().type('admin1234');

    cy.contains('button, [role="button"]', /entrar|login|iniciar sesión/i).click();
    cy.wait('@login').its('response.statusCode').should('be.oneOf', [200, 201]);

    // Tras login, tu app suele ir a /logged y luego /admin — aceptamos cualquiera
    cy.url().should('match', /\/(logged|admin)(\/)?$/);

    // Espía la API de departamentos (solo backend)
    cy.intercept('GET', `${API}/departments*`).as('getDepts');

    cy.contains('a,button,[role="link"]', /mis departamentos/i).click(); // o cy.visit('/admin/departments')

    cy.wait('@getDepts', { timeout: 15000 }).then(({ request, response }) => {
        cy.log(`URL: ${request.url}`);
        cy.log(`STATUS: ${response?.statusCode}`);
        console.log('DEPARTMENTS RESPONSE:', response?.body);
        cy.writeFile('cypress/artifacts/departments_fullstack_response.json', response?.body || {});
    });

    // asserts mínimos
    cy.contains(/departamentos|mis departamentos/i).should('be.visible');

  });
});
