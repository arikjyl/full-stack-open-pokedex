const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5001',
    specPattern: 'e2e-tests/cypress/**/*.cy.js',
    supportFile: false,
  },
});
