import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { FeedOrmEntity } from './feed';
import { BaseEntity } from '../base';

@Entity('feed_item')
@Index('ix_fi_state_exp', ['state', 'expiresAt'])
@Index('ix_fi_candidate', ['targetUserId']) // 후보(노출될) 유저 기준 조회/중복체크
export class FeedItemOrmEntity extends BaseEntity{
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  /** 후보(노출될) 유저 ID */
  @Column({ type: 'char', length: 26, nullable: false, name: 'target_user_id' })
  targetUserId: string;

  /** 소속 배치 */
  @Column({ type: 'int', nullable: false, name: 'feed_id' })
  feedId: number;

  /** NEW, DELIVERED, VIEWED, LIKED, PASSED, REPORTED, EXPIRED */
  @Column({ type: 'tinyint', nullable: false, name: 'state' })
  state: number;

  /** 피드 화면에 실제 노출된 시각 */
  @Column({ type: 'datetime', nullable: true, name: 'show_at' })
  showAt?: Date | null;

  /** LIKE/PASS/REPORT 등 액션 시각 */
  @Column({ type: 'datetime', nullable: true, name: 'action_at' })
  actionAt?: Date | null;

  /** 슬롯 만료 시각(다음 슬롯 전) */
  @Column({ type: 'datetime', nullable: false, name: 'expires_at' })
  expiresAt: Date;

  @ManyToOne(() => FeedOrmEntity, (feed) => feed.items, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'feed_id' })
  feed!: FeedOrmEntity;
}
