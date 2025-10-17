import { Entity, ManyToOne, JoinColumn, PrimaryColumn, Index, Unique } from 'typeorm';
import { UserOrmEntity } from './user';
import { RoleOrmEntity } from './role';
import { ClientOrmEntity } from './client';

@Entity({ name: 'user_role' })
@Index('idx_ur_role', ['roleId'])
@Index('idx_ur_client', ['clientId'])
@Unique('uk_user_role_user_role_client', ['user', 'role', 'client'])
export class UserRoleOrmEntity {
  @PrimaryColumn({ name: 'user_id', type: 'char', length: 26 })
  userId!: string;

  @PrimaryColumn({ name: 'role_id', type: 'bigint' })
  roleId!: string;

  @ManyToOne(() => UserOrmEntity, (u) => u.userRoles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserOrmEntity;

  @ManyToOne(() => RoleOrmEntity, (r) => r.userRoles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role!: RoleOrmEntity;

  @ManyToOne(() => ClientOrmEntity, (c) => c.userRoles, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'client_id' })
  client?: ClientOrmEntity | null;
}