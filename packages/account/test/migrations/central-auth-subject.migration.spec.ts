import { initialAccountSchema } from '../../src/migrations/0001-account-schema.js';

describe('initial account PostgreSQL migration', () => {
  test('creates the tenant and subject mapping with PostgreSQL uniqueness', () => {
    const executed = initialAccountSchema.statements.map(statement => statement.text);

    const sql = executed.join('\n');
    const createSubject = executed.find((statement) =>
      statement.includes('CREATE TABLE "external_user_subject"'),
    );

    expect(sql).toContain('CREATE TABLE "external_user_subject"');
    expect(sql).toContain(
      'CONSTRAINT "uk_external_user_subject_tenant_sub" UNIQUE ("tenant_id", "subject")',
    );
    expect(createSubject).toContain('TIMESTAMP WITH TIME ZONE');
    expect(sql).not.toMatch(/`|datetime|tinyint|ON UPDATE CURRENT_TIMESTAMP/i);
  });
});
