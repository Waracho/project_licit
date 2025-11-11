describe('ADMIN - Rechazar licitación (UI login + stubs)', () => {
  it('login real, entra a /admin/departments y rechaza la primera', () => {
    const API = Cypress.env('API') || 'http://localhost:8000';

    const depId = 'dep-1';
    const tenderId = 'tr-1';

    const departments = [{ id: depId, name: 'Operaciones' }];

    let tenders = [
      {
        id: tenderId,
        departmentId: depId,
        code: 'TR-OP-20250101-ZZZZ',
        category: 'INTERNET',
        status: 'IN_REVIEW',
        requiredLevels: 2,
        currentLevel: 0,
        createdAt: new Date().toISOString(),
      },
    ];

    cy.intercept('GET', `${API}/departments*`, { statusCode: 200, body: departments }).as('departments');

    cy.intercept('GET', `${API}/tender-requests*`, req => {
      const url = new URL(req.url);
      const qDepId = url.searchParams.get('departmentId');
      req.reply({ statusCode: 200, body: tenders.filter(t => t.departmentId === qDepId) });
    }).as('listTenders');

    cy.intercept('POST', `${API}/tender-requests/${tenderId}/review`, req => {
      const { decision } = req.body || {};
      const curr = tenders.find(t => t.id === tenderId)!;
      if (decision === 'REJECT') {
        curr.status = 'REJECTED';
        req.reply({ statusCode: 200, body: { ...curr } });
      } else {
        req.reply({ statusCode: 400, body: 'bad decision' });
      }
    }).as('reviewReject');

    // Login UI y navegar
    cy.loginAsAdmin();
    cy.visit('/admin/departments');

    cy.wait('@departments');
    cy.get('select').should('be.visible').select('Operaciones');
    cy.wait('@listTenders');

    // stub prompt + confirm correctamente (sin .as en el stub de Sinon)
    cy.window().then(win => cy.stub(win, 'prompt').as('prompt'));
    cy.get('@prompt').invoke('returns', 'No cumple criterios');

    cy.window().then(win => cy.stub(win, 'confirm').as('confirm'));
    cy.get('@confirm').invoke('returns', true);

    cy.contains('table.admdep__table tbody tr', 'TR-OP-20250101-ZZZZ')
      .within(() => cy.contains('button', /^rechazar$/i).click());

    cy.wait('@reviewReject');

    cy.contains('table.admdep__table tbody tr', 'TR-OP-20250101-ZZZZ')
      .within(() => cy.get('.chip').should('contain.text', 'REJECTED'));
  });
});
