import type { Ref } from '@mikro-orm/core';
import { Entity, Index, ManyToOne, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/legacy';
import { BaseEntity } from '../base.js';
import { FeedOrmEntity } from './feed.js';

@Entity({ tableName: 'feed_item' })
@Index({ name: 'ix_fi_candidate', properties: ['targetUserId'] })
@Index({ name: 'ix_fi_feed_target', properties: ['feed', 'targetUserId'] })
@Unique({ name: 'uq_fi_feed_user', properties: ['feed', 'targetUserId'] })
export class FeedItemOrmEntity extends BaseEntity {
  @PrimaryKey({ fieldName: 'id', autoincrement: true })
  id!: number;

  @Property({ fieldName: 'target_user_id', columnType: 'char(26)' })
  targetUserId!: string;

  @ManyToOne(() => FeedOrmEntity, {
    fieldName: 'feed_id',
    columnType: 'int',
    ref: true,
    foreignKeyName: 'FK_91ca417c3b6e110dfefa311f7df',
    deleteRule: 'cascade',
    updateRule: 'no action',
  })
  feed!: Ref<FeedOrmEntity>;

  get feedId(): number {
    return this.feed.id;
  }

  @Property({ fieldName: 'state', columnType: 'smallint' })
  state!: number;

  @Property({ fieldName: 'show_at', columnType: 'timestamptz', nullable: true })
  showAt?: Date | null;

  @Property({ fieldName: 'action_at', columnType: 'timestamptz', nullable: true })
  actionAt?: Date | null;
}
