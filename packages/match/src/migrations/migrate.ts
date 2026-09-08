import { readDatabaseConnectionOptions, runSqlMigrations, type DatabaseConfigReader } from '@core/database';
import { pathToFileURL } from 'node:url';
import { initialMatchSchema } from './1788347664586-match-schema.js';

const environment: DatabaseConfigReader = {
  get<T>(key: string, fallback?: T): T {
    const value = process.env[key];
    return (value === undefined ? fallback : value) as T;
  },
};

export async function runMatchMigrations(): Promise<void> {
  await runSqlMigrations({
    connection: readDatabaseConnectionOptions(environment),
    historyTable: 'match_migrations',
    lockKey: 'ggt_match:migrations',
    migrations: [initialMatchSchema],
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void runMatchMigrations().catch((error: unknown) => {
    console.error('Match database migration failed', error);
    process.exitCode = 1;
  });
}
