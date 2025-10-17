import { Entity, ManyToOne, JoinColumn, PrimaryColumn, Index, Unique } from 'typeorm';
import { GroupOrmEntity } from './group';
import { RoleOrmEntity } from './role';
import { ClientOrmEntity } from './client';

@Entity({ name: 'group_role' })
@Index('idx_gr_role', ['roleId'])
@Index('idx_gr_client', ['clientId'])
@Unique('uk_group_role_group_role_client', ['group', 'role', 'client'])
export class GroupRoleOrmEntity {
  @PrimaryColumn({ name: 'grp_id', type: 'bigint' })
  groupId!: string;

  @PrimaryColumn({ name: 'role_id', type: 'bigint' })
  roleId!: string;


  @ManyToOne(() => GroupOrmEntity, (g) => g.groupRoles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'grp_id' })
  group!: GroupOrmEntity;

  @ManyToOne(() => RoleOrmEntity, (r) => r.groupRoles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role!: RoleOrmEntity;

  @ManyToOne(() => ClientOrmEntity, (c) => c.groupRoles, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'client_id' })
  client?: ClientOrmEntity | null;
}