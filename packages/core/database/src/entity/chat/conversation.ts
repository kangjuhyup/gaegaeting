import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { BaseEntity } from '../base';
import { ParticipantOrmEntity } from './participant';
import { MessageOrmEntity } from './message';

/** type: 1=direct(1:1), 2=group(그룹) */
@Entity('conversation')
@Index('ix_conv_last_msg_at', ['lastMessageAt'])
@Index('ix_conv_type', ['type'])
@Unique('uq_conv_direct_key', ['directKey']) // 1:1에서만 사용 (null 허용)
export class ConversationOrmEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
  id: number;

  @Column({ type: 'tinyint', name: 'type', nullable: false })
  type: number;

  /** 1:1일 때: "minUserId-maxUserId" 형식(애플리케이션에서 생성), 그룹일 땐 null */
  @Column({ type: 'char', length: 53, name: 'direct_key', nullable: true })
  directKey?: string | null;

  @Column({ type: 'varchar', length: 128, name: 'title', nullable: true })
  title?: string | null;

  @Column({ type: 'timestamp', name: 'last_message_at', nullable: true })
  lastMessageAt?: Date | null;

  @OneToMany(() => ParticipantOrmEntity, (p) => p.conversation, { cascade: false })
  participants!: ParticipantOrmEntity[];

  @OneToMany(() => MessageOrmEntity, (m) => m.conversation, { cascade: false })
  messages!: MessageOrmEntity[];
}