// cypress/e2e/bidder.apply.stub.cy.ts
describe('BIDDER aplica a tender (stub éxito)', () => {
  it('departamento -> PDF -> validación ok -> crea -> adjunta -> éxito', () => {
    cy.stubAuthRefresh('BIDDER', 'u-bid-1');

    // Stubs deterministas
    cy.fixture('departments.json').then((deps) => {
      cy.intercept('GET', '**/departments*', { statusCode: 200, body: deps }).as('departments');
    });

    cy.fixture('presign.json').then((presign) => {
      cy.intercept('GET', '**/uploads/s3-presign*', { statusCode: 200, body: presign }).as('presign');
      // PUT al uploadUrl fijo del fixture
      cy.intercept('PUT', presign.uploadUrl, { statusCode: 200, body: '' }).as('s3put');
    });

    cy.fixture('validate.ok.json').then((ok) => {
      cy.intercept('POST', '**/validator/check-pdf-structure', { statusCode: 200, body: ok }).as('validate');
    });

    cy.fixture('tender.create.json').then((created) => {
      cy.intercept('POST', '**/tender-requests', { statusCode: 201, body: created }).as('createTender');
      cy.intercept('POST', `**/tender-requests/${created.id}/files`, { statusCode: 201, body: { ok: true } }).as('attachFile');
    });

    // Entrar ya autenticado
    cy.seedSessionWithRole('BIDDER', {}, '/bidder/tenders/new');

    cy.wait('@departments');
    cy.get('select').should('exist').select(0);
    cy.contains('button', /siguiente/i).click();

    // Subir archivo
    cy.get('input[type="file"][accept="application/pdf"]').selectFile('cypress/fixtures/sample.pdf', { force: true });
    cy.contains('button', /crear y adjuntar/i).click();

    cy.wait('@presign');
    cy.wait('@s3put');
    cy.wait('@validate').its('response.body.ok').should('eq', true);
    cy.wait('@createTender');
    cy.wait('@attachFile');

    cy.contains(/postulación enviada/i).should('be.visible');
  });
});
