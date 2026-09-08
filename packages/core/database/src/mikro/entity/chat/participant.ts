import type { Ref } from '@mikro-orm/core';
import { Entity, Index, ManyToOne, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';
import { BaseEntity } from '../base.js';
import { ConversationOrmEntity } from './conversation.js';

@Entity({ tableName: 'participant' })
@Index({ name: 'ix_part_user', properties: ['userId'] })
export class ParticipantOrmEntity extends BaseEntity {
  @ManyToOne(() => ConversationOrmEntity, {
    fieldName: 'conversation_id',
    columnType: 'int',
    primary: true,
    ref: true,
    foreignKeyName: 'FK_9b5903f91fdde57571cc40ceafc',
    deleteRule: 'cascade',
    updateRule: 'no action',
  })
  conversation!: Ref<ConversationOrmEntity>;

  get conversationId(): number {
    return this.conversation.id;
  }

  @PrimaryKey({ fieldName: 'user_id', columnType: 'char(26)' })
  userId!: string;

  @Property({ fieldName: 'role', columnType: 'smallint', defaultRaw: "'2'" })
  role = 2;

  @Property({ fieldName: 'last_read_message_id', columnType: 'bigint', nullable: true })
  lastReadMessageId?: string | null;

  @Property({ fieldName: 'last_read_at', columnType: 'timestamptz', nullable: true })
  lastReadAt?: Date | null;

  @Property({ fieldName: 'muted_until', columnType: 'timestamptz', nullable: true })
  mutedUntil?: Date | null;

  @Property({ fieldName: 'joined_at', columnType: 'timestamptz', defaultRaw: 'CURRENT_TIMESTAMP' })
  joinedAt: Date = new Date();

  @Property({ fieldName: 'left_at', columnType: 'timestamptz', nullable: true })
  leftAt?: Date | null;
}
