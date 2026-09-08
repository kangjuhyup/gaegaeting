import type { Ref } from '@mikro-orm/core';
import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';
import { BaseEntity } from '../base.js';
import { UserProfileOrmEntity } from './user-profile.js';

@Entity({ tableName: 'user_attachment' })
export class UserAttachmentOrmEntity extends BaseEntity {
  @ManyToOne(() => UserProfileOrmEntity, {
    fieldName: 'user_id',
    columnType: 'char(26)',
    primary: true,
    ref: true,
    foreignKeyName: 'FK_3ce170fc809882ba254be591e9a',
    deleteRule: 'no action',
    updateRule: 'no action',
  })
  user!: Ref<UserProfileOrmEntity>;

  get userId(): string {
    return this.user.id;
  }

  @PrimaryKey({ fieldName: 'no', columnType: 'int', default: 0 })
  no = 0;

  @Property({ fieldName: 'path', columnType: 'varchar(255)' })
  path!: string;

  @Property({ fieldName: 'is_active', columnType: 'boolean', default: false })
  isActive = false;
}
