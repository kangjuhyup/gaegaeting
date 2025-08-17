import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('location')
@Index('ix_lat_lng', ['latitude', 'longitude'])
@Index('spx_location_point', ['locationPoint'], { spatial: true })
export class LocationOrmEntity {
  @PrimaryColumn({ type: 'char', length: 26, name: 'user_id' })
  userId: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: false, name: 'latitude' })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: false, name: 'longitude' })
  longitude: number;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'city' })
  city?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'district' })
  district?: string;

  /** 생성(STORED) 컬럼: POINT(lng,lat) with SRID 4326 */
  @Column({
    type: 'point',
    srid: 4326,
    asExpression: "ST_GeomFromText(CONCAT('POINT(', longitude, ' ', latitude, ')'), 4326)",
    generatedType: 'STORED',
    name: 'location_point',
  })
  locationPoint?: any;
}
