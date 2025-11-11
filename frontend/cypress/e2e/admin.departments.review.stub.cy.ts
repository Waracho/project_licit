describe('ADMIN - Descargar y aprobar licitaciones (UI login + stubs)', () => {
  it('login real, entra a /admin/departments, descarga y aprueba 2 veces', () => {
    const API = Cypress.env('API') || 'http://localhost:8000';

    // ---- Estado controlado ----
    const adminId = 'u-admin-1';
    const depId = 'dep-1';
    const tenderId = 'tr-1';

    const departments = [
      { id: depId, name: 'Operaciones' },
      { id: 'dep-2', name: 'Finanzas' },
    ];

    let tenders = [
      {
        id: tenderId,
        departmentId: depId,
        code: 'TR-OP-20250101-ABCD',
        category: 'ELECTRICAL',
        status: 'IN_REVIEW',
        requiredLevels: 2,
        currentLevel: 0,
        createdAt: new Date().toISOString(),
      },
    ];

    const filesForTender = [
      { id: 'f1', tenderRequestId: tenderId, s3Key: 'uploads/sample.pdf', fileName: 'sample.pdf', contentType: 'application/pdf', size: 12345 },
    ];

    const presignGet = { url: 'https://example.com/presigned-get.pdf' };

    // ---- Intercepts (siempre contra API) ----
    cy.intercept('GET', `${API}/departments*`, { statusCode: 200, body: departments }).as('departments');

    cy.intercept('GET', `${API}/tender-requests*`, req => {
      const url = new URL(req.url);
      const qDepId = url.searchParams.get('departmentId');
      req.reply({ statusCode: 200, body: tenders.filter(t => t.departmentId === qDepId) });
    }).as('listTenders');

    cy.intercept('GET', `${API}/tender-requests/${tenderId}/files`, {
      statusCode: 200, body: filesForTender,
    }).as('listFiles');

    cy.intercept('GET', `${API}/uploads/s3-presign-get*`, {
      statusCode: 200, body: presignGet,
    }).as('presignGet');

    cy.intercept('POST', `${API}/tender-requests/${tenderId}/review`, req => {
      const { decision, actorUserId } = req.body || {};
      // el componente manda user.id real; no lo forzamos aquí
      const curr = tenders.find(t => t.id === tenderId)!;

      if (decision === 'APPROVE') {
        curr.currentLevel = Math.min(curr.currentLevel + 1, curr.requiredLevels);
        if (curr.currentLevel >= curr.requiredLevels) curr.status = 'APPROVED';
        req.reply({ statusCode: 200, body: { ...curr } });
      } else {
        req.reply({ statusCode: 400, body: 'bad decision' });
      }
    }).as('review');

    // ---- Login real por UI y navegación a Admin ----
    cy.loginAsAdmin(); // usa admin@local.cl / admin1234 dentro (tu comando)

    // Ir a la pantalla (vía navbar o directo)
    cy.visit('/admin/departments');

    cy.wait('@departments');
    cy.get('select').should('be.visible').select('Operaciones');
    cy.wait('@listTenders');

    // ---- Descargar archivo (stub window.open) ----
    cy.window().then(win =>
      // devuelve el stub para poder alias-earlo con Cypress (evita el error .as en Sinon)
      cy.stub(win, 'open').as('winOpen')
    );

    cy.contains('table.admdep__table tbody tr', 'TR-OP-20250101-ABCD')
      .within(() => cy.contains('button', /descargar/i).click());

    cy.wait('@listFiles');
    cy.wait('@presignGet');
    cy.get('@winOpen').should('have.been.called');

    // ---- Aprobar dos veces (stub prompt) ----
    cy.window().then(win => cy.stub(win, 'prompt').as('prompt'));
    cy.get('@prompt').invoke('returns', 'OK admin');

    // 1ª aprobación: 0/2 -> 1/2
    cy.contains('table.admdep__table tbody tr', 'TR-OP-20250101-ABCD')
      .within(() => {
        cy.contains('td.mono', '0/2').should('exist');
        cy.contains('button', /^aprobar$/i).click();
      });
    cy.wait('@review');
    cy.contains('table.admdep__table tbody tr', 'TR-OP-20250101-ABCD')
      .within(() => cy.contains('td.mono', '1/2').should('exist'));

    // 2ª aprobación: 1/2 -> 2/2 y status APPROVED
    cy.contains('table.admdep__table tbody tr', 'TR-OP-20250101-ABCD')
      .within(() => cy.contains('button', /^aprobar$/i).click());
    cy.wait('@review');
    cy.contains('table.admdep__table tbody tr', 'TR-OP-20250101-ABCD')
      .within(() => {
        cy.contains('td.mono', '2/2').should('exist');
        cy.get('.chip').should('contain.text', 'APPROVED');
      });
  });
});
