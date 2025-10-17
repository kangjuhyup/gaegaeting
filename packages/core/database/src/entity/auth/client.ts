import { Column, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { BaseEntity } from '../base';
import { TenantOrmEntity } from './tenant';
import { UserRoleOrmEntity } from './user-role';
import { GroupRoleOrmEntity } from './group-role';
import { TenantClientOrmEntity } from './tenant-client';

export type ClientType = 'confidential' | 'public' | 'service';

@Entity({ name: 'client' })
@Unique('uk_client_tenant_clientid', ['tenant', 'clientId'])
export class ClientOrmEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @ManyToOne(() => TenantOrmEntity, (t) => t.clients, { nullable: false, onDelete: 'RESTRICT' })
  tenant!: TenantOrmEntity;

  @Column({ name: 'client_id', type: 'varchar', length: 128 })
  @Index()
  clientId!: string;

  @Column({ name: 'secret_hash', type: 'varchar', length: 255, nullable: true })
  secretHash?: string | null;

  @Column({ type: 'varchar', length: 128 })
  name!: string;

  @Column({ type: 'varchar', length : 20, default: 'public' })
  type!: ClientType;

  @Column({ type: 'tinyint', width: 1, default: 1 })
  enabled!: boolean;

  @OneToMany(() => UserRoleOrmEntity, (ur) => ur.client) 
  userRoles!: UserRoleOrmEntity[];
  
  @OneToMany(() => GroupRoleOrmEntity, (gr) => gr.client) 
  groupRoles!: GroupRoleOrmEntity[];
  
  @OneToMany(() => TenantClientOrmEntity, (tc) => tc.client) 
  tenantClients!: TenantClientOrmEntity[];
}