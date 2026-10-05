module.exports = {
  extensionsToTreatAsEsm: [".ts"],
  testRegex: ".*\\.spec\\.ts$",
  roots: ["<rootDir>/test"],
  testEnvironment: "node",
  testTimeout: 20000,
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      { useESM: true, tsconfig: "<rootDir>/tsconfig.spec.json" },
    ],
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^@core/database/mikro$": "<rootDir>/../core/database/src/mikro/index.ts",
    "^@core/database$": "<rootDir>/../core/database/src/index.ts",
    "^@core/util/trace$": "<rootDir>/../core/util/src/trace.ts",
    "^@core/(.*)$": "<rootDir>/../core/$1",
  },
};
