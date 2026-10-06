import {
  readDatabaseConnectionOptions,
  runSqlMigrations,
  type DatabaseConfigReader,
} from "@core/database";
import { pathToFileURL } from "node:url";
import { paymentMigration } from "./payment.migration.js";

const environment: DatabaseConfigReader = {
  get<T>(key: string, fallback?: T): T {
    return (process.env[key] ?? fallback) as T;
  },
};

export async function runPaymentMigrations(): Promise<void> {
  const connection = readDatabaseConnectionOptions(environment);
  await runSqlMigrations({
    connection: process.env.PAYMENT_DATABASE_URL
      ? {
          connectionString: process.env.PAYMENT_DATABASE_URL,
          ssl: connection.ssl,
        }
      : connection,
    historyTable: "payment_sql_migrations",
    lockKey: "gaegaeting:payment:migrations",
    migrations: [paymentMigration],
  });
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  void runPaymentMigrations().catch(() => {
    console.error("Payment database migration failed");
    process.exitCode = 1;
  });
}
