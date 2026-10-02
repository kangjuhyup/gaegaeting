import type { Ref } from '@mikro-orm/core';
import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';
import { BaseEntity } from '../base.js';
import { PetProfileOrmEntity } from './pet-profile.js';

@Entity({ tableName: 'pet_attachment' })
export class PetAttachmentOrmEntity extends BaseEntity {
  @ManyToOne(() => PetProfileOrmEntity, {
    fieldName: 'pet_id',
    columnType: 'int',
    primary: true,
    ref: true,
    foreignKeyName: 'FK_447efb21de244c3d43ea8ab26b0',
    deleteRule: 'no action',
    updateRule: 'no action',
  })
  pet!: Ref<PetProfileOrmEntity>;

  get petId(): number {
    return this.pet.id;
  }

  @PrimaryKey({ fieldName: 'no', columnType: 'int', default: 0 })
  no = 0;

  @Property({ fieldName: 'path', columnType: 'varchar(255)' })
  path!: string;

  @Property({ fieldName: 'is_active', columnType: 'boolean', default: false })
  isActive = false;
  @Property({ fieldName: 'upload_key', columnType: 'varchar(255)', nullable: true })
  uploadKey?: string;

  @Property({ fieldName: 'review_status', columnType: 'varchar(16)', default: 'UPLOADING' })
  reviewStatus: 'UPLOADING' | 'PENDING' | 'APPROVED' | 'REJECTED' = 'UPLOADING';

  @Property({ fieldName: 'reviewed_by', columnType: 'char(26)', nullable: true })
  reviewedBy?: string;

  @Property({ fieldName: 'reviewed_at', columnType: 'timestamptz', nullable: true })
  reviewedAt?: Date;
}
