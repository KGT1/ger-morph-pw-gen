/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  // TypeScript configuration
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  // Sources import './X.js' (needed for Node ESM and bundlers); map to the .ts file in tests
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      diagnostics: {
        ignoreCodes: ['TS151001']
      }
    }]
  },

  // Test patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.ts'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/'
  ],

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'clover'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/coverage/'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Performance and debugging
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  maxWorkers: '50%'
};
