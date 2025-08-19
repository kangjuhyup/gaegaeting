import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { LikeOrmEntity } from './like';
import { BaseEntity } from '../base';

@Entity('pair')
@Unique('uq_match_pair_active', ['leftUserId', 'rightUserId', 'active']) // 같은 쌍의 열린 매치 1건
@Index('ix_match_left_active', ['leftUserId', 'active', 'id'])
@Index('ix_match_right_active', ['rightUserId', 'active', 'id'])
@Index('ix_match_like_a', ['likeAId'])
@Index('ix_match_like_b', ['likeBId'])
export class PairOrmEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  /** 항상 정렬(LEAST/GREATEST)된 쌍 저장을 앱 레벨에서 강제 */
  @Column({ type: 'char', length: 26, nullable: false, name: 'left_user_id' })
  leftUserId: string;

  @Column({ type: 'char', length: 26, nullable: false, name: 'right_user_id' })
  rightUserId: string;

  @Column({ type: 'tinyint', nullable: false, name: 'active', default: () => '1' })
  active: boolean;

  @Column({ type: 'datetime', nullable: true, name: 'unmatched_at' })
  unmatchedAt?: Date | null;

  /** 어떤 Like로 성사됐는지(각 방향) – 약한 연관 */
  @Column({ type: 'int', nullable: true, name: 'like_a_id' })
  likeAId?: number | null;

  @Column({ type: 'int', nullable: true, name: 'like_b_id' })
  likeBId?: number | null;

  @ManyToOne(() => LikeOrmEntity, (like) => like.pairsAsA, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'like_a_id' })
  likeA?: LikeOrmEntity | null;

  @ManyToOne(() => LikeOrmEntity, (like) => like.pairsAsB, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'like_b_id' })
  likeB?: LikeOrmEntity | null;
}
