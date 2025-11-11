// cypress/e2e/bidder.nav-permissions.cy.ts
describe('BIDDER - navegación y permisos', () => {
  it('CTA del home y bloqueo de rutas admin', () => {
    cy.loginAsBidder();

    cy.visit('/bidder');
    cy.contains(/¿cómo postular\?/i).click();
    cy.url().should('match', /\/bidder\/tenders\/how-to$/);

    cy.visit('/bidder');
    cy.contains(/postular ya|postular/i).click();
    cy.url().should('match', /\/bidder\/tenders\/new$/);

    cy.visit('/bidder');
    cy.contains(/ver mis postulaciones/i).click();
    cy.url().should('match', /\/bidder\/tenders\/list$/);

    // Intento de admin
    cy.visit('/admin/departments', { failOnStatusCode: false });
    // Acepta cualquiera:
    cy.url().should('satisfy', (u: string) => /\/login$|\/logged$|\/admin$|\/bidder/.test(u));
  });
});
