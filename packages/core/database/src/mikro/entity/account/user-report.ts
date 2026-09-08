import type { Ref } from '@mikro-orm/core';
import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';
import {
  UserReportStatus,
  type UserReportStatus as UserReportStatusValue,
} from '../../../entity/account/enum/user-report-status.js';
import {
  UserReportType,
  type UserReportType as UserReportTypeValue,
} from '../../../entity/account/enum/user-report-type.js';
import { ValueEnumType } from '../../type/value-enum.type.js';
import { UserProfileOrmEntity } from './user-profile.js';

@Entity({ tableName: 'user_report' })
export class UserReportOrmEntity {
  @PrimaryKey({ fieldName: 'id', autoincrement: true })
  id!: number;

  @ManyToOne(() => UserProfileOrmEntity, {
    fieldName: 'reporter_id',
    columnType: 'char(26)',
    ref: true,
    foreignKeyName: 'FK_dbee763adbfd464522d0f1bdc9a',
    deleteRule: 'no action',
    updateRule: 'no action',
  })
  reporter!: Ref<UserProfileOrmEntity>;

  get reporterId(): string {
    return this.reporter.id;
  }

  @ManyToOne(() => UserProfileOrmEntity, {
    fieldName: 'reported_user_id',
    columnType: 'char(26)',
    ref: true,
    foreignKeyName: 'FK_e1a59610dd446c038093fc9fa1f',
    deleteRule: 'no action',
    updateRule: 'no action',
  })
  reportedUser!: Ref<UserProfileOrmEntity>;

  get reportedUserId(): string {
    return this.reportedUser.id;
  }

  @Property({
    fieldName: 'report_type',
    type: new ValueEnumType(UserReportType),
    columnType: 'smallint',
    defaultRaw: `'${UserReportType.OTHER.value}'`,
  })
  reportType: UserReportTypeValue = UserReportType.OTHER;

  @Property({ fieldName: 'content', columnType: 'text', nullable: true })
  content?: string;

  @Property({
    fieldName: 'status',
    type: new ValueEnumType(UserReportStatus),
    columnType: 'smallint',
    defaultRaw: `'${UserReportStatus.PENDING.value}'`,
  })
  status: UserReportStatusValue = UserReportStatus.PENDING;

  @Property({ fieldName: 'resolution', columnType: 'text', nullable: true })
  resolution?: string;

  @Property({ fieldName: 'resolved_by', columnType: 'char(26)', nullable: true })
  resolvedBy?: string;

  @Property({ fieldName: 'resolved_at', columnType: 'timestamptz', nullable: true })
  resolvedAt?: Date;
}
