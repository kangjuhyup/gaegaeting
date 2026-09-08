module.exports = {
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true, tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/', '<rootDir>/test/'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^#app/(.*)$': '<rootDir>/src/$1',
    '^@core/database/testing$': '<rootDir>/../core/database/src/testing/index.ts',
    '^@core/database/mikro$': '<rootDir>/../core/database/src/mikro/index.ts',
    '^@core/database$': '<rootDir>/../core/database/src/index.ts',
    '^@core/(.*)$': '<rootDir>/../core/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
};
