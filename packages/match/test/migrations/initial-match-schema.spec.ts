import { initialMatchSchema } from '../../src/migrations/1788347664586-match-schema.js';

describe('initial match PostgreSQL migration', () => {
  test('creates matching tables with PostgreSQL-native types', () => {
    const executed = initialMatchSchema.statements.map(statement => statement.text);

    const sql = executed.join('\n');
    for (const table of ['feed', 'feed_item', 'like', 'pair', 'location', 'main_area']) {
      expect(sql).toContain(`CREATE TABLE "${table}"`);
    }
    expect(sql).toContain('TIMESTAMP WITH TIME ZONE');
    expect(sql).toContain('"active" boolean');
    expect(sql).toContain('point(longitude, latitude)');
    expect(sql).not.toMatch(/`|datetime|tinyint|ST_SRID|ON UPDATE CURRENT_TIMESTAMP/i);
  });
});
