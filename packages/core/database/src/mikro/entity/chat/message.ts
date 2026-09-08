import { Collection, type Ref } from '@mikro-orm/core';
import { Entity, Index, ManyToOne, OneToMany, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';
import { BaseEntity } from '../base.js';
import { ConversationOrmEntity } from './conversation.js';
import { MessageAttachmentOrmEntity } from './message-attachment.js';
import { MessageReactionOrmEntity } from './message-reaction.js';
import { MessageReceiptOrmEntity } from './message-receipt.js';

@Entity({ tableName: 'message' })
@Index({ name: 'ix_msg_conv_id_desc', properties: ['conversation', 'id'] })
@Index({ name: 'ix_msg_sender_time', properties: ['senderId', 'sentAt'] })
export class MessageOrmEntity extends BaseEntity {
  @PrimaryKey({ fieldName: 'id', columnType: 'int', autoincrement: true })
  id!: number;

  @ManyToOne(() => ConversationOrmEntity, {
    fieldName: 'conversation_id',
    columnType: 'int',
    ref: true,
    foreignKeyName: 'FK_7fe3e887d78498d9c9813375ce2',
    deleteRule: 'cascade',
    updateRule: 'no action',
  })
  conversation!: Ref<ConversationOrmEntity>;

  get conversationId(): number {
    return this.conversation.id;
  }

  @Property({ fieldName: 'sender_id', columnType: 'char(26)' })
  senderId!: string;

  @Property({ fieldName: 'kind', columnType: 'smallint', defaultRaw: "'1'" })
  kind = 1;

  @Property({ fieldName: 'body', columnType: 'text', nullable: true })
  body?: string | null;

  @Property({ fieldName: 'payload', columnType: 'jsonb', nullable: true })
  payload?: unknown;

  @Property({ fieldName: 'sent_at', columnType: 'timestamptz', defaultRaw: 'CURRENT_TIMESTAMP' })
  sentAt: Date = new Date();

  @Property({ fieldName: 'edited_at', columnType: 'timestamptz', nullable: true })
  editedAt?: Date | null;

  @Property({ fieldName: 'deleted_at', columnType: 'timestamptz', nullable: true })
  deletedAt?: Date | null;

  @OneToMany(() => MessageAttachmentOrmEntity, attachment => attachment.message)
  attachments = new Collection<MessageAttachmentOrmEntity>(this);

  @OneToMany(() => MessageReceiptOrmEntity, receipt => receipt.message)
  receipts = new Collection<MessageReceiptOrmEntity>(this);

  @OneToMany(() => MessageReactionOrmEntity, reaction => reaction.message)
  reactions = new Collection<MessageReactionOrmEntity>(this);
}
