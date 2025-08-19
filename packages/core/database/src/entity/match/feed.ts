import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { FeedItemOrmEntity } from './feed-item';
import { BaseEntity } from '../base';

@Entity('feed')
@Unique('uq_feed_user_date_slot', ['userId', 'date', 'slot'])
@Index('ix_feed_user_date', ['userId', 'date'])
@Index('ix_feed_date_slot', ['date', 'slot'])
export class FeedOrmEntity extends BaseEntity{
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  /** 피드를 받는(보는) 유저 */
  @Column({ type: 'char', length: 26, nullable: false, name: 'user_id' })
  userId: string;

  /** YYYYMMDD (KST 기준) */
  @Column({ type: 'char', length: 8, nullable: false, name: 'date' })
  date: string;

  /** MORNING=1, NOON=2, EVENING=3 등 */
  @Column({ type: 'tinyint', nullable: false, name: 'slot' })
  slot: number;

  @OneToMany(() => FeedItemOrmEntity, (item) => item.feed, { cascade: false })
  items!: FeedItemOrmEntity[];
}
