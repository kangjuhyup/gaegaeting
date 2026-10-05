import { accountSignupVerificationMigration } from "../../src/migrations/account-signup-verification.migration.js";

describe("가입 인증 이력 마이그레이션", () => {
  test("기존 가입은 변경하지 않고 nullable 인증 이력만 추가하며 CI·DI 원문 열은 만들지 않는다", () => {
    const sql = accountSignupVerificationMigration.statements
      .map((statement) => statement.text)
      .join("\n");
    expect(sql).toContain('ALTER TABLE "account_signup"');
    expect(sql).toContain(
      'ADD COLUMN "verification_provider" character varying(32)',
    );
    expect(sql).toContain(
      'ADD COLUMN "provider_transaction_id" character varying(128)',
    );
    expect(sql).toContain('ADD COLUMN "verified_at" TIMESTAMP WITH TIME ZONE');
    expect(sql).toContain("ck_account_signup_verification");
    expect(sql).not.toMatch(/"ci"|"di"|UPDATE|DELETE|DROP/i);
    expect(sql).not.toContain("DEFAULT");
  });
});
