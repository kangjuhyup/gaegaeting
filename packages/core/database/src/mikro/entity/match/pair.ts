import type { Ref } from '@mikro-orm/core';
import { Entity, Index, ManyToOne, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/legacy';
import { BaseEntity } from '../base.js';
import { LikeOrmEntity } from './like.js';

@Entity({ tableName: 'pair' })
@Unique({ name: 'uq_match_pair_active', properties: ['leftUserId', 'rightUserId', 'active'] })
@Index({ name: 'ix_match_left_active', properties: ['leftUserId', 'active', 'id'] })
@Index({ name: 'ix_match_right_active', properties: ['rightUserId', 'active', 'id'] })
@Index({ name: 'ix_match_like_a', properties: ['likeA'] })
@Index({ name: 'ix_match_like_b', properties: ['likeB'] })
export class PairOrmEntity extends BaseEntity {
  @PrimaryKey({ fieldName: 'id', autoincrement: true })
  id!: number;

  @Property({ fieldName: 'left_user_id', columnType: 'char(26)' })
  leftUserId!: string;

  @Property({ fieldName: 'right_user_id', columnType: 'char(26)' })
  rightUserId!: string;

  @Property({ fieldName: 'active', columnType: 'boolean', default: true })
  active = true;

  @Property({ fieldName: 'unmatched_at', columnType: 'timestamptz', nullable: true })
  unmatchedAt?: Date | null;

  @ManyToOne(() => LikeOrmEntity, {
    fieldName: 'like_a_id',
    columnType: 'int',
    nullable: true,
    ref: true,
    foreignKeyName: 'FK_7e3c5378bd648337c58d37639b4',
    deleteRule: 'set null',
    updateRule: 'no action',
  })
  likeA?: Ref<LikeOrmEntity> | null;

  get likeAId(): number | null | undefined {
    return this.likeA?.id;
  }

  @ManyToOne(() => LikeOrmEntity, {
    fieldName: 'like_b_id',
    columnType: 'int',
    nullable: true,
    ref: true,
    foreignKeyName: 'FK_3578c47763e9ed70bbedfbbf808',
    deleteRule: 'set null',
    updateRule: 'no action',
  })
  likeB?: Ref<LikeOrmEntity> | null;

  get likeBId(): number | null | undefined {
    return this.likeB?.id;
  }
}
