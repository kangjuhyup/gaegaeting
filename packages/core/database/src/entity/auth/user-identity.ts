import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, Unique, Index } from 'typeorm';
import { TenantOrmEntity } from './tenant';
import { UserOrmEntity } from './user';
import { IdpProvider } from './indentity-provider';
import { BaseEntity } from '../base';

@Entity({ name: 'user_identity' })
@Unique('uk_user_identity', ['tenant', 'provider', 'providerSub'])
export class UserIdentityOrmEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @ManyToOne(() => TenantOrmEntity, (t) => t.userIdentities, { nullable: false, onDelete: 'RESTRICT' })
  tenant!: TenantOrmEntity;

  @ManyToOne(() => UserOrmEntity, (u) => u.identities, { nullable: false, onDelete: 'CASCADE' })
  user!: UserOrmEntity;

  @Column({ type: 'varchar', length: 20 })
  provider!: IdpProvider;

  @Column({ name: 'provider_sub', type: 'varchar', length: 191 })
  @Index()
  providerSub!: string;

  @Column({ type: 'varchar', length: 191, nullable: true })
  email?: string | null;

  @Column({ name: 'profile_json', type: 'json', nullable: true })
  profileJson?: Record<string, any> | null;

  @Column({ name: 'linked_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  linkedAt!: Date;
}