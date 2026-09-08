import type { Ref } from '@mikro-orm/core';
import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';
import { BaseEntity } from '../base.js';
import { MessageOrmEntity } from './message.js';

@Entity({ tableName: 'message_reaction' })
export class MessageReactionOrmEntity extends BaseEntity {
  @ManyToOne(() => MessageOrmEntity, {
    fieldName: 'message_id',
    columnType: 'int',
    primary: true,
    ref: true,
    foreignKeyName: 'FK_c3aa2868fc9b2bc57d067642c58',
    deleteRule: 'cascade',
    updateRule: 'no action',
  })
  message!: Ref<MessageOrmEntity>;

  get messageId(): number {
    return this.message.id;
  }

  @PrimaryKey({ fieldName: 'user_id', columnType: 'char(26)' })
  userId!: string;

  @PrimaryKey({ fieldName: 'emoji', columnType: 'varchar(32)' })
  emoji!: string;

  @Property({ fieldName: 'reacted_at', columnType: 'timestamptz', defaultRaw: 'CURRENT_TIMESTAMP' })
  reactedAt: Date = new Date();
}
