import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/legacy';
import { BaseEntity } from '../base.js';

@Entity({ tableName: 'external_user_subject' })
@Unique({
  name: 'uk_external_user_subject_tenant_sub',
  properties: ['tenantId', 'subject'],
})
export class ExternalUserSubjectOrmEntity extends BaseEntity {
  @PrimaryKey({ fieldName: 'user_id', columnType: 'char(26)' })
  userId!: string;

  @Property({ fieldName: 'tenant_id', columnType: 'varchar(128)' })
  tenantId!: string;

  @Property({ fieldName: 'subject', columnType: 'varchar(255)' })
  subject!: string;
}
