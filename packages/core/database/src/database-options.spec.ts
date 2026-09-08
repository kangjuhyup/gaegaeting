import {
  readDatabaseBoolean,
  readDatabaseConnectionOptions,
  type DatabaseConfigReader,
} from './database-options.js';

function config(values: Record<string, unknown>): DatabaseConfigReader {
  return {
    get<T>(key: string, fallback?: T): T {
      return (key in values ? values[key] : fallback) as T;
    },
  };
}

describe('database options', () => {
  const base = {
    DATABASE_HOST: 'postgres.internal',
    DATABASE_PORT: 5432,
    DATABASE_USERNAME: 'account_app',
    DATABASE_PASSWORD: 'not-logged',
    DATABASE_NAME: 'ggt_account',
  };

  it('reads PostgreSQL connection values without ORM options', () => {
    const options = readDatabaseConnectionOptions(config(base));

    expect(options).toEqual({
      host: 'postgres.internal',
      port: 5432,
      user: 'account_app',
      password: 'not-logged',
      database: 'ggt_account',
      ssl: false,
    });
  });

  it.each([
    ['disable', false],
    ['require', { rejectUnauthorized: false }],
    ['verify-full', { rejectUnauthorized: true }],
  ] as const)('maps DATABASE_SSL_MODE=%s to a safe pg ssl option', (mode, ssl) => {
    expect(
      readDatabaseConnectionOptions(config({ ...base, DATABASE_SSL_MODE: mode })),
    ).toMatchObject({ ssl });
  });

  it('rejects an unsupported TLS mode', () => {
    expect(() =>
      readDatabaseConnectionOptions(config({ ...base, DATABASE_SSL_MODE: 'prefer' })),
    ).toThrow('DATABASE_SSL_MODE');
  });

  it('parses boolean environment values', () => {
    expect(readDatabaseBoolean(config({ FLAG: 'false' }), 'FLAG', true)).toBe(false);
    expect(readDatabaseBoolean(config({ FLAG: 'true' }), 'FLAG', false)).toBe(true);
  });

  it('rejects invalid boolean environment values', () => {
    expect(() =>
      readDatabaseBoolean(config({ FLAG: 'sometimes' }), 'FLAG', false),
    ).toThrow('FLAG');
  });
});
