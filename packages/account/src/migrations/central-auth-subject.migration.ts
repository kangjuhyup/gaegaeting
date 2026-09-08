import { runAccountMigrations } from './migrate.js';
import { pathToFileURL } from 'node:url';

export { runAccountMigrations as migrateCentralAuthSubject };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void runAccountMigrations().catch((error: unknown) => {
    process.stderr.write(`Account database migration failed: ${String(error)}\n`);
    process.exitCode = 1;
  });
}
