describe('Departments (stub con login real)', () => {
  it('entra a /admin/departments, stub de API y muestra/guarda respuesta', () => {
    const API = Cypress.env('API') || 'http://localhost:8000';

    // 1) login real (cacheado con cy.session)
    cy.loginAsAdmin();

    // 2) stub solo la API del backend (¡antes de visitar!)
    cy.intercept('GET', `${API}/departments*`, {
      statusCode: 200,
      body: [
        { id: 'd1', name: 'Adquisiciones' },
        { id: 'd2', name: 'Finanzas' },
        { id: 'd3', name: 'Operaciones' },
      ],
    }).as('getDepts');

    // 3) ir a la pantalla (ya no rebota a /login porque hay sesión real)
    cy.visit('/admin/departments');

    // 4) esperar fetch y mostrar/guardar lo recibido
    cy.wait('@getDepts', { timeout: 15000 }).then(({ request, response }) => {
      cy.log(`URL: ${request.url}`);
      cy.log(`STATUS: ${response?.statusCode}`);
      cy.log(`COUNT: ${Array.isArray(response?.body) ? response!.body.length : 'n/a'}`);

      // ver completo en la consola del navegador (abre DevTools en modo open)
      // en `cypress run` lo verás en la salida de consola
      console.log('DEPARTMENTS RESPONSE:', response?.body);

      // guardar a archivo (queda en cypress/artifacts/)
      cy.writeFile('cypress/artifacts/departments_stub_response.json', response?.body || {});
    });

    // 5) asserts mínimos de UI
    cy.contains(/adquisiciones/i).should('be.visible');
    cy.contains(/finanzas/i).should('be.visible');
    cy.contains(/operaciones/i).should('be.visible');
  });
});
