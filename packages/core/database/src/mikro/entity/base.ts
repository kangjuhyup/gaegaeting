import { sql } from '@mikro-orm/core';
import { Property } from '@mikro-orm/decorators/legacy';

export abstract class BaseEntity {
  @Property({
    fieldName: 'created_at',
    columnType: 'timestamptz',
    defaultRaw: 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @Property({
    fieldName: 'updated_at',
    columnType: 'timestamptz',
    defaultRaw: 'CURRENT_TIMESTAMP',
    onUpdate: () => sql.now(),
  })
  updatedAt!: Date;
}
