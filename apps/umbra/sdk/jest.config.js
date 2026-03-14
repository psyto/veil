/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { diagnostics: false }],
  },
  moduleNameMapper: {
    '^@fabrknt/veil-core$': '<rootDir>/../../../packages/core/src/index.ts',
    '^@fabrknt/veil-orders$': '<rootDir>/../../../packages/orders/src/index.ts',
  },
};
