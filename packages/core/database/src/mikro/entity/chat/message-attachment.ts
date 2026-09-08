import type { Ref } from '@mikro-orm/core';
import { Entity, Index, ManyToOne, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';
import { BaseEntity } from '../base.js';
import { MessageOrmEntity } from './message.js';

@Entity({ tableName: 'message_attachment' })
@Index({ name: 'ix_attach_msg', properties: ['message'] })
export class MessageAttachmentOrmEntity extends BaseEntity {
  @PrimaryKey({ fieldName: 'id', columnType: 'int', autoincrement: true })
  id!: number;

  @ManyToOne(() => MessageOrmEntity, {
    fieldName: 'message_id',
    columnType: 'int',
    ref: true,
    foreignKeyName: 'FK_9db9a64915214dde2ca1e8db9a7',
    deleteRule: 'cascade',
    updateRule: 'no action',
  })
  message!: Ref<MessageOrmEntity>;

  get messageId(): number {
    return this.message.id;
  }

  @Property({ fieldName: 'type', columnType: 'smallint' })
  type!: number;

  @Property({ fieldName: 'mime', columnType: 'varchar(255)', nullable: true })
  mime?: string | null;

  @Property({ fieldName: 'size', columnType: 'int', nullable: true })
  size?: number | null;

  @Property({ fieldName: 'storage_key', columnType: 'varchar(512)' })
  storageKey!: string;

  @Property({ fieldName: 'thumbnail_key', columnType: 'varchar(512)', nullable: true })
  thumbnailKey?: string | null;

  @Property({ fieldName: 'width', columnType: 'int', nullable: true })
  width?: number | null;

  @Property({ fieldName: 'height', columnType: 'int', nullable: true })
  height?: number | null;

  @Property({ fieldName: 'length_sec', columnType: 'int', nullable: true })
  lengthSec?: number | null;
}
