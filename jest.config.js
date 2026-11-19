module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.jsx'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/types/**'],
  coverageReporters: ['text', 'json-summary', 'lcov'],
  coverageThreshold: {
    global: { lines: 80, statements: 80, functions: 80, branches: 80 },
  },
};
