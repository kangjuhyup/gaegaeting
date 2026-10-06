import type { SqlMigration } from "@core/database";

export const accountSocialSignupMigration: SqlMigration = {
  timestamp: 1791158400000,
  name: "AccountSocialSignup1791158400000",
  expectedTables: [],
  statements: [
    {
      text: `ALTER TABLE "account_signup"
    ALTER COLUMN "username" DROP NOT NULL,
    ADD COLUMN "signup_method" character varying(16) NOT NULL DEFAULT 'PASSWORD',
    ADD COLUMN "external_identity_digest" character(64),
    ADD CONSTRAINT "uk_account_signup_external_identity_digest" UNIQUE ("external_identity_digest"),
    ADD CONSTRAINT "ck_account_signup_method" CHECK (
      ("signup_method" = 'PASSWORD' AND "username" IS NOT NULL AND "external_identity_digest" IS NULL)
      OR ("signup_method" = 'SOCIAL' AND "username" IS NULL AND "external_identity_digest" ~ '^[a-f0-9]{64}$' AND "external_identity_digest" IS NOT NULL)
    )`,
    },
  ],
};
