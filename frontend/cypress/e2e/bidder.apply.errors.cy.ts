// cypress/e2e/bidder.apply.errors.cy.ts
describe('BIDDER - errores de red (stub)', () => {
  beforeEach(() => {
    cy.stubAuthRefresh('BIDDER', 'u-bid-1');
    cy.fixture('departments.json').then((deps) => {
      cy.intercept('GET', '**/departments*', { statusCode: 200, body: deps }).as('departments');
    });
  });

  function goToStep2() {
    cy.seedSessionWithRole('BIDDER', {}, '/bidder/tenders/new');
    cy.wait('@departments');
    cy.get('select').select(0);
    cy.contains('button', /siguiente/i).click();
    cy.get('input[type="file"][accept="application/pdf"]').selectFile('cypress/fixtures/sample.pdf', { force: true });
  }

  it('presign 500 -> muestra error', () => {
    cy.intercept('GET', '**/uploads/s3-presign*', { statusCode: 500, body: { message: 'boom' } }).as('presign500');

    goToStep2();
    cy.contains('button', /crear y adjuntar/i).click();

    cy.wait('@presign500');
    cy.contains(/no se pudo completar|error/i).should('be.visible');
  });

  it('PUT S3 403 -> muestra error', () => {
    cy.fixture('presign.json').then((presign) => {
      cy.intercept('GET', '**/uploads/s3-presign*', { statusCode: 200, body: presign }).as('presign');
      cy.intercept('PUT', presign.uploadUrl, { statusCode: 403, body: 'Forbidden' }).as('s3put403');
    });

    goToStep2();
    cy.contains('button', /crear y adjuntar/i).click();

    cy.wait('@presign');
    cy.wait('@s3put403');
    cy.contains(/fallo.*put|403|forbidden|no se pudo/i).should('be.visible');
  });

  it('validate 500 -> muestra error y no crea', () => {
    cy.fixture('presign.json').then((presign) => {
      cy.intercept('GET', '**/uploads/s3-presign*', { statusCode: 200, body: presign }).as('presign');
      cy.intercept('PUT', presign.uploadUrl, { statusCode: 200, body: '' }).as('s3put');
    });
    cy.intercept('POST', '**/validator/check-pdf-structure', { statusCode: 500, body: { message: 'error' } }).as('validate500');
    cy.intercept('POST', '**/tender-requests').as('createShouldNotHappen');

    goToStep2();
    cy.contains('button', /crear y adjuntar/i).click();

    cy.wait('@presign');
    cy.wait('@s3put');
    cy.wait('@validate500');

    cy.contains(/no se pudo completar|error/i).should('be.visible');
    cy.get('@createShouldNotHappen.all').then((calls) => expect(calls.length).to.eq(0));
  });

  it('create 500 -> muestra error y no adjunta', () => {
    cy.fixture('presign.json').then((presign) => {
      cy.intercept('GET', '**/uploads/s3-presign*', { statusCode: 200, body: presign }).as('presign');
      cy.intercept('PUT', presign.uploadUrl, { statusCode: 200, body: '' }).as('s3put');
    });
    cy.intercept('POST', '**/validator/check-pdf-structure', { statusCode: 200, body: { ok: true, checks: {} } }).as('validate');
    cy.intercept('POST', '**/tender-requests', { statusCode: 500, body: { message: 'fail create' } }).as('create500');
    cy.intercept('POST', '**/tender-requests/*/files').as('attachShouldNotHappen');

    goToStep2();
    cy.contains('button', /crear y adjuntar/i).click();

    cy.wait('@presign');
    cy.wait('@s3put');
    cy.wait('@validate');
    cy.wait('@create500');

    cy.contains(/no se pudo completar|error/i).should('be.visible');
    cy.get('@attachShouldNotHappen.all').then((calls) => expect(calls.length).to.eq(0));
  });

  it('attach 500 -> muestra error (tender creada)', () => {
    cy.fixture('presign.json').then((presign) => {
      cy.intercept('GET', '**/uploads/s3-presign*', { statusCode: 200, body: presign }).as('presign');
      cy.intercept('PUT', presign.uploadUrl, { statusCode: 200, body: '' }).as('s3put');
    });
    cy.intercept('POST', '**/validator/check-pdf-structure', { statusCode: 200, body: { ok: true, checks: {} } }).as('validate');
    cy.fixture('tender.create.json').then((created) => {
      cy.intercept('POST', '**/tender-requests', { statusCode: 201, body: created }).as('createTender');
      cy.intercept('POST', `**/tender-requests/${created.id}/files`, { statusCode: 500, body: { message: 'attach fail' } }).as('attach500');
    });

    goToStep2();
    cy.contains('button', /crear y adjuntar/i).click();

    cy.wait('@presign');
    cy.wait('@s3put');
    cy.wait('@validate');
    cy.wait('@createTender');
    cy.wait('@attach500');

    cy.contains(/no se pudo completar|error/i).should('be.visible');
  });
});
