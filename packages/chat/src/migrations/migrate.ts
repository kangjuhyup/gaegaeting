import 'dotenv/config';
import { readDatabaseConnectionOptions, runSqlMigrations, initialChatSchema, type DatabaseConfigReader } from '@core/database';
import { pathToFileURL } from 'node:url';
import { chatMessagingMigration } from './chat-messaging.migration.js';
const environment: DatabaseConfigReader = {
  get<T>(key: string, fallback?: T): T { return (process.env[key] ?? fallback) as T; },
};
export async function runChatMigrations() {
  await runSqlMigrations({ connection: readDatabaseConnectionOptions(environment),
    historyTable: 'chat_migrations', lockKey: 'ggt_chat:migrations',
    migrations: [initialChatSchema, chatMessagingMigration] });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runChatMigrations();
