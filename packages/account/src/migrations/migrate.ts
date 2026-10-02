import { readDatabaseConnectionOptions, runSqlMigrations, type DatabaseConfigReader } from '@core/database';
import { pathToFileURL } from 'node:url';
import { initialAccountSchema } from './0001-account-schema.js';
import { registrationEligibilityMigration } from './registration-eligibility.migration.js';
import { accountSignupMigration } from './account-signup.migration.js';
import { accountSignupConsentMigration } from './account-signup-consent.migration.js';
import { accountSignupIdentityMigration } from './account-signup-identity.migration.js';
import { profileImageReviewMigration } from './profile-image-review.migration.js';

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
    migrations: [initialAccountSchema, registrationEligibilityMigration, accountSignupMigration, accountSignupConsentMigration, accountSignupIdentityMigration, profileImageReviewMigration],
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void runAccountMigrations().catch((error: unknown) => {
    console.error('Account database migration failed', error);
    process.exitCode = 1;
  });
}
