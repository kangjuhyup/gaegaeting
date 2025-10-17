import { Column, Entity, OneToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { TenantOrmEntity } from './tenant';

export type SignupPolicy = 'invite' | 'open';

@Entity({ name: 'tenant_config' })
export class TenantConfigOrmEntity {
  // 1:1 (PK = FK)
  @PrimaryColumn({ name: 'tenant_id', type: 'bigint' })
  tenantId!: string;

  @OneToOne(() => TenantOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantOrmEntity;

  @Column({ name: 'signup_policy', type: 'varchar', length :10 ,default : 'open' })
  signupPolicy!: SignupPolicy;

  @Column({ name: 'require_phone_verify', type: 'tinyint', width: 1, default: 0 })
  requirePhoneVerify!: boolean;

  @Column({ name: 'brand_name', type: 'varchar', length: 128, nullable: true })
  brandName?: string | null;

  @Column({ name: 'extra', type: 'json', nullable: true })
  extra?: Record<string, any> | null;
}