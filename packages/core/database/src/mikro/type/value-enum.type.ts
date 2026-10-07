import { Type } from '@mikro-orm/core';
import type { EntityProperty, Platform } from '@mikro-orm/core';

type ValueEnumMember = { label: string; value: number };
type ValueEnumObject = Record<string, ValueEnumMember>;

export class ValueEnumType<T extends ValueEnumObject> extends Type<
  T[keyof T] | number | null,
  number | null
> {
  private readonly valueMap: Map<number, T[keyof T]>;

  constructor(enumObject: T) {
    super();
    this.valueMap = new Map(
      Object.values(enumObject).map(member => [
        member.value,
        member as T[keyof T],
      ]),
    );
  }

  convertToDatabaseValue(value: T[keyof T] | number | null): number | null {
    if (value == null) return null;
    return typeof value === 'number' ? value : value.value;
  }

  convertToJSValue(value: number | null): T[keyof T] | null {
    if (value == null) return null;
    return this.valueMap.get(value) ?? null;
  }

  // The JS value is an enum object; MikroORM's default runtime type is string.
  override get runtimeType(): string {
    return 'object';
  }

  getColumnType(_property: EntityProperty, _platform: Platform): string {
    return 'smallint';
  }
}
