import { ItemLedgerEntity } from '../model/item-ledger';

export abstract class ItemLedgerRepositoryPort {
  /**
   * idempotencyKey unique를 이용해 중복 컨슈밍을 방지한다.
   * @returns true if inserted, false if duplicated(already processed)
   */
  abstract insertIdempotent(ledger: ItemLedgerEntity): Promise<boolean>;
}


