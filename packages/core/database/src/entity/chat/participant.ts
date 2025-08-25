
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { BaseEntity } from '../base';
import { ConversationOrmEntity } from './conversation';

/** role: 1=owner, 2=member */
@Entity('participant')
@Index('ix_part_user', ['userId'])
export class ParticipantOrmEntity extends BaseEntity {
  @PrimaryColumn({ type: 'int', name: 'conversation_id' })
  conversationId: number;

  @PrimaryColumn({ type: 'char', length: 26, name: 'user_id' })
  userId: string;

  @Column({ type: 'tinyint', name: 'role', default: 2 })
  role: number;

  /** 대화 내 읽음 포인터 */
  @Column({ type: 'bigint', name: 'last_read_message_id', nullable: true })
  lastReadMessageId?: string | null;

  @Column({ type: 'timestamp', name: 'last_read_at', nullable: true })
  lastReadAt?: Date | null;

  /** 알림 음소거 만료 시각 */
  @Column({ type: 'timestamp', name: 'muted_until', nullable: true })
  mutedUntil?: Date | null;

  @Column({ type: 'timestamp', name: 'joined_at', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
  joinedAt!: Date;

  @Column({ type: 'timestamp', name: 'left_at', nullable: true })
  leftAt?: Date | null;

  @ManyToOne(() => ConversationOrmEntity, (c) => c.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation!: ConversationOrmEntity;
}