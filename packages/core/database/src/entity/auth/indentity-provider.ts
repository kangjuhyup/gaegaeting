// src/entities/identity-provider.entity.ts
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { BaseEntity } from '../base';
import { TenantOrmEntity } from './tenant';

export type IdpProvider = 'kakao' | 'naver' | 'google' | 'apple';

@Entity({ name: 'identity_provider' })
@Unique('uk_idp', ['tenant', 'provider'])
export class IdentityProviderOrmEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @ManyToOne(() => TenantOrmEntity, (t) => t.idps, { nullable: false, onDelete: 'RESTRICT' })
  tenant!: TenantOrmEntity;

  @Column({ type: 'varchar', length: 20 })
  provider!: IdpProvider;

  @Column({ name: 'client_id', type: 'varchar', length: 191 })
  clientId!: string;

  @Column({ name: 'client_secret', type: 'varchar', length: 255, nullable: true })
  clientSecret?: string | null;

  @Column({ name: 'redirect_uri', type: 'varchar', length: 255 })
  redirectUri!: string;

  @Column({ type: 'tinyint', width: 1, default: 1 })
  enabled!: boolean;
}