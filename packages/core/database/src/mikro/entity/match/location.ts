import { Entity, Index, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';
import { BaseEntity } from '../base.js';

@Entity({ tableName: 'location' })
@Index({ name: 'ix_lat_lng', properties: ['latitude', 'longitude'] })
@Index({ name: 'spx_location_point', properties: ['locationPoint'], type: 'gist' })
export class LocationOrmEntity extends BaseEntity {
  @PrimaryKey({ fieldName: 'user_id', columnType: 'char(26)' })
  userId!: string;

  @Property({ fieldName: 'latitude', columnType: 'numeric(10,7)' })
  latitude!: number;

  @Property({ fieldName: 'longitude', columnType: 'numeric(10,7)' })
  longitude!: number;

  @Property({ fieldName: 'city', columnType: 'varchar(100)', nullable: true })
  city?: string;

  @Property({ fieldName: 'district', columnType: 'varchar(100)', nullable: true })
  district?: string;

  @Property({
    fieldName: 'location_point',
    columnType: 'point',
    generated: 'point((longitude)::double precision, (latitude)::double precision) stored',
  })
  locationPoint?: unknown;
}
