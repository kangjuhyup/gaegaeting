import type { Pool, PoolClient } from "pg";
import { monotonicFactory } from "ulid";
import type { Wallet } from "../domain/wallet.js";
const nextId = monotonicFactory();
type Row = Record<string, any>;
export async function lockWallet(c: PoolClient, userId: string): Promise<Row> {
  await c.query(
    "INSERT INTO payment_wallet(user_id) VALUES($1) ON CONFLICT DO NOTHING",
    [userId],
  );
  return (
    await c.query("SELECT * FROM payment_wallet WHERE user_id=$1 FOR UPDATE", [
      userId,
    ])
  ).rows[0];
}
export async function readWallet(
  c: Pool | PoolClient,
  userId: string,
): Promise<Wallet> {
  const r = (
    await c.query(
      `SELECT w.balance,w.frozen,coalesce((SELECT sum(remaining) FROM payment_lot WHERE user_id=w.user_id AND refund_reserved),0)::integer reserved
      FROM payment_wallet w WHERE user_id=$1`,
      [userId],
    )
  ).rows[0];
  return r
    ? {
        balance: r.balance,
        availableBalance: r.frozen ? 0 : r.balance - r.reserved,
        frozen: r.frozen,
      }
    : { balance: 0, availableBalance: 0, frozen: false };
}

/** Caller holds the user's wallet lock; all writes use the purchase transaction. */
export async function creditPurchasedSnacks(
  c: PoolClient,
  userId: string,
  purchaseId: string,
  quantity: number,
): Promise<void> {
  await c.query(
    "INSERT INTO payment_lot(purchase_id,user_id,remaining) VALUES($1,$2,$3)",
    [purchaseId, userId, quantity],
  );
  await c.query(
    "INSERT INTO payment_ledger(id,user_id,kind,reference,delta) VALUES($1,$2,'GRANT',$3,$4)",
    [nextId(), userId, purchaseId, quantity],
  );
  await c.query(
    "UPDATE payment_wallet SET balance=balance+$2 WHERE user_id=$1",
    [userId, quantity],
  );
}
/** Store-authoritative refunds revoke remaining snacks and hold a used wallet for review. */
export async function revokePurchasedSnacks(
  c: PoolClient,
  userId: string,
  purchaseId: string,
  freeze: boolean,
  revision: number,
): Promise<void> {
  const lot = (
    await c.query("SELECT * FROM payment_lot WHERE purchase_id=$1 FOR UPDATE", [
      purchaseId,
    ])
  ).rows[0];
  await c.query(
    "UPDATE payment_lot SET remaining=0,refund_reserved=false WHERE purchase_id=$1",
    [purchaseId],
  );
  await c.query(
    "UPDATE payment_wallet SET balance=balance-$2,frozen=frozen OR $3 WHERE user_id=$1",
    [userId, lot.remaining, freeze],
  );
  await c.query(
    "INSERT INTO payment_ledger(id,user_id,kind,reference,delta) VALUES($1,$2,'REFUND',$3,$4)",
    [nextId(), userId, `${purchaseId}:${revision}`, -lot.remaining],
  );
}
export async function reservePurchasedSnacks(
  c: PoolClient,
  purchaseId: string,
): Promise<void> {
  await c.query(
    "UPDATE payment_lot SET refund_reserved=true WHERE purchase_id=$1",
    [purchaseId],
  );
}

/** Restores only credits actually revoked in this refund cycle, never previously spent credits. */
export async function restorePurchasedSnacks(
  c: PoolClient,
  userId: string,
  purchaseId: string,
  revision: number,
): Promise<void> {
  const refund = (
    await c.query(
      "SELECT delta FROM payment_ledger WHERE kind='REFUND' AND reference=$1",
      [`${purchaseId}:${revision}`],
    )
  ).rows[0];
  if (!refund) throw new Error("Refund ledger is missing");
  const restored = -refund.delta;
  await c.query(
    "UPDATE payment_lot SET remaining=remaining+$2,refund_reserved=false WHERE purchase_id=$1",
    [purchaseId, restored],
  );
  await c.query(
    "INSERT INTO payment_ledger(id,user_id,kind,reference,delta) VALUES($1,$2,'RESTORE',$3,$4)",
    [nextId(), userId, `${purchaseId}:${revision}`, restored],
  );
  await c.query(
    "UPDATE payment_wallet SET balance=balance+$2 WHERE user_id=$1",
    [userId, restored],
  );
}
