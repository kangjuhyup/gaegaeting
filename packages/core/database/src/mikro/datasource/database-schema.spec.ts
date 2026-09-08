import { DatabaseSchema } from '../../database-schema.js';
import {
  MIKRO_CHAT_ENTITIES,
  MIKRO_MATCH_ENTITIES,
  MIKRO_USER_ENTITIES,
  getMikroEntitiesBySchema,
} from './database-schema.js';

describe('MikroORM entity registry', () => {
  it('rejects an empty schema selection', () => {
    expect(() => getMikroEntitiesBySchema([])).toThrow(
      'At least one database schema is required',
    );
  });

  it('exposes immutable explicit group arrays', () => {
    expect(Object.isFrozen(MIKRO_USER_ENTITIES)).toBe(true);
    expect(MIKRO_USER_ENTITIES).toHaveLength(6);
    expect(Object.isFrozen(MIKRO_MATCH_ENTITIES)).toBe(true);
    expect(MIKRO_MATCH_ENTITIES).toHaveLength(6);
    expect(Object.isFrozen(MIKRO_CHAT_ENTITIES)).toBe(true);
    expect(MIKRO_CHAT_ENTITIES).toHaveLength(6);
  });

  it('deduplicates entities when a schema is selected repeatedly', () => {
    const once = getMikroEntitiesBySchema([DatabaseSchema.USER]);
    const repeated = getMikroEntitiesBySchema([
      DatabaseSchema.USER,
      DatabaseSchema.USER,
    ]);

    expect(repeated).toEqual(once);
  });
});
