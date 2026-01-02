// account/entities/item-lot.entity.ts
import { Entity, PrimaryColumn, Column, Index } from "typeorm";
import { ItemLotStatus } from "./enum/item";
import { BaseEntity } from "../base";

@Entity({ name: "item_lot" })
@Index(["userId", "createdAt"])
export class ItemLotOrmEntity extends BaseEntity {
  // userId + lotId 로 복합 PK
  @PrimaryColumn({ type: "char", length: 26 })
  userId!: string;

  @PrimaryColumn({ type: "char", length: 26 })
  paymentId!: string;

  @Column({ type: "int" })
  grantedItems!: number;

  @Column({ type: "int" })
  remainingItems!: number;

  @Column({ type: "enum", enum: ItemLotStatus, default: ItemLotStatus.OPEN })
  status!: ItemLotStatus;
}