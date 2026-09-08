import { Collection } from '@mikro-orm/core';
import { Entity, OneToMany, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';
import { ulid } from 'ulid';
import {
  UserProfileStatus,
  type UserProfileStatus as UserProfileStatusValue,
} from '../../../entity/account/enum/user-profile-status.js';
import { ValueEnumType } from '../../type/value-enum.type.js';
import { BaseEntity } from '../base.js';
import { PetProfileOrmEntity } from './pet-profile.js';
import { UserAttachmentOrmEntity } from './user-attachment.js';

@Entity({ tableName: 'user_profile' })
export class UserProfileOrmEntity extends BaseEntity {
  @PrimaryKey({ fieldName: 'id', columnType: 'char(26)' })
  id: string = ulid();

  @Property({ fieldName: 'name', columnType: 'varchar(50)' })
  name!: string;

  @Property({ fieldName: 'nickname', columnType: 'varchar(50)' })
  nickname!: string;

  @Property({ fieldName: 'gender', columnType: 'smallint' })
  gender!: number;

  @Property({ fieldName: 'birth_date', columnType: 'date' })
  birthDate!: Date;

  @Property({ fieldName: 'region', columnType: 'smallint' })
  region!: number;

  @Property({ fieldName: 'bio', columnType: 'varchar(1000)', nullable: true })
  bio?: string;

  @Property({
    fieldName: 'status',
    type: new ValueEnumType(UserProfileStatus),
    columnType: 'smallint',
    defaultRaw: `'${UserProfileStatus.ACTIVE.value}'`,
  })
  status: UserProfileStatusValue = UserProfileStatus.ACTIVE;

  @OneToMany(() => PetProfileOrmEntity, pet => pet.owner)
  pets = new Collection<PetProfileOrmEntity>(this);

  @OneToMany(() => UserAttachmentOrmEntity, attachment => attachment.user)
  attachments = new Collection<UserAttachmentOrmEntity>(this);
}
