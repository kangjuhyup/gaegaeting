import { Type } from '@mikro-orm/core';
import type { EntityProperty, Platform } from '@mikro-orm/core';

export class NumberArrayType extends Type<number[], string> {
  convertToDatabaseValue(value: number[]): string {
    return value.join(',');
  }

  convertToJSValue(value: string): number[] {
    if (!value) return [];
    return value.split(',').map(item => Number(item));
  }

  getColumnType(_property: EntityProperty, _platform: Platform): string {
    return 'text';
  }
}
