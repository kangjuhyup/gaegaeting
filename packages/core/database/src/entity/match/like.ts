import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { PairOrmEntity } from './pair';
import { BaseEntity } from '../base';

@Entity('like')
@Unique('uq_like_edge', ['likerId', 'likeeId'])                  // 중복 Like 방지(멱등)
@Index('ix_like_inbox', ['likeeId', 'active', 'id'])             // 나를 좋아한 사람 목록
@Index('ix_like_outbox', ['likerId', 'active', 'id'])            // 내가 좋아한 목록
export class LikeOrmEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ type: 'char', length: 26, nullable: false, name: 'liker_id' })
  likerId: string;

  @Column({ type: 'char', length: 26, nullable: false, name: 'likee_id' })
  likeeId: string;

  /** 0: FEED , 1: SEARCH 등 */
  @Column({ type: 'tinyint', nullable: false, name: 'source' })
  source: number;

  /** 취소/비활성화 플래그 */
  @Column({ type: 'tinyint', nullable: false, name: 'active', default: () => '1' })
  active: boolean;

  /** (옵션) 매치에서 참조 – 재매치/히스토리 고려해 배열 허용 */
  @OneToMany(() => PairOrmEntity, (m) => m.likeA)
  pairsAsA!: PairOrmEntity[];

  @OneToMany(() => PairOrmEntity, (m) => m.likeB)
  pairsAsB!: PairOrmEntity[];
}
