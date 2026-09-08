import { Collection } from '@mikro-orm/core';
import { Entity, Index, OneToMany, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/legacy';
import { BaseEntity } from '../base.js';
import { FeedItemOrmEntity } from './feed-item.js';

@Entity({ tableName: 'feed' })
@Unique({ name: 'uq_feed_user_date_slot', properties: ['userId', 'date', 'slot'] })
@Index({ name: 'ix_feed_user_date', properties: ['userId', 'date'] })
@Index({ name: 'ix_feed_date_slot', properties: ['date', 'slot'] })
@Index({ name: 'ix_feed_expires_at', properties: ['expiresAt'] })
export class FeedOrmEntity extends BaseEntity {
  @PrimaryKey({ fieldName: 'id', autoincrement: true })
  id!: number;

  @Property({ fieldName: 'user_id', columnType: 'char(26)' })
  userId!: string;

  @Property({ fieldName: 'date', columnType: 'char(8)' })
  date!: string;

  @Property({ fieldName: 'slot', columnType: 'smallint' })
  slot!: number;

  @Property({ fieldName: 'expires_at', columnType: 'timestamptz' })
  expiresAt!: Date;

  @OneToMany(() => FeedItemOrmEntity, item => item.feed)
  items = new Collection<FeedItemOrmEntity>(this);
}
