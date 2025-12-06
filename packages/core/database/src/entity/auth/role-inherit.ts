// src/entities/role-inherit.entity.ts
import { Entity, ManyToOne, JoinColumn, PrimaryColumn, Check } from 'typeorm';
import { RoleOrmEntity } from './role';

@Entity({ name: 'role_inherit' })
@Check('chk_ri_diff', 'parent_role_id <> child_role_id')
export class RoleInheritOrmEntity {
  @PrimaryColumn({ name: 'parent_role_id', type: 'bigint' })
  parentRoleId!: string;

  @PrimaryColumn({ name: 'child_role_id', type: 'bigint' })
  childRoleId!: string;

  @ManyToOne(() => RoleOrmEntity, (r) => r.includes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_role_id' })
  parent!: RoleOrmEntity;

  @ManyToOne(() => RoleOrmEntity, (r) => r.includedBy, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'child_role_id' })
  child!: RoleOrmEntity;
}