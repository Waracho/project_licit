import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:8080',      // tu front (según screenshot)
    specPattern: 'cypress/e2e/**/*.cy.ts',
    video: false,
  },
  env: {
    API: 'http://localhost:8000',          // tu backend FastAPI
  },
});