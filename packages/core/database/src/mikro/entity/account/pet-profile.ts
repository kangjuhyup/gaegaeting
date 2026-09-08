import { Collection, type Ref } from '@mikro-orm/core';
import { Entity, ManyToOne, OneToMany, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';
import { NumberArrayType } from '../../type/number-array.type.js';
import { BaseEntity } from '../base.js';
import { PetAttachmentOrmEntity } from './pet-attachment.js';
import { UserProfileOrmEntity } from './user-profile.js';

@Entity({ tableName: 'pet' })
export class PetProfileOrmEntity extends BaseEntity {
  @PrimaryKey({ fieldName: 'id', autoincrement: true })
  id!: number;

  @Property({ fieldName: 'name', columnType: 'varchar(50)' })
  name!: string;

  @Property({ fieldName: 'age', columnType: 'int', nullable: true })
  age?: number;

  @Property({ fieldName: 'gender', columnType: 'smallint' })
  gender!: number;

  @Property({ fieldName: 'breed', columnType: 'smallint' })
  breed!: number;

  @Property({ fieldName: 'size', columnType: 'smallint' })
  size!: number;

  @Property({
    fieldName: 'personalities',
    type: new NumberArrayType(),
    columnType: 'text',
  })
  personalities!: number[];

  @Property({ fieldName: 'description', columnType: 'text', nullable: true })
  description?: string;

  @Property({ fieldName: 'certification_code', columnType: 'char(1)', nullable: true })
  certificationCode?: string;

  @Property({
    fieldName: 'certification',
    columnType: 'boolean',
    default: false,
  })
  certification = false;

  @ManyToOne(() => UserProfileOrmEntity, {
    fieldName: 'user_id',
    columnType: 'char(26)',
    ref: true,
    foreignKeyName: 'FK_64704296b7bd17e90ca0a620a98',
    deleteRule: 'no action',
    updateRule: 'no action',
  })
  owner!: Ref<UserProfileOrmEntity>;

  get userId(): string {
    return this.owner.id;
  }

  @OneToMany(() => PetAttachmentOrmEntity, attachment => attachment.pet)
  attachments = new Collection<PetAttachmentOrmEntity>(this);
}
