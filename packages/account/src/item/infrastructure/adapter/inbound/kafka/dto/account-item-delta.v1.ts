import { ItemLedgerType, ItemReferenceType } from '@app/item/domain/enum/item-ledger';

/**
 * account.item.delta.v1
 *
 * - amountItems: +면 지급, -면 사용/환불 회수
 * - idempotencyKey: 중복 컨슈밍 방지(필수)
 */
export type AccountItemDeltaV1 = {
  userId: string;
  amountItems: number;
  ledgerType: ItemLedgerType;
  referenceType: ItemReferenceType;
  referenceId: string;
  idempotencyKey: string;
  occurredAt?: string; // ISO
  originalReferenceId?: string;
};


