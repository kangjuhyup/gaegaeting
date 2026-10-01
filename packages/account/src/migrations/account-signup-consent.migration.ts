import type { SqlMigration } from '@core/database';

export const accountSignupConsentMigration: SqlMigration = {
  timestamp: 1789797600001,
  name: 'AccountSignupConsent1789797600001',
  expectedTables: [],
  statements: [
    { text: `ALTER TABLE "account_signup" ADD COLUMN "terms_version" character varying(64) NOT NULL DEFAULT '2026-09-01'` },
    { text: `ALTER TABLE "account_signup" ADD COLUMN "terms_agreed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()` },
    { text: `ALTER TABLE "account_signup" ALTER COLUMN "terms_version" DROP DEFAULT` },
  ],
};
