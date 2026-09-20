// vitest.config.js — CommonJS form (matches package.json — no "type":"module")
// Vitest auto-detects: this file uses require() / module.exports.

const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.mjs', 'tests/**/*.test.js'],
    globals: false,
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.js'],
      exclude: ['src/**/*.test.js'],
    },
  },
});
