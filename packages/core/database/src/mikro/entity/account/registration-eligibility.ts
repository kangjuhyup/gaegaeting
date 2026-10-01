import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/legacy';
import { BaseEntity } from '../base.js';

@Entity({ tableName: 'registration_eligibility' })
@Unique({ name: 'uk_registration_eligibility_di_digest', properties: ['diDigest'] })
@Unique({ name: 'uk_registration_eligibility_handoff_digest', properties: ['handoffDigest'] })
@Unique({ name: 'uk_registration_eligibility_attempt_id', properties: ['attemptId'] })
export class RegistrationEligibilityOrmEntity extends BaseEntity {
  @PrimaryKey({ columnType: 'char(26)' }) id!: string;
  @Property({ fieldName: 'user_id', columnType: 'char(26)' }) userId!: string;
  @Property({ columnType: 'varchar(32)' }) provider!: string;
  @Property({ fieldName: 'provider_transaction_id', columnType: 'varchar(128)', unique: true }) providerTransactionId!: string;
  @Property({ fieldName: 'di_digest', columnType: 'char(64)' }) diDigest!: string;
  @Property({ fieldName: 'di_key_version', columnType: 'smallint' }) diKeyVersion!: number;
  @Property({ columnType: 'boolean' }) adult!: boolean;
  @Property({ fieldName: 'tenant_id', columnType: 'varchar(128)' }) tenantId!: string;
  @Property({ fieldName: 'client_id', columnType: 'varchar(128)' }) clientId!: string;
  @Property({ fieldName: 'terms_version', columnType: 'varchar(64)' }) termsVersion!: string;
  @Property({ fieldName: 'terms_agreed_at', columnType: 'timestamptz' }) termsAgreedAt!: Date;
  @Property({ fieldName: 'handoff_digest', columnType: 'char(64)' }) handoffDigest!: string;
  @Property({ columnType: 'varchar(16)' }) status!: 'ISSUED' | 'CLAIMED' | 'USED';
  @Property({ fieldName: 'attempt_id', columnType: 'varchar(128)', nullable: true }) attemptId?: string;
  @Property({ fieldName: 'claimed_until', columnType: 'timestamptz', nullable: true }) claimedUntil?: Date;
  @Property({ fieldName: 'auth_issuer', columnType: 'varchar(255)', nullable: true }) authIssuer?: string;
  @Property({ fieldName: 'auth_subject', columnType: 'varchar(255)', nullable: true }) authSubject?: string;
  @Property({ fieldName: 'expires_at', columnType: 'timestamptz' }) expiresAt!: Date;
}
