import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { BaseEntity } from '../base';
import { MessageOrmEntity } from './message';

@Entity('message_reaction')
export class MessageReactionOrmEntity extends BaseEntity {
  @PrimaryColumn({ type: 'int', name: 'message_id' })
  messageId!: number;

  @PrimaryColumn({ type: 'char', length: 26, name: 'user_id' })
  userId!: string;

  @PrimaryColumn({ type: 'varchar', length: 32, name: 'emoji' })
  emoji!: string; // e.g., "👍", ":heart:"

  @Column({ type: 'timestamp', name: 'reacted_at', default: () => 'CURRENT_TIMESTAMP' })
  reactedAt!: Date;

  @ManyToOne(() => MessageOrmEntity, (m) => m.reactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'message_id' })
  message!: MessageOrmEntity;
}