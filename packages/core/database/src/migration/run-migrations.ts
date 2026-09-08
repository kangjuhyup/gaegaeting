import assert from 'node:assert/strict';
import { Client } from 'pg';
import { readSchemaManifest, schemaManifestDigest } from './schema-manifest.js';
import type { MigrationClient, SqlMigration, SqlMigrationRunnerOptions } from './sql-migration.js';

const IDENTIFIER = /^[a-z][a-z0-9_]*$/;

function createDefaultClient(connection: SqlMigrationRunnerOptions['connection']): MigrationClient {
  const client = new Client(connection);
  return {
    async connect() {
      await client.connect();
    },
    async query<Row extends Record<string, unknown>>(text: string, values?: readonly unknown[]) {
      return client.query<Row>(text, values ? [...values] : undefined);
    },
    async end() {
      await client.end();
    },
  };
}

async function historyExists(client: MigrationClient, table: string): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>(
    'select to_regclass($1) is not null as exists',
    [`public.${table}`],
  );
  return result.rows[0]?.exists ?? false;
}

async function readHistory(client: MigrationClient, table: string) {
  if (!(await historyExists(client, table))) return [];
  const result = await client.query<{ timestamp: string; name: string }>(
    `select "timestamp", "name" from "${table}" order by "timestamp" asc`,
  );
  return result.rows;
}

async function existingTables(client: MigrationClient, tables: readonly string[]) {
  if (tables.length === 0) return [];
  const result = await client.query<{ table_name: string }>(
    `select table_name from information_schema.tables
      where table_schema = 'public' and table_name = any($1::text[])
      order by table_name`,
    [[...tables]],
  );
  return result.rows.map(row => row.table_name);
}

function assertKnownHistory(
  history: readonly { timestamp: string; name: string }[],
  migrations: readonly SqlMigration[],
): void {
  const known = new Map(migrations.map(item => [String(item.timestamp), item.name]));
  for (const row of history) {
    const expected = known.get(String(row.timestamp));
    if (!expected) throw new Error(`Migration history contains unknown migration ${row.timestamp}/${row.name}`);
    if (expected !== row.name) throw new Error(`Migration history mismatch for ${row.timestamp}: expected ${expected}, received ${row.name}`);
  }
}

async function shouldAdopt(client: MigrationClient, migration: SqlMigration) {
  const present = await existingTables(client, migration.expectedTables);
  if (present.length === 0) return false;
  if (present.length !== migration.expectedTables.length) {
    throw new Error(`Cannot adopt partial schema for ${migration.name}`);
  }
  if (!migration.manifest) throw new Error(`Schema manifest is required to adopt ${migration.name}`);
  const actual = await readSchemaManifest(client, migration.expectedTables);
  if ('entries' in migration.manifest) {
    assert.deepEqual(actual.entries, migration.manifest.entries, `Cannot adopt schema drift for ${migration.name}`);
  } else {
    assert.equal(
      schemaManifestDigest(actual.entries),
      migration.manifest.sha256,
      `Cannot adopt schema drift for ${migration.name}`,
    );
  }
  return true;
}

async function applyMigration(
  client: MigrationClient,
  historyTable: string,
  migration: SqlMigration,
): Promise<void> {
  const adopt = await shouldAdopt(client, migration);
  await client.query('BEGIN');
  try {
    await client.query(
      `create table if not exists "${historyTable}" ("id" serial primary key, "timestamp" bigint not null, "name" varchar not null)`,
    );
    if (!adopt) {
      for (const statement of migration.statements) {
        await client.query(statement.text, statement.values);
      }
    }
    await client.query(
      `insert into "${historyTable}" ("timestamp", "name") values ($1, $2)`,
      [migration.timestamp, migration.name],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

export async function runSqlMigrations(options: SqlMigrationRunnerOptions): Promise<void> {
  if (!IDENTIFIER.test(options.historyTable)) {
    throw new Error('historyTable must be a lowercase PostgreSQL identifier');
  }
  const migrations = [...options.migrations].sort((left, right) => left.timestamp - right.timestamp);
  const client = options.createClient?.(options.connection) ?? createDefaultClient(options.connection);
  await client.connect();
  let locked = false;
  try {
    await client.query('select pg_advisory_lock(hashtext($1))', [options.lockKey]);
    locked = true;
    const history = await readHistory(client, options.historyTable);
    assertKnownHistory(history, migrations);
    const applied = new Set(history.map(row => `${row.timestamp}/${row.name}`));
    for (const migration of migrations) {
      if (applied.has(`${migration.timestamp}/${migration.name}`)) continue;
      await applyMigration(client, options.historyTable, migration);
    }
  } finally {
    if (locked) await client.query('select pg_advisory_unlock(hashtext($1))', [options.lockKey]);
    await client.end();
  }
}
