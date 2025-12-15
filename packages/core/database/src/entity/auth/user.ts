import { Column, Entity, Index, ManyToOne, OneToMany, PrimaryColumn, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { BaseEntity } from '../base';
import { TenantOrmEntity } from './tenant';
import { UserGroupOrmEntity } from './user-group';
import { UserRoleOrmEntity } from './user-role';
import { UserIdentityOrmEntity } from './user-identity';
import { ulid } from 'ulid';
import { Boolean01Transformer } from '../../transformer/boolean.transformer';

export type UserStatus = 'ACTIVE' | 'LOCKED' | 'DISABLED';

@Entity({ name: 'user' })
@Unique('uk_user_tenant_username', ['tenant', 'username'])
@Unique('uk_user_tenant_email', ['tenant', 'email'])
export class UserOrmEntity extends BaseEntity {
  @PrimaryColumn({ type: 'char', length: 26 })
  id: string = ulid();

  @ManyToOne(() => TenantOrmEntity, (t) => t.users, { nullable: false, onDelete: 'RESTRICT' })
  tenant!: TenantOrmEntity;

  @Column({ type: 'varchar', length: 128 })
  @Index()
  username!: string;

  @Column({ type: 'varchar', length: 191, nullable: true })
  email?: string | null;

  @Column({
    name: 'email_verified',
    type: 'tinyint',
    width: 1,
    default: 0,
    transformer: Boolean01Transformer,
  })
  emailVerified!: boolean;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone?: string | null;

  @Column({
    name: 'phone_verified',
    type: 'tinyint',
    width: 1,
    default: 0,
    transformer: Boolean01Transformer,
  })
  phoneVerified!: boolean;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: true })
  passwordHash?: string | null;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status!: UserStatus;

  @OneToMany(() => UserGroupOrmEntity, (ug) => ug.user) userGroups!: UserGroupOrmEntity[];
  @OneToMany(() => UserRoleOrmEntity, (ur) => ur.user) userRoles!: UserRoleOrmEntity[];
  @OneToMany(() => UserIdentityOrmEntity, (ui) => ui.user) identities!: UserIdentityOrmEntity[];
}