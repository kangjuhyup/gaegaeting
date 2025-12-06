import { Column, Entity, Index, PrimaryGeneratedColumn, OneToMany, Unique, BaseEntity } from 'typeorm';
import { ClientOrmEntity } from './client';
import { UserOrmEntity } from './user';
import { GroupOrmEntity } from './group';
import { RoleOrmEntity } from './role';
import { PermissionOrmEntity } from './permission';
import { IdentityProviderOrmEntity } from './indentity-provider';
import { UserIdentityOrmEntity } from './user-identity';
import { TenantClientOrmEntity } from './tenant-client';

@Entity({ name: 'tenant' })
@Unique('uk_tenant_code', ['code'])
export class TenantOrmEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  @Index()
  code!: string;

  @Column({ type: 'varchar', length: 128 })
  name!: string;

  @OneToMany(() => ClientOrmEntity, (c) => c.tenant) clients!: ClientOrmEntity[];
  @OneToMany(() => UserOrmEntity, (u) => u.tenant) users!: UserOrmEntity[];
  @OneToMany(() => GroupOrmEntity, (g) => g.tenant) groups!: GroupOrmEntity[];
  @OneToMany(() => RoleOrmEntity, (r) => r.tenant) roles!: RoleOrmEntity[];
  @OneToMany(() => PermissionOrmEntity, (p) => p.tenant) permissions!: PermissionOrmEntity[];
  @OneToMany(() => IdentityProviderOrmEntity, (i) => i.tenant) idps!: IdentityProviderOrmEntity[];
  @OneToMany(() => UserIdentityOrmEntity, (ui) => ui.tenant) userIdentities!: UserIdentityOrmEntity[];
  @OneToMany(() => TenantClientOrmEntity, (tc) => tc.tenant) tenantClients!: TenantClientOrmEntity[];
}