import {
    Entity,
    PrimaryColumn,
    Column,
    Index,
  } from "typeorm";
  import { ItemLedgerStatus, ItemLedgerType, ItemReferenceType } from "../enums";
import { BaseEntity } from "../base";
import { ulid } from "ulid";
  
  @Entity({ name: "item_ledger" })
  @Index(["userId", "occurredAt"])
  @Index(["idempotencyKey"], { unique: true })
  @Index(["referenceType", "referenceId"])
  export class ItemLedger extends BaseEntity {
    @PrimaryColumn({ type: "char", length: 26 })
    userId!: string;
  
    @PrimaryColumn({ type: "char", length: 26 })
    ledgerId: string = ulid();
  
    @Column({ type: "enum", enum: ItemLedgerType })
    type!: ItemLedgerType;
  
    // +100, -10 같이 증감 수량으로 저장
    @Column({ type: "int" })
    amountItems!: number;
  
    @Column({ type: "enum", enum: ItemLedgerStatus, default: ItemLedgerStatus.POSTED })
    status!: ItemLedgerStatus;
  
    @Column({ type: "enum", enum: ItemReferenceType })
    referenceType!: ItemReferenceType;
  
    @Column({ type: "varchar", length: 64 })
    referenceId!: string; // paymentId / refundId / useId 등
  
    // 환불(REVOKE)이면 "어떤 결제(paymentId) 로트에 대한 것인지" 연결
    @Column({ type: "varchar", length: 64, nullable: true })
    originalReferenceId?: string;
  
    @Column({ type: "varchar", length: 128 })
    idempotencyKey!: string;
  
    @Column({ type: "timestamptz" })
    occurredAt!: Date;
}