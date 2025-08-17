import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('main_area')
@Index('uq_main_area_code', ['code'], { unique: true })
@Index('ix_main_area_parent', ['parentCode'])
@Index('spx_main_area_polygon', { spatial: true })
export class MainAreaOrmEntity {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  /** 행정/내부 코드 (예: SEOUL-GANGNAM) */
  @Column({ type: 'varchar', length: 64, nullable: false, name: 'code' })
  code: string;

  /** 권역명 (예: 강남구) */
  @Column({ type: 'varchar', length: 100, nullable: false, name: 'name' })
  name: string;

  /** 상위 코드 (시/도 등) */
  @Column({ type: 'varchar', length: 64, nullable: true, name: 'parent_code' })
  parentCode?: string | null;

  /** 중심점 위경도(옵션) */
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true, name: 'center_lat' })
  centerLat?: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true, name: 'center_lng' })
  centerLng?: number | null;

  /**
   * 권역 폴리곤(옵션) – 4326
   * 필요 없다면 컬럼 제거 가능
   */
  @Column({ type: 'polygon', srid: 4326, nullable: true, name: 'polygon' })
  polygon?: any | null;
}
