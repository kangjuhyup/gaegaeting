import { Collection } from '@mikro-orm/core';
import { Entity, Index, OneToMany, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/legacy';
import { BaseEntity } from '../base.js';
import { MessageOrmEntity } from './message.js';
import { ParticipantOrmEntity } from './participant.js';

@Entity({ tableName: 'conversation' })
@Index({ name: 'ix_conv_last_msg_at', properties: ['lastMessageAt'] })
@Index({ name: 'ix_conv_type', properties: ['type'] })
@Unique({ name: 'uq_conv_direct_key', properties: ['directKey'] })
export class ConversationOrmEntity extends BaseEntity {
  @PrimaryKey({ fieldName: 'id', columnType: 'int', autoincrement: true })
  id!: number;

  @Property({ fieldName: 'type', columnType: 'smallint' })
  type!: number;

  @Property({ fieldName: 'direct_key', columnType: 'char(53)', nullable: true })
  directKey?: string | null;

  @Property({ fieldName: 'title', columnType: 'varchar(128)', nullable: true })
  title?: string | null;

  @Property({ fieldName: 'last_message_at', columnType: 'timestamptz', nullable: true })
  lastMessageAt?: Date | null;

  @OneToMany(() => ParticipantOrmEntity, participant => participant.conversation)
  participants = new Collection<ParticipantOrmEntity>(this);

  @OneToMany(() => MessageOrmEntity, message => message.conversation)
  messages = new Collection<MessageOrmEntity>(this);
}
