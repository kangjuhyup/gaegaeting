import type { SqlMigration } from '@core/database';

export const registrationEligibilityMigration: SqlMigration = {
  timestamp: 1788871200000,
  name: 'RegistrationEligibility1788871200000',
  expectedTables: ['registration_eligibility'],
  statements: [
    { text: `CREATE TABLE "registration_eligibility" ("id" character(26) NOT NULL, "user_id" character(26) NOT NULL, "provider" character varying(32) NOT NULL, "provider_transaction_id" character varying(128) NOT NULL, "di_digest" character(64) NOT NULL, "di_key_version" smallint NOT NULL, "adult" boolean NOT NULL, "tenant_id" character varying(128) NOT NULL, "client_id" character varying(128) NOT NULL, "terms_version" character varying(64) NOT NULL, "terms_agreed_at" TIMESTAMP WITH TIME ZONE NOT NULL, "handoff_digest" character(64) NOT NULL, "status" character varying(16) NOT NULL, "attempt_id" character varying(128), "claimed_until" TIMESTAMP WITH TIME ZONE, "auth_issuer" character varying(255), "auth_subject" character varying(255), "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_registration_eligibility" PRIMARY KEY ("id"), CONSTRAINT "uk_registration_eligibility_provider_tx" UNIQUE ("provider_transaction_id"), CONSTRAINT "uk_registration_eligibility_di_digest" UNIQUE ("di_digest"), CONSTRAINT "uk_registration_eligibility_handoff_digest" UNIQUE ("handoff_digest"), CONSTRAINT "uk_registration_eligibility_attempt_id" UNIQUE ("attempt_id"), CONSTRAINT "ck_registration_eligibility_status" CHECK ("status" IN ('ISSUED', 'CLAIMED', 'USED')))` },
    { text: `CREATE UNIQUE INDEX "uk_registration_eligibility_auth_subject" ON "registration_eligibility" ("auth_issuer", "auth_subject") WHERE "auth_issuer" IS NOT NULL AND "auth_subject" IS NOT NULL` },
  ],
};
