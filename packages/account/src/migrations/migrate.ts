import { readDatabaseConnectionOptions, runSqlMigrations, type DatabaseConfigReader } from '@core/database';
import { pathToFileURL } from 'node:url';
import { initialAccountSchema } from './0001-account-schema.js';

const environment: DatabaseConfigReader = {
  get<T>(key: string, fallback?: T): T {
    const value = process.env[key];
    return (value === undefined ? fallback : value) as T;
  },
};

export async function runAccountMigrations(): Promise<void> {
  await runSqlMigrations({
    connection: readDatabaseConnectionOptions(environment),
    historyTable: 'account_migrations',
    lockKey: 'ggt_account:migrations',
    migrations: [initialAccountSchema],
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void runAccountMigrations().catch((error: unknown) => {
    console.error('Account database migration failed', error);
    process.exitCode = 1;
  });
}
