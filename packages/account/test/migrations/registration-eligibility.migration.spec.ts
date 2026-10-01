import { registrationEligibilityMigration } from '../../src/migrations/registration-eligibility.migration.js';

describe('registration eligibility migration', () => {
  test('stores digests and bindings without CI or raw DI columns', () => {
    const sql = registrationEligibilityMigration.statements.map(statement => statement.text).join('\n');
    expect(sql).toContain('CREATE TABLE "registration_eligibility"');
    expect(sql).toContain('UNIQUE ("di_digest")');
    expect(sql).toContain('UNIQUE ("handoff_digest")');
    expect(sql).toContain('UNIQUE ("attempt_id")');
    expect(sql).not.toMatch(/"ci"|"di"\s/);
    expect(sql).toContain('CHECK ("status" IN (\'ISSUED\', \'CLAIMED\', \'USED\'))');
  });
});
