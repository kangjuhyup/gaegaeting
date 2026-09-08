import type { ClientConfig, QueryResult } from 'pg';
import { runSqlMigrations } from './run-migrations.js';
import { schemaManifestDigest } from './schema-manifest.js';
import type { MigrationClient, SqlMigration, SqlMigrationRunnerOptions } from './sql-migration.js';

function result<Row extends Record<string, unknown>>(rows: Row[]): QueryResult<Row> {
  return { rows, rowCount: rows.length, command: '', oid: 0, fields: [] };
}

class FakeClient implements MigrationClient {
  readonly events: string[] = [];
  historyExists = false;
  history: Array<{ timestamp: string; name: string }> = [];
  tables: string[] = [];
  catalog: string[] = [];
  failOn = '';

  async connect(): Promise<void> { this.events.push('connect'); }

  async query<Row extends Record<string, unknown>>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<QueryResult<Row>> {
    const compact = text.replace(/\s+/g, ' ').trim();
    if (this.failOn && compact.includes(this.failOn)) throw new Error('statement failed');
    if (compact.includes('pg_advisory_lock')) this.events.push(`lock:${values[0]}`);
    else if (compact.includes('pg_advisory_unlock')) this.events.push(`unlock:${values[0]}`);
    else if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(compact)) this.events.push(compact.toLowerCase());
    else if (compact.includes('to_regclass')) return result([{ exists: this.historyExists }] as Row[]);
    else if (compact.startsWith('select "timestamp", "name"')) return result(this.history as Row[]);
    else if (compact.includes('from information_schema.tables')) return result(this.tables.map(table_name => ({ table_name })) as Row[]);
    else if (compact.includes('select kind, table_name, object_name, definition')) {
      return result(this.catalog.map(entry => {
        const [kind, table_name, object_name, ...definition] = entry.split('|');
        return { kind, table_name, object_name, definition: definition.join('|') };
      }) as Row[]);
    } else if (compact.startsWith('create table if not exists')) {
      this.historyExists = true;
      this.events.push('create-history');
    } else if (compact.startsWith('insert into')) {
      this.history.push({ timestamp: String(values[0]), name: String(values[1]) });
      this.events.push(`history:${values[1]}`);
    } else this.events.push(`sql:${compact}`);
    return result([] as Row[]);
  }

  async end(): Promise<void> { this.events.push('end'); }
}

const migration: SqlMigration = {
  timestamp: 100,
  name: 'InitialSchema100',
  statements: [{ text: 'CREATE TABLE example (id integer primary key)' }],
  expectedTables: ['example'],
  manifest: { entries: ['column|example|id|integer|not_null=true|default=|generated='] },
};

function options(client: FakeClient, migrations = [migration]): SqlMigrationRunnerOptions {
  return {
    connection: {} as ClientConfig,
    historyTable: 'app_migrations',
    lockKey: 'app:migrations',
    migrations,
    createClient: () => client,
  };
}

describe('runSqlMigrations', () => {
  it('applies an unapplied migration transactionally', async () => {
    const client = new FakeClient();
    await runSqlMigrations(options(client));
    expect(client.events).toEqual([
      'connect', 'lock:app:migrations', 'begin', 'create-history',
      'sql:CREATE TABLE example (id integer primary key)',
      'history:InitialSchema100', 'commit', 'unlock:app:migrations', 'end',
    ]);
  });

  it('skips DDL when matching history exists', async () => {
    const client = new FakeClient();
    client.historyExists = true;
    client.history = [{ timestamp: '100', name: 'InitialSchema100' }];
    await runSqlMigrations(options(client));
    expect(client.events).toEqual(['connect', 'lock:app:migrations', 'unlock:app:migrations', 'end']);
  });

  it('rejects a known timestamp with a different name', async () => {
    const client = new FakeClient();
    client.historyExists = true;
    client.history = [{ timestamp: '100', name: 'WrongName100' }];
    await expect(runSqlMigrations(options(client))).rejects.toThrow('history mismatch');
    expect(client.events.slice(-2)).toEqual(['unlock:app:migrations', 'end']);
  });

  it('rejects unknown migration history', async () => {
    const client = new FakeClient();
    client.historyExists = true;
    client.history = [{ timestamp: '200', name: 'FutureSchema200' }];
    await expect(runSqlMigrations(options(client))).rejects.toThrow('unknown migration');
  });

  it('rolls back and cleans up when a statement fails', async () => {
    const client = new FakeClient();
    client.failOn = 'CREATE TABLE example';
    await expect(runSqlMigrations(options(client))).rejects.toThrow('statement failed');
    expect(client.events).toEqual([
      'connect', 'lock:app:migrations', 'begin', 'create-history', 'rollback',
      'unlock:app:migrations', 'end',
    ]);
  });

  it('adopts an exact existing schema without replaying DDL', async () => {
    const client = new FakeClient();
    client.tables = ['example'];
    client.catalog = [...migration.manifest!.entries];
    await runSqlMigrations(options(client));
    expect(client.events).toEqual([
      'connect', 'lock:app:migrations', 'begin', 'create-history',
      'history:InitialSchema100', 'commit', 'unlock:app:migrations', 'end',
    ]);
  });

  it('adopts an exact existing schema from its frozen digest', async () => {
    const client = new FakeClient();
    client.tables = ['example'];
    client.catalog = [...migration.manifest!.entries];
    await runSqlMigrations(options(client, [{
      ...migration,
      manifest: { sha256: schemaManifestDigest(client.catalog) },
    }]));
    expect(client.events).not.toContain('sql:CREATE TABLE example (id integer primary key)');
    expect(client.events).toContain('history:InitialSchema100');
  });

  it('refuses a partial existing schema without history writes', async () => {
    const client = new FakeClient();
    client.tables = ['example'];
    await expect(runSqlMigrations(options(client, [{ ...migration, expectedTables: ['example', 'second'] }]))).rejects.toThrow('partial schema');
    expect(client.events).not.toContain('create-history');
  });

  it('refuses catalog drift without history writes', async () => {
    const client = new FakeClient();
    client.tables = ['example'];
    client.catalog = ['column|example|id|bigint|not_null=true|default=|generated='];
    await expect(runSqlMigrations(options(client))).rejects.toThrow('schema drift');
    expect(client.events).not.toContain('create-history');
  });

  it('rejects an unsafe history identifier before connecting', async () => {
    const client = new FakeClient();
    await expect(runSqlMigrations({ ...options(client), historyTable: 'bad;drop' })).rejects.toThrow('historyTable');
    expect(client.events).toEqual([]);
  });
});
