module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/'],
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/src/$1',
    '^@core/auth$': '<rootDir>/../core/auth/dist/src/public-api',
    '^@core/(.*)$': '<rootDir>/../core/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
