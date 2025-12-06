// src/entities/permission.entity.ts
import { Column, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { BaseEntity } from '../base';
import { TenantOrmEntity } from './tenant';
import { RolePermissionOrmEntity } from './role-permission';

@Entity({ name: 'permission' })
@Unique('uk_perm_tenant_code', ['tenant', 'code'])
export class PermissionOrmEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @ManyToOne(() => TenantOrmEntity, (t) => t.permissions, { nullable: false, onDelete: 'RESTRICT' })
  tenant!: TenantOrmEntity;

  @Column({ type: 'varchar', length: 128 })
  @Index()
  code!: string; // e.g., "post:read"

  @Column({ type: 'varchar', length: 128, nullable: true })
  @Index()
  resource?: string | null; // e.g., "post"

  @Column({ type: 'varchar', length: 64, nullable: true })
  @Index()
  action?: string | null; // e.g., "read"

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string | null;

  @OneToMany(() => RolePermissionOrmEntity, (rp) => rp.permission)
  rolePermissions!: RolePermissionOrmEntity[];
}