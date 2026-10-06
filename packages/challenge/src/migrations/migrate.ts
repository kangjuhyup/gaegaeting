import {
  readDatabaseConnectionOptions,
  runSqlMigrations,
  type DatabaseConfigReader,
} from "@core/database";
import { pathToFileURL } from "node:url";
import { initialChallengeSchema } from "./1791158400000-challenge-schema.js";
import { walkingContentSchema } from "./1791187200000-walking-content.js";

const environment: DatabaseConfigReader = {
  get<T>(key: string, fallback?: T): T {
    return (process.env[key] ?? fallback) as T;
  },
};

export async function runChallengeMigrations(): Promise<void> {
  await runSqlMigrations({
    connection: readDatabaseConnectionOptions(environment),
    historyTable: "challenge_migrations",
    lockKey: "ggt_challenge:migrations",
    migrations: [initialChallengeSchema, walkingContentSchema],
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  void runChallengeMigrations().catch((error: unknown) => {
    console.error("Challenge database migration failed", error);
    process.exitCode = 1;
  });
}
