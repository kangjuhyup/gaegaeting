import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../base';
import { ConversationOrmEntity } from './conversation';
import { MessageAttachmentOrmEntity } from './message-attachment';
import { MessageReceiptOrmEntity } from './message-receipt';
import { MessageReactionOrmEntity } from './message-reaction';

/** kind: 1=text, 2=system, 3=notice ... */
@Entity('message')
@Index('ix_msg_conv_id_desc', ['conversationId', 'id'])       // 대화별 역순 페이지네이션
@Index('ix_msg_sender_time', ['senderId', 'sentAt'])
export class MessageOrmEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
  id: number;

  @Column({ type: 'int', name: 'conversation_id', nullable: false })
  conversationId!: number;

  @Column({ type: 'char', length: 26, name: 'sender_id', nullable: false })
  senderId!: string;

  @Column({ type: 'tinyint', name: 'kind', default: 1 })
  kind: number;

  /** 본문(텍스트) */
  @Column({ type: 'text', name: 'body', nullable: true })
  body?: string | null;

  /** 구조화 페이로드(버튼/인라인카드 등) */
  @Column({ type: 'json', name: 'payload', nullable: true })
  payload?: any;

  @Column({ type: 'timestamp', name: 'sent_at', default: () => 'CURRENT_TIMESTAMP' })
  sentAt!: Date;

  @Column({ type: 'timestamp', name: 'edited_at', nullable: true })
  editedAt?: Date | null;

  @Column({ type: 'timestamp', name: 'deleted_at', nullable: true })
  deletedAt?: Date | null; // 소프트 삭제(본문 마스킹 용)

  @ManyToOne(() => ConversationOrmEntity, (c) => c.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation!: ConversationOrmEntity;

  @OneToMany(() => MessageAttachmentOrmEntity, (a) => a.message, { cascade: false })
  attachments!: MessageAttachmentOrmEntity[];

  @OneToMany(() => MessageReceiptOrmEntity, (r) => r.message, { cascade: false })
  receipts!: MessageReceiptOrmEntity[];

  @OneToMany(() => MessageReactionOrmEntity, (r) => r.message, { cascade: false })
  reactions!: MessageReactionOrmEntity[];
}