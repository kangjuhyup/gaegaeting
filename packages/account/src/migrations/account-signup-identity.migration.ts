import type { SqlMigration } from '@core/database';

export const accountSignupIdentityMigration: SqlMigration = {
  timestamp: 1790859600000,
  name: 'AccountSignupIdentity1790859600000',
  expectedTables: [],
  statements: [{ text: `ALTER TABLE "account_signup"
    ADD COLUMN "name" character varying(50),
    ADD COLUMN "birth_date" TIMESTAMP WITH TIME ZONE,
    ADD COLUMN "gender" character varying(6),
    ADD COLUMN "phone" character varying(32),
    ADD CONSTRAINT "ck_account_signup_identity" CHECK (
      ("name" IS NULL AND "birth_date" IS NULL AND "gender" IS NULL AND "phone" IS NULL)
      OR ("name" IS NOT NULL AND "birth_date" IS NOT NULL AND "gender" IS NOT NULL AND "phone" IS NOT NULL
        AND "gender" IN ('MALE', 'FEMALE'))
    )` }],
};
