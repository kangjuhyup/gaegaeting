module.exports = {
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true }],
  },
  transformIgnorePatterns: [
    'node_modules/',
    '<rootDir>/../core/.*/dist/',
  ],
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^#app/(.*)$': '<rootDir>/src/$1',
    '^@core/database/mikro$': '<rootDir>/../core/database/src/mikro/index.ts',
    '^@core/(.*)$': '<rootDir>/../core/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
  testTimeout: 30000,
  detectOpenHandles: true,
  verbose: true,
};
