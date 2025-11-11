// cypress/e2e/bidder.apply.validation.cy.ts
describe('BIDDER - validación PDF falla (stub)', () => {
  it('muestra faltantes y NO crea tender', () => {
    // 1) Intercepts ANTES del visit
    cy.stubAuthRefresh('BIDDER', 'u-bid-1');

    cy.fixture('departments.json').then((deps) => {
      cy.intercept('GET', '**/departments*', { statusCode: 200, body: deps }).as('departments');
    });

    cy.fixture('presign.json').then((presign) => {
      cy.intercept('GET', '**/uploads/s3-presign*', { statusCode: 200, body: presign }).as('presign');
      cy.intercept('PUT', presign.uploadUrl, { statusCode: 200, body: '' }).as('s3put');
    });

    cy.fixture('validate.fail.json').then((fail) => {
      cy.intercept('POST', '**/validator/check-pdf-structure', { statusCode: 200, body: fail }).as('validate');
    });

    // No deben ocurrir:
    cy.intercept('POST', '**/tender-requests').as('createTenderBlocked');

    // 2) Sembrar sesión y entrar DIRECTO a la ruta protegida
    cy.seedSessionWithRole('BIDDER', {}, '/bidder/tenders/new');

    // 3) Paso 1 → Paso 2
    cy.wait('@departments');
    cy.get('select').should('be.visible').select(0);
    cy.contains('button', /siguiente/i).click();

    // 4) Subir PDF y enviar
    cy.get('input[type="file"][accept="application/pdf"]').selectFile('cypress/fixtures/sample.pdf', { force: true });
    cy.contains('button', /crear y adjuntar/i).click();

    // 5) Esperas
    cy.wait('@presign');
    cy.wait('@s3put');
    cy.wait('@validate').its('response.body.ok').should('eq', false);

    // 6) Asserts
    cy.contains(/no cumple|faltan|estructura requerida/i).should('be.visible');
    cy.get('@createTenderBlocked.all').then((calls) => {
      expect(calls.length, 'create tender NO debe llamarse').to.eq(0);
    });
  });
});
