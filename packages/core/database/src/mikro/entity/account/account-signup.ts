import {
  Entity,
  PrimaryKey,
  Property,
  Unique,
} from "@mikro-orm/decorators/legacy";
import { BaseEntity } from "../base.js";

@Entity({ tableName: "account_signup" })
@Unique({ name: "uk_account_signup_di_digest", properties: ["diDigest"] })
export class AccountSignupOrmEntity extends BaseEntity {
  @PrimaryKey({ columnType: "char(26)" }) id!: string;
  @Property({ fieldName: "user_id", columnType: "char(26)" }) userId!: string;
  @Property({ fieldName: "di_digest", columnType: "char(64)" })
  diDigest!: string;
  @Property({ columnType: "varchar(64)" }) username!: string;
  @Property({ fieldName: "terms_version", columnType: "varchar(64)" })
  termsVersion!: string;
  @Property({ fieldName: "terms_agreed_at", columnType: "timestamptz" })
  termsAgreedAt!: Date;
  @Property({ fieldName: "auth_issuer", columnType: "varchar(255)" })
  authIssuer!: string;
  @Property({
    fieldName: "auth_subject",
    columnType: "varchar(255)",
    nullable: true,
  })
  authSubject?: string;
  @Property({ columnType: "varchar(16)" }) status!: "PENDING" | "COMPLETED";
  @Property({ columnType: "varchar(50)", nullable: true }) name?: string;
  @Property({
    fieldName: "birth_date",
    columnType: "timestamptz",
    nullable: true,
  })
  birthDate?: Date;
  @Property({ columnType: "varchar(6)", nullable: true }) gender?:
    | "MALE"
    | "FEMALE";
  @Property({ columnType: "varchar(32)", nullable: true }) phone?: string;
  @Property({
    fieldName: "verification_provider",
    columnType: "varchar(32)",
    nullable: true,
  })
  verificationProvider?: string;
  @Property({
    fieldName: "provider_transaction_id",
    columnType: "varchar(128)",
    nullable: true,
  })
  providerTransactionId?: string;
  @Property({
    fieldName: "verified_at",
    columnType: "timestamptz",
    nullable: true,
  })
  verifiedAt?: Date;
}
