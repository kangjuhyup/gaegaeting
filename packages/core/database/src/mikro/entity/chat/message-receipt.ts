import type { Ref } from '@mikro-orm/core';
import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';
import { BaseEntity } from '../base.js';
import { MessageOrmEntity } from './message.js';

@Entity({ tableName: 'message_receipt' })
export class MessageReceiptOrmEntity extends BaseEntity {
  @ManyToOne(() => MessageOrmEntity, {
    fieldName: 'message_id',
    columnType: 'int',
    primary: true,
    ref: true,
    foreignKeyName: 'FK_d0a543b03e1ec2f0023ae3f4bb8',
    deleteRule: 'cascade',
    updateRule: 'no action',
  })
  message!: Ref<MessageOrmEntity>;

  get messageId(): number {
    return this.message.id;
  }

  @PrimaryKey({ fieldName: 'user_id', columnType: 'char(26)' })
  userId!: string;

  @Property({ fieldName: 'delivered_at', columnType: 'timestamptz', nullable: true })
  deliveredAt?: Date | null;

  @Property({ fieldName: 'read_at', columnType: 'timestamptz', nullable: true })
  readAt?: Date | null;
}
