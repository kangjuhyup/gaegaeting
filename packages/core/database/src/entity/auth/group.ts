import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique, Index } from 'typeorm';
import { BaseEntity } from '../base';
import { TenantOrmEntity } from './tenant';
import { UserGroupOrmEntity } from './user-group';
import { GroupRoleOrmEntity } from './group-role';

@Entity({ name: 'group' })
@Unique('uk_grp_tenant_code', ['tenant', 'code'])
export class GroupOrmEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @ManyToOne(() => TenantOrmEntity, (t) => t.groups, { nullable: false, onDelete: 'RESTRICT' })
  tenant!: TenantOrmEntity;

  @Column({ type: 'varchar', length: 128 })
  @Index()
  code!: string;

  @Column({ type: 'varchar', length: 128 })
  name!: string;

  @ManyToOne(() => GroupOrmEntity, (g) => g.children, { nullable: true, onDelete: 'SET NULL' })
  parent?: GroupOrmEntity | null;

  @OneToMany(() => GroupOrmEntity, (g) => g.parent)
  children!: GroupOrmEntity[];

  @OneToMany(() => UserGroupOrmEntity, (ug) => ug.group)
  userGroups!: UserGroupOrmEntity[];

  @OneToMany(() => GroupRoleOrmEntity, (gr) => gr.group)
  groupRoles!: GroupRoleOrmEntity[];
}