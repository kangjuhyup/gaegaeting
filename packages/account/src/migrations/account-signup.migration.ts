import type { SqlMigration } from '@core/database';

export const accountSignupMigration: SqlMigration = {
  timestamp: 1789797600000,
  name: 'AccountSignup1789797600000',
  expectedTables: ['account_signup'],
  statements: [{ text: `CREATE TABLE "account_signup" ("id" character(26) NOT NULL, "user_id" character(26) NOT NULL, "di_digest" character(64) NOT NULL, "username" character varying(64) NOT NULL, "auth_issuer" character varying(255) NOT NULL, "auth_subject" character varying(255), "status" character varying(16) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_account_signup" PRIMARY KEY ("id"), CONSTRAINT "uk_account_signup_di_digest" UNIQUE ("di_digest"), CONSTRAINT "ck_account_signup_status" CHECK ("status" IN ('PENDING', 'COMPLETED')))` }],
};
