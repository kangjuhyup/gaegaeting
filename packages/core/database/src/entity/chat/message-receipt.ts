import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { BaseEntity } from '../base';
import { MessageOrmEntity } from './message';

@Entity('message_receipt')
export class MessageReceiptOrmEntity extends BaseEntity {
  @PrimaryColumn({ type: 'bigint', name: 'message_id' })
  messageId!: string;

  @PrimaryColumn({ type: 'char', length: 26, name: 'user_id' })
  userId!: string;

  @Column({ type: 'timestamp', name: 'delivered_at', nullable: true })
  deliveredAt?: Date | null;

  @Column({ type: 'timestamp', name: 'read_at', nullable: true })
  readAt?: Date | null;

  @ManyToOne(() => MessageOrmEntity, (m) => m.receipts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'message_id' })
  message!: MessageOrmEntity;
}