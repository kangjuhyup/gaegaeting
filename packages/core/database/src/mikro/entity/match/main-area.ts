import { Entity, Index, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/legacy';
import type {
  MainAreaCode,
  MainAreaName,
  MainAreaParentCode,
} from '../../../entity/match/enum/korea-main-area.js';
import { BaseEntity } from '../base.js';

@Entity({ tableName: 'main_area' })
@Unique({ name: 'uq_main_area_code', properties: ['code'] })
@Index({ name: 'ix_main_area_parent', properties: ['parentCode'] })
export class MainAreaOrmEntity extends BaseEntity {
  @PrimaryKey({ fieldName: 'user_id', columnType: 'varchar' })
  userId!: string;

  @Property({ fieldName: 'code', columnType: 'varchar(64)' })
  code!: MainAreaCode;

  @Property({ fieldName: 'name', columnType: 'varchar(100)' })
  name!: MainAreaName;

  @Property({ fieldName: 'parent_code', columnType: 'varchar(64)', nullable: true })
  parentCode?: MainAreaParentCode;
}
