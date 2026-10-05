import type { SqlMigration } from "@core/database";

export const accountSignupVerificationMigration: SqlMigration = {
  timestamp: 1791028800000,
  name: "AccountSignupVerification1791028800000",
  expectedTables: [],
  statements: [
    {
      text: `ALTER TABLE "account_signup"
    ADD COLUMN "verification_provider" character varying(32),
    ADD COLUMN "provider_transaction_id" character varying(128),
    ADD COLUMN "verified_at" TIMESTAMP WITH TIME ZONE,
    ADD CONSTRAINT "ck_account_signup_verification" CHECK (
      ("verification_provider" IS NULL AND "provider_transaction_id" IS NULL AND "verified_at" IS NULL)
      OR ("verification_provider" IS NOT NULL AND "provider_transaction_id" IS NOT NULL AND "verified_at" IS NOT NULL)
    )`,
    },
  ],
};
