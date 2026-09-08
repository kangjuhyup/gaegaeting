import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = async (path) => {
  try {
    return await readFile(new URL(path, root), 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
};

const assertPresent = (source, path) => {
  assert.ok(source !== null, `required PostgreSQL artifact is missing: ${path}`);
};

const assertNoMatch = (source, pattern, path) => {
  assert.ok(!pattern.test(source), `active MySQL contract remains in ${path}`);
};

test('active runtime dependencies contain no MySQL driver', async () => {
  const paths = [
    'package.json',
    'packages/core/database/package.json',
    'packages/account/package.json',
    'packages/match/package.json',
  ];

  for (const path of paths) {
    const source = await read(path);
    assertPresent(source, path);
    assertNoMatch(source, /mysql2/i, path);
  }
});

test('application database configuration is PostgreSQL-only', async () => {
  const paths = [
    'packages/core/database/src/database.module.ts',
    'packages/core/database/src/database-options.ts',
    'packages/core/database/src/mikro/mikro-database-options.ts',
    'packages/account/src/migrations/0001-account-schema.ts',
    'packages/match/src/migrations/1788347664586-match-schema.ts',
  ];
  const forbidden = /(?:type:\s*["']mysql["']|DB_DRIVER:\s*mysql|auth-mysql|mysql-master|\b3306\b|mysql2\/promise)/i;

  for (const path of paths) {
    const source = await read(path);
    assertPresent(source, path);
    assertNoMatch(source, forbidden, path);
  }

  const databaseModule = await read('packages/core/database/src/database.module.ts');
  const databaseOptions = await read('packages/core/database/src/mikro/mikro-database-options.ts');
  assert.ok(databaseModule.includes('buildMikroPostgresOptions'), 'shared database module does not use the PostgreSQL-only option builder');
  assert.ok(databaseOptions.includes('PostgreSqlDriver'), 'shared database option builder is not PostgreSQL-only');
  assert.ok(databaseOptions.includes('Automatic schema mutation is disabled'), 'shared database option builder does not fail closed on schema mutation');
});
