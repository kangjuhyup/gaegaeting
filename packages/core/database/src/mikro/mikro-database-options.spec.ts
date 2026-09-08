import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { ReflectMetadataProvider } from '@mikro-orm/decorators/legacy';
import type { DatabaseConfigReader } from '../database-options.js';
import { buildMikroPostgresOptions } from './mikro-database-options.js';

function config(overrides: Record<string, unknown> = {}): DatabaseConfigReader {
  const values: Record<string, unknown> = {
    DATABASE_HOST: 'localhost',
    DATABASE_PORT: 5432,
    DATABASE_USERNAME: 'postgres',
    DATABASE_PASSWORD: 'postgres',
    DATABASE_NAME: 'account',
    DATABASE_LOG: false,
    DATABASE_SSL_MODE: 'disable',
    ...overrides,
  };
  return {
    get<T>(key: string, fallback?: T): T {
      return (values[key] ?? fallback) as T;
    },
  };
}

describe('buildMikroPostgresOptions', () => {
  it('builds PostgreSQL options without schema mutation', () => {
    class ExampleEntity {}
    const options = buildMikroPostgresOptions(config(), [ExampleEntity]);

    expect(options.driver).toBe(PostgreSqlDriver);
    expect(options.entities).toEqual([ExampleEntity]);
    expect(options.allowGlobalContext).toBe(false);
    expect(options.metadataProvider).toBe(ReflectMetadataProvider);
    expect(options.schemaGenerator?.dropTables).toBe(false);
    expect(options.driverOptions).toEqual({ ssl: false });
  });

  it.each(['DATABASE_SYNCHRONIZE', 'MIKRO_ORM_SCHEMA_UPDATE'])(
    'rejects the unsafe %s flag',
    flag => {
      expect(() =>
        buildMikroPostgresOptions(config({ [flag]: true }), []),
      ).toThrow('Automatic schema mutation is disabled');
    },
  );
});
