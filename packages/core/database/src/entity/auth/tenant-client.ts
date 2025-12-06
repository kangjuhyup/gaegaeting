import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { TenantOrmEntity } from './tenant';
import { ClientOrmEntity } from './client';
import { BaseEntity } from '../base';

@Entity({ name: 'tenant_client' })
@Unique('uk_tc', ['tenant', 'client'])
export class TenantClientOrmEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @ManyToOne(() => TenantOrmEntity, (t) => t.tenantClients, { nullable: false, onDelete: 'CASCADE' })
  tenant!: TenantOrmEntity;

  @ManyToOne(() => ClientOrmEntity, (c) => c.tenantClients, { nullable: false, onDelete: 'CASCADE' })
  client!: ClientOrmEntity;

  @Column({ type: 'tinyint', width: 1, default: 1 })
  enabled!: boolean;
}