declare namespace Cypress {
  interface Chainable {
    loginUI(): Chainable<void>;
    seedSession(user?: Record<string, unknown>): Chainable<void>;
  }

  interface Chainable {
    loginAsAdmin(): Chainable<void>;
  }
}