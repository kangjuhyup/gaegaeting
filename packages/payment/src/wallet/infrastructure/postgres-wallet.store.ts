import type { Pool } from "pg";
import { monotonicFactory } from "ulid";
import { WalletStore } from "../application/wallet-store.js";
import type { Wallet } from "../domain/wallet.js";
import { PaymentError } from "../../common/domain/payment-error.js";
import { withPaymentTransaction } from "../../common/infrastructure/payment-database.js";
import { lockWallet, readWallet } from "./wallet-persistence.js";
const nextId = monotonicFactory();
const error = (code: string): never => {
  throw new PaymentError(code);
};
export class PostgresWalletStore extends WalletStore {
  constructor(private readonly pool: Pool) {
    super();
  }
  async wallet(userId: string): Promise<Wallet> {
    return readWallet(this.pool, userId);
  }
  async spend(
    userId: string,
    quantity: number,
    reference: string,
  ): Promise<Wallet> {
    if (!Number.isSafeInteger(quantity) || quantity <= 0 || !reference)
      error("INVALID_SPEND");
    return withPaymentTransaction(this.pool, async (c) => {
      // Global references are also locked so another user's retry cannot consume credits.
      await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,1))", [
        reference,
      ]);
      const wallet = await lockWallet(c, userId);
      const prior = (
        await c.query(
          "SELECT * FROM payment_ledger WHERE kind='SPEND' AND reference=$1",
          [reference],
        )
      ).rows[0];
      if (prior) {
        if (prior.user_id !== userId || prior.delta !== -quantity)
          error("SPEND_REFERENCE_MISMATCH");
        return readWallet(c, userId);
      }
      if (wallet.frozen) error("WALLET_FROZEN");
      const available = await readWallet(c, userId);
      if (available.availableBalance < quantity) error("INSUFFICIENT_SNACKS");
      const lots = (
        await c.query(
          "SELECT l.* FROM payment_lot l JOIN payment_purchase p ON p.id=l.purchase_id WHERE l.user_id=$1 AND l.remaining>0 AND NOT l.refund_reserved ORDER BY p.purchased_at,p.id FOR UPDATE OF l",
          [userId],
        )
      ).rows;
      const ledgerId = nextId();
      await c.query(
        "INSERT INTO payment_ledger(id,user_id,kind,reference,delta) VALUES($1,$2,'SPEND',$3,$4)",
        [ledgerId, userId, reference, -quantity],
      );
      let needed = quantity;
      for (const lot of lots) {
        const used = Math.min(needed, lot.remaining);
        await c.query(
          "UPDATE payment_lot SET remaining=remaining-$2 WHERE purchase_id=$1",
          [lot.purchase_id, used],
        );
        await c.query(
          "UPDATE payment_purchase SET used_quantity=used_quantity+$2 WHERE id=$1",
          [lot.purchase_id, used],
        );
        await c.query(
          "INSERT INTO payment_spend_allocation(ledger_id,purchase_id,quantity) VALUES($1,$2,$3)",
          [ledgerId, lot.purchase_id, used],
        );
        needed -= used;
        if (!needed) break;
      }
      if (needed) error("WALLET_INCONSISTENT");
      await c.query(
        "UPDATE payment_wallet SET balance=balance-$2 WHERE user_id=$1",
        [userId, quantity],
      );
      return readWallet(c, userId);
    });
  }
}
