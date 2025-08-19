import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../base';

@Entity('main_area')
@Index('uq_main_area_code', ['code'], { unique: true })
@Index('ix_main_area_parent', ['parentCode'])
export class MainAreaOrmEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ name: 'user_id' })
  userId: string;

  /** 행정/내부 코드 (예: SEOUL-GANGNAM) */
  @Column({ type: 'varchar', length: 64, nullable: false, name: 'code' })
  code: string;

  /** 권역명 (예: 강남구) */
  @Column({ type: 'varchar', length: 100, nullable: false, name: 'name' })
  name: string;

  /** 상위 코드 (시/도 등) */
  @Column({ type: 'varchar', length: 64, nullable: true, name: 'parent_code' })
  parentCode?: string | null;
}
