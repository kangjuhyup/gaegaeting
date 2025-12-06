import { Entity, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { RoleOrmEntity } from './role';
import { PermissionOrmEntity } from './permission';

@Entity({ name: 'role_permission' })
export class RolePermissionOrmEntity {
  @PrimaryColumn({ name: 'role_id', type: 'bigint' })
  roleId!: string;

  @PrimaryColumn({ name: 'permission_id', type: 'bigint' })
  permissionId!: string;

  @ManyToOne(() => RoleOrmEntity, (r) => r.rolePermissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role!: RoleOrmEntity;

  @ManyToOne(() => PermissionOrmEntity, (p) => p.rolePermissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permission_id' })
  permission!: PermissionOrmEntity;
}