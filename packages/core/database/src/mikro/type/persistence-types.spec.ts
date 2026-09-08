import { NumberArrayType } from './number-array.type.js';
import { ValueEnumType } from './value-enum.type.js';

describe('MikroORM custom types', () => {
  it('round-trips comma-separated numeric text', () => {
    const type = new NumberArrayType();

    expect(type.convertToDatabaseValue([1, 2, 10], undefined as never))
      .toBe('1,2,10');
    expect(type.convertToJSValue('1,2,10', undefined as never))
      .toEqual([1, 2, 10]);
    expect(type.convertToJSValue('', undefined as never)).toEqual([]);
    expect(type.getColumnType(undefined as never, undefined as never))
      .toBe('text');
  });

  it('round-trips numeric value enums without persistence transformers', () => {
    const states = {
      ACTIVE: { label: 'ACTIVE', value: 0 },
      DISABLED: { label: 'DISABLED', value: 1 },
    } as const;
    const type = new ValueEnumType(states);

    expect(type.convertToDatabaseValue(states.DISABLED, undefined as never))
      .toBe(1);
    expect(type.convertToJSValue(0, undefined as never)).toBe(states.ACTIVE);
    expect(type.getColumnType(undefined as never, undefined as never))
      .toBe('smallint');
  });
});
