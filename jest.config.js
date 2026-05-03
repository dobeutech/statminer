const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
  collectCoverageFrom: [
    'src/lib/**/*.{ts,tsx}',
    'src/app/api/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**/*',
  ],
  coverageThreshold: {
    global: {
      lines: 40,
      branches: 30,
      functions: 35,
      statements: 40,
    },
  },
};

module.exports = createJestConfig(customJestConfig);
