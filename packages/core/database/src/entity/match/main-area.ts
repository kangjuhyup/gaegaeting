import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { BaseEntity } from '../base';
import type { MainAreaCode, MainAreaName, MainAreaParentCode } from './enum/korea-main-area';

@Entity('main_area')
@Index('uq_main_area_code', ['code'], { unique: true })
@Index('ix_main_area_parent', ['parentCode'])
export class MainAreaOrmEntity extends BaseEntity {
  @PrimaryColumn({ name: 'user_id' })
  userId: string;

  /**
   * 행정구역 코드
   * - 시/도: 2자리 (예: 서울특별시=11)
   * - 시/군/구: 5자리 (예: 서울특별시 강남구=11680)
   */
  @Column({ type: 'varchar', length: 64, nullable: false, name: 'code' })
  code: MainAreaCode;

  /** 권역명 (예: 강남구) */
  @Column({ type: 'varchar', length: 100, nullable: false, name: 'name' })
  name: MainAreaName;

  /** 상위 코드 (시/도 등) */
  @Column({ type: 'varchar', length: 64, nullable: true, name: 'parent_code' })
  parentCode?: MainAreaParentCode;
}
