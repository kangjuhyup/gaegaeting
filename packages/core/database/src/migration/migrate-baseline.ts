import { pathToFileURL } from 'node:url';
import { readDatabaseConnectionOptions, type DatabaseConfigReader } from '../database-options.js';
import { initialChatSchema } from './baseline/chat-schema.js';
import { runSqlMigrations } from './run-migrations.js';

const environment: DatabaseConfigReader = {
  get<T>(key: string, fallback?: T): T {
    const value = process.env[key];
    return (value === undefined ? fallback : value) as T;
  },
};

export async function runCoreBaselineMigration(schema: 'CHAT'): Promise<void> {
  await runSqlMigrations({
    connection: readDatabaseConnectionOptions(environment),
    historyTable: `${schema.toLowerCase()}_migrations`,
    lockKey: `ggt_${schema.toLowerCase()}:migrations`,
    migrations: [initialChatSchema],
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const schema = process.argv[2]?.toUpperCase();
  if (schema !== 'CHAT') {
    throw new Error('Expected CHAT schema argument');
  }
  await runCoreBaselineMigration(schema);
}
