import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../base';
import { MessageOrmEntity } from './message';

/** type: 1=image, 2=video, 3=audio, 4=file */
@Entity('message_attachment')
@Index('ix_attach_msg', ['messageId'])
export class MessageAttachmentOrmEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
  id: number;

  @Column({ type: 'int', name: 'message_id' })
  messageId!: number;

  @Column({ type: 'tinyint', name: 'type', nullable: false })
  type!: number;

  @Column({ type: 'varchar', length: 255, name: 'mime', nullable: true })
  mime?: string | null;

  @Column({ type: 'int', name: 'size', nullable: true })
  size?: number | null;

  @Column({ type: 'varchar', length: 512, name: 'storage_key', nullable: false })
  storageKey!: string;

  @Column({ type: 'varchar', length: 512, name: 'thumbnail_key', nullable: true })
  thumbnailKey?: string | null;

  @Column({ type: 'int', name: 'width', nullable: true })
  width?: number | null;

  @Column({ type: 'int', name: 'height', nullable: true })
  height?: number | null;

  @Column({ type: 'int', name: 'length_sec', nullable: true })
  lengthSec?: number | null;

  @ManyToOne(() => MessageOrmEntity, (m) => m.attachments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'message_id' })
  message!: MessageOrmEntity;
}