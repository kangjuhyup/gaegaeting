import { Collection } from '@mikro-orm/core';
import { Entity, Index, OneToMany, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/legacy';
import { BaseEntity } from '../base.js';
import { PairOrmEntity } from './pair.js';

@Entity({ tableName: 'like' })
@Unique({ name: 'uq_like_edge', properties: ['likerId', 'likeeId'] })
@Index({ name: 'ix_like_inbox', properties: ['likeeId', 'active', 'id'] })
@Index({ name: 'ix_like_outbox', properties: ['likerId', 'active', 'id'] })
export class LikeOrmEntity extends BaseEntity {
  @PrimaryKey({ fieldName: 'id', autoincrement: true })
  id!: number;

  @Property({ fieldName: 'liker_id', columnType: 'char(26)' })
  likerId!: string;

  @Property({ fieldName: 'likee_id', columnType: 'char(26)' })
  likeeId!: string;

  @Property({ fieldName: 'source', columnType: 'smallint' })
  source!: number;

  @Property({ fieldName: 'active', columnType: 'boolean', default: true })
  active = true;

  @OneToMany(() => PairOrmEntity, pair => pair.likeA)
  pairsAsA = new Collection<PairOrmEntity>(this);

  @OneToMany(() => PairOrmEntity, pair => pair.likeB)
  pairsAsB = new Collection<PairOrmEntity>(this);
}
