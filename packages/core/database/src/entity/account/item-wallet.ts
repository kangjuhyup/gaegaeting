import { Entity, PrimaryColumn, Column, UpdateDateColumn } from "typeorm";
import { BaseEntity } from "../base";

@Entity({ name: "item_wallet" })
export class ItemWalletOrmEntity extends BaseEntity {
  @PrimaryColumn({ type: "char", length: 26 })
  userId!: string;

  @Column({ type: "int", default: 0 })
  balanceItems!: number;
}