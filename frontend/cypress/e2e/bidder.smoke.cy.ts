// cypress/e2e/bidder.smoke.cy.ts
describe('BIDDER Smoke (full-stack)', () => {
  it('login real, llega a /bidder y abre el wizard', () => {
    const API = Cypress.env('API') || 'http://localhost:8000';

    cy.loginAsBidder();

    // Espiar para verificar que suceden las llamadas reales
    cy.intercept('GET', `${API}/departments*`).as('departments');

    cy.visit('/bidder');
    cy.contains(/¿cómo postular\?|postular|ver mis postulaciones|explorar/i).should('be.visible');

    // CTA al wizard
    cy.contains('a,button,[role="link"]', /postular ya|postular/i).first().click();
    cy.url().should('match', /\/bidder\/tenders\/new$/);

    cy.wait('@departments').its('response.statusCode').should('be.oneOf', [200, 304]);
    cy.get('select').should('exist'); // selector de departamento
  });
});