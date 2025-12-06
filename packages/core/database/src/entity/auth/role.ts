import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique, Index } from 'typeorm';
import { BaseEntity } from '../base';
import { TenantOrmEntity } from './tenant';
import { RoleInheritOrmEntity } from './role-inherit';
import { RolePermissionOrmEntity } from './role-permission';
import { UserRoleOrmEntity } from './user-role';
import { GroupRoleOrmEntity } from './group-role';

@Entity({ name: 'role' })
@Unique('uk_role_tenant_code', ['tenant', 'code'])
export class RoleOrmEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @ManyToOne(() => TenantOrmEntity, (t) => t.roles, { nullable: false, onDelete: 'RESTRICT' })
  tenant!: TenantOrmEntity;

  @Column({ type: 'varchar', length: 128 })
  @Index()
  code!: string;

  @Column({ type: 'varchar', length: 128 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string | null;

  @OneToMany(() => RolePermissionOrmEntity, (rp) => rp.role)
  rolePermissions!: RolePermissionOrmEntity[];

  @OneToMany(() => UserRoleOrmEntity, (ur) => ur.role)
  userRoles!: UserRoleOrmEntity[];

  @OneToMany(() => GroupRoleOrmEntity, (gr) => gr.role)
  groupRoles!: GroupRoleOrmEntity[];

  @OneToMany(() => RoleInheritOrmEntity, (ri) => ri.parent)
  includes!: RoleInheritOrmEntity[];

  @OneToMany(() => RoleInheritOrmEntity, (ri) => ri.child)
  includedBy!: RoleInheritOrmEntity[];
}