import {
  buildMikroPostgresOptions,
  getMikroEntitiesBySchema,
  MikroORM,
  PostgreSqlDriver,
} from '@core/database/mikro';
import {
  readDatabaseConnectionOptions,
  runSqlMigrations,
  DatabaseSchema,
  type DatabaseConfigReader,
} from '@core/database';
import { initialMatchSchema } from '../../../migrations/1788347664586-match-schema.js';

const environment: DatabaseConfigReader = {
  get<T>(key: string, fallback?: T): T {
    const value = process.env[key];
    return (value === undefined ? fallback : value) as T;
  },
};

export async function createTestOrm(): Promise<MikroORM<PostgreSqlDriver>> {
  const required = [
    'DATABASE_HOST',
    'DATABASE_USERNAME',
    'DATABASE_PASSWORD',
    'DATABASE_NAME',
  ];
  const missing = required.filter(name => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing test database variables: ${missing.join(', ')}`);
  }

  await runSqlMigrations({
    connection: readDatabaseConnectionOptions(environment),
    historyTable: 'match_migrations',
    lockKey: 'ggt_match:test-migrations',
    migrations: [initialMatchSchema],
  });

  return MikroORM.init<PostgreSqlDriver>({
    ...buildMikroPostgresOptions(
      environment,
      getMikroEntitiesBySchema([DatabaseSchema.MATCH]),
    ),
    allowGlobalContext: true,
  });
}
