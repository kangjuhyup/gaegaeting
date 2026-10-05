import { randomUUID } from "node:crypto";
import { monotonicFactory } from "ulid";
import type { Pool, PoolClient } from "pg";
import { PaymentStore } from "../../application/payment-store.js";
import type {
  Offer,
  PreparedPurchase,
  Purchase,
  PaymentJob,
} from "../../application/payment-store.js";
import { PaymentError } from "../../domain/payment.js";
import type {
  Provider,
  StoreEnvironment,
  VerifiedPurchase,
} from "../../domain/payment.js";

import { withPaymentTransaction } from "../../../common/infrastructure/payment-database.js";
import {
  lockWallet,
  creditPurchasedSnacks,
  revokePurchasedSnacks,
  restorePurchasedSnacks,
  reservePurchasedSnacks,
} from "../../../wallet/infrastructure/wallet-persistence.js";
const nextId = monotonicFactory();
type Row = Record<string, any>;
const error = (code: string): never => {
  throw new PaymentError(code);
};
const purchaseView = (r: Row): Purchase => ({
  id: r.id,
  userId: r.user_id,
  provider: r.provider,
  transactionId: r.transaction_id,
  state: r.state,
  snackQuantity: r.snack_quantity,
  priceKrw: r.price_krw,
  amountMinor: r.amount_minor === null ? undefined : Number(r.amount_minor),
  currency: r.currency ?? undefined,
  refundReview: r.refund_review,
});
const preparedView = (r: Row): PreparedPurchase => ({
  id: r.id,
  userId: r.user_id,
  provider: r.provider,
  accountToken: r.account_token,
  offer: r.offer,
});

/** Owns the injected pool; SQL transactions serialize wallet changes and store transactions. */
export class PostgresPaymentStore extends PaymentStore {
  constructor(
    private readonly pool: Pool,
    private readonly environment: StoreEnvironment,
    private readonly leaseSeconds = 60,
  ) {
    super();
  }

  private async lockTransaction(
    client: PoolClient,
    p: VerifiedPurchase,
  ): Promise<void> {
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      JSON.stringify([p.provider, p.environment, p.transactionId]),
    ]);
  }
  private validate(p: VerifiedPurchase, state: "PURCHASED" | "REFUNDED"): void {
    if (p.environment !== this.environment) error("ENVIRONMENT_MISMATCH");
    if (p.state !== state) error("PURCHASE_NOT_COMPLETED");
    if (p.quantity !== 1) error("INVALID_PURCHASE_QUANTITY");
    if (
      !p.transactionId ||
      !p.productId ||
      !p.accountToken ||
      !Number.isFinite(p.purchasedAt.getTime())
    )
      error("INVALID_PURCHASE");
  }
  private samePurchase(
    r: Row,
    p: VerifiedPurchase,
    userId?: string | null,
  ): void {
    if (
      (userId && r.user_id !== userId) ||
      r.account_token !== p.accountToken.toLowerCase() ||
      r.store_product_id !== p.productId ||
      r.store_offer_id !== (p.storeOfferId ?? null)
    )
      error("PURCHASE_MISMATCH");
  }
  async prepare(
    userId: string,
    provider: Provider,
    offerId: string,
  ): Promise<PreparedPurchase> {
    return withPaymentTransaction(this.pool, async (c) => {
      const r = (
        await c.query(
          `SELECT o.id,o.product_id "productId",p.snack_quantity "snackQuantity",p.base_price_krw "basePriceKrw",o.price_krw "priceKrw",o.provider,
        o.store_product_id "storeProductId",o.store_offer_id "storeOfferId",o.event_name "eventName"
        FROM payment_offer o JOIN payment_product p ON p.id=o.product_id WHERE o.id=$1 AND o.provider=$2 AND o.enabled
        AND (o.starts_at IS NULL OR o.starts_at <= now()) AND (o.ends_at IS NULL OR o.ends_at > now()) FOR SHARE OF o,p`,
          [offerId, provider],
        )
      ).rows[0];
      if (!r) error("OFFER_UNAVAILABLE");
      await c.query(
        "INSERT INTO payment_identity(user_id,account_token) VALUES($1,$2) ON CONFLICT(user_id) DO NOTHING",
        [userId, randomUUID()],
      );
      const identity = (
        await c.query(
          "SELECT account_token FROM payment_identity WHERE user_id=$1",
          [userId],
        )
      ).rows[0];
      const saved = (
        await c.query(
          `INSERT INTO payment_intent(id,user_id,provider,environment,account_token,offer) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
          [
            nextId(),
            userId,
            provider,
            this.environment,
            identity.account_token,
            JSON.stringify(r),
          ],
        )
      ).rows[0];
      return preparedView(saved);
    });
  }
  async prepared(id: string, userId: string): Promise<PreparedPurchase> {
    const r = (
      await this.pool.query(
        "SELECT * FROM payment_intent WHERE id=$1 AND user_id=$2",
        [id, userId],
      )
    ).rows[0];
    if (!r) error("PURCHASE_INTENT_NOT_FOUND");
    return preparedView(r);
  }
  async grant(
    preparedId: string | null,
    userId: string | null,
    p: VerifiedPurchase,
    encryptedProof: string,
  ): Promise<Purchase> {
    this.validate(p, "PURCHASED");
    return withPaymentTransaction(this.pool, async (c) => {
      await this.lockTransaction(c, p);
      return this.grantInTransaction(c, preparedId, userId, p, encryptedProof);
    });
  }
  private async grantInTransaction(
    c: PoolClient,
    preparedId: string | null,
    userId: string | null,
    p: VerifiedPurchase,
    encryptedProof: string,
  ): Promise<Purchase> {
    const key = [p.provider, p.environment, p.transactionId];
    const prior = (
      await c.query(
        "SELECT * FROM payment_purchase WHERE provider=$1 AND environment=$2 AND transaction_id=$3",
        key,
      )
    ).rows[0];
    if (prior) {
      this.samePurchase(prior, p, userId);
      return purchaseView(prior);
    }
    if (
      (
        await c.query(
          "SELECT 1 FROM payment_refund_tombstone WHERE provider=$1 AND environment=$2 AND transaction_id=$3",
          key,
        )
      ).rowCount
    )
      error("PURCHASE_ALREADY_REFUNDED");
    const intent = preparedId
      ? (
          await c.query(
            "SELECT * FROM payment_intent WHERE id=$1 AND user_id=$2",
            [preparedId, userId],
          )
        ).rows[0]
      : (
          await c.query(
            `SELECT * FROM payment_intent WHERE provider=$1 AND environment=$2 AND account_token::text=$3 AND offer->>'storeProductId'=$4
          AND coalesce(offer->>'storeOfferId','')=$5 AND date_trunc('milliseconds',created_at) <= $6::timestamptz
          ORDER BY created_at DESC,id DESC LIMIT 1`,
            [
              p.provider,
              p.environment,
              p.accountToken.toLowerCase(),
              p.productId,
              p.storeOfferId ?? "",
              p.purchasedAt,
            ],
          )
        ).rows[0];
    if (!intent) error("PURCHASE_INTENT_NOT_FOUND");
    const offer: Offer = intent.offer;
    if (
      (userId && intent.user_id !== userId) ||
      intent.provider !== p.provider ||
      intent.environment !== p.environment ||
      intent.account_token !== p.accountToken.toLowerCase() ||
      offer.storeProductId !== p.productId ||
      (offer.storeOfferId ?? "") !== (p.storeOfferId ?? "") ||
      new Date(intent.created_at).getTime() > p.purchasedAt.getTime()
    )
      error("PURCHASE_MISMATCH");
    await lockWallet(c, intent.user_id);
    const id = nextId();
    const r = (
      await c.query(
        `INSERT INTO payment_purchase(id,intent_id,user_id,provider,environment,transaction_id,account_token,store_product_id,store_offer_id,
        state,snack_quantity,price_krw,amount_minor,currency,purchased_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'PURCHASED',$10,$11,$12,$13,$14) RETURNING *`,
        [
          id,
          intent.id,
          intent.user_id,
          p.provider,
          p.environment,
          p.transactionId,
          p.accountToken,
          p.productId,
          p.storeOfferId ?? null,
          offer.snackQuantity,
          offer.priceKrw,
          p.amountMinor ?? null,
          p.currency ?? null,
          p.purchasedAt,
        ],
      )
    ).rows[0];
    await creditPurchasedSnacks(c, intent.user_id, id, offer.snackQuantity);
    await c.query(
      "INSERT INTO payment_job(id,kind,provider,dedupe_key,encrypted_proof) VALUES($1,'FINALIZE',$2,$3,$4)",
      [
        nextId(),
        p.provider,
        `${p.environment}:${p.transactionId}`,
        encryptedProof,
      ],
    );
    return purchaseView(r);
  }
  async refund(p: VerifiedPurchase): Promise<Purchase | null> {
    this.validate(p, "REFUNDED");
    return withPaymentTransaction(this.pool, async (c) => {
      await this.lockTransaction(c, p);
      const key = [p.provider, p.environment, p.transactionId];
      const existing = (
        await c.query(
          "SELECT * FROM payment_purchase WHERE provider=$1 AND environment=$2 AND transaction_id=$3",
          key,
        )
      ).rows[0];
      if (existing) this.samePurchase(existing, p);
      await c.query(
        "INSERT INTO payment_refund_tombstone(provider,environment,transaction_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
        key,
      );
      if (!existing) return null;
      await lockWallet(c, existing.user_id);
      const r = (
        await c.query("SELECT * FROM payment_purchase WHERE id=$1 FOR UPDATE", [
          existing.id,
        ])
      ).rows[0];
      if (r.state === "REFUNDED") return purchaseView(r);
      await revokePurchasedSnacks(
        c,
        r.user_id,
        r.id,
        r.used_quantity > 0,
        r.refund_revision + 1,
      );
      const updated = (
        await c.query(
          "UPDATE payment_purchase SET state='REFUNDED',refund_review=$2,refund_revision=refund_revision+1 WHERE id=$1 RETURNING *",
          [r.id, r.used_quantity > 0],
        )
      ).rows[0];
      return purchaseView(updated);
    });
  }

  async restore(
    p: VerifiedPurchase,
    encryptedProof: string,
  ): Promise<Purchase> {
    this.validate(p, "PURCHASED");
    if (p.provider !== "APPLE" || !p.refundReversed)
      error("INVALID_REFUND_REVERSAL");
    return withPaymentTransaction(this.pool, async (c) => {
      await this.lockTransaction(c, p);
      const key = [p.provider, p.environment, p.transactionId];
      const existing = (
        await c.query(
          "SELECT * FROM payment_purchase WHERE provider=$1 AND environment=$2 AND transaction_id=$3",
          key,
        )
      ).rows[0];
      if (existing) this.samePurchase(existing, p);
      if (existing?.state === "PURCHASED") return purchaseView(existing);
      if (existing) {
        await lockWallet(c, existing.user_id);
        await restorePurchasedSnacks(
          c,
          existing.user_id,
          existing.id,
          existing.refund_revision,
        );
        const updated = (
          await c.query(
            "UPDATE payment_purchase SET state='PURCHASED',refund_review=false WHERE id=$1 RETURNING *",
            [existing.id],
          )
        ).rows[0];
        await c.query(
          "UPDATE payment_wallet SET frozen=EXISTS(SELECT 1 FROM payment_purchase WHERE user_id=$1 AND refund_review) WHERE user_id=$1",
          [existing.user_id],
        );
        await c.query(
          "DELETE FROM payment_refund_tombstone WHERE provider=$1 AND environment=$2 AND transaction_id=$3",
          key,
        );
        return purchaseView(updated);
      }
      await c.query(
        "DELETE FROM payment_refund_tombstone WHERE provider=$1 AND environment=$2 AND transaction_id=$3",
        key,
      );
      const granted = await this.grantInTransaction(
        c,
        null,
        null,
        p,
        encryptedProof,
      );
      return granted;
    });
  }
  async purchases(userId: string, after?: string): Promise<Purchase[]> {
    return (
      await this.pool.query(
        "SELECT * FROM payment_purchase WHERE user_id=$1 AND ($2::text IS NULL OR id < $2) ORDER BY id DESC LIMIT 20",
        [userId, after ?? null],
      )
    ).rows.map(purchaseView);
  }
  async requestRefund(userId: string, purchaseId: string): Promise<void> {
    await withPaymentTransaction(this.pool, async (c) => {
      await lockWallet(c, userId);
      const r = (
        await c.query(
          "SELECT * FROM payment_purchase WHERE id=$1 AND user_id=$2 FOR UPDATE",
          [purchaseId, userId],
        )
      ).rows[0];
      if (!r) error("PURCHASE_NOT_FOUND");
      if (r.state !== "PURCHASED") error("PURCHASE_ALREADY_REFUNDED");
      if (r.used_quantity > 0) error("PURCHASE_ALREADY_USED");
      await reservePurchasedSnacks(c, purchaseId);
    });
  }
  async enqueueNotification(
    provider: Provider,
    eventId: string,
    encryptedProof: string,
  ): Promise<void> {
    if (!eventId || !encryptedProof) error("INVALID_NOTIFICATION");
    await this.pool.query(
      "INSERT INTO payment_job(id,kind,provider,dedupe_key,encrypted_proof) VALUES($1,'NOTIFICATION',$2,$3,$4) ON CONFLICT(provider,kind,dedupe_key) DO NOTHING",
      [nextId(), provider, eventId, encryptedProof],
    );
  }
  async claimJobs(limit: number): Promise<PaymentJob[]> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)
      error("INVALID_JOB_LIMIT");
    const result = await this.pool.query(
      `WITH ready AS (
      SELECT id FROM payment_job WHERE completed_at IS NULL AND next_attempt_at <= now() AND (lease_until IS NULL OR lease_until <= now())
      ORDER BY next_attempt_at,id LIMIT $1 FOR UPDATE SKIP LOCKED
    ) UPDATE payment_job j SET lease_token=$2,lease_until=now()+($3 * interval '1 second'),attempts=attempts+1 FROM ready WHERE j.id=ready.id RETURNING j.*`,
      [limit, randomUUID(), this.leaseSeconds],
    );
    return result.rows.map((r) => ({
      id: r.id,
      leaseToken: r.lease_token,
      kind: r.kind,
      provider: r.provider,
      encryptedProof: r.encrypted_proof,
      attempts: r.attempts,
    }));
  }
  async completeJob(id: string, leaseToken: string): Promise<void> {
    await this.pool.query(
      "UPDATE payment_job SET completed_at=now(),lease_token=NULL,lease_until=NULL WHERE id=$1 AND lease_token=$2 AND lease_until > now()",
      [id, leaseToken],
    );
  }
  async failJob(id: string, leaseToken: string): Promise<void> {
    await this.pool.query(
      `UPDATE payment_job SET lease_token=NULL,lease_until=NULL,next_attempt_at=now()+(least(3600,power(2,least(attempts,12))) * interval '1 second')
      WHERE id=$1 AND lease_token=$2 AND lease_until > now()`,
      [id, leaseToken],
    );
  }
  async reconciliationCursor(provider: Provider): Promise<Date | null> {
    const row = (
      await this.pool.query(
        "SELECT last_checked_at FROM payment_reconciliation WHERE provider=$1",
        [provider],
      )
    ).rows[0];
    return row?.last_checked_at ?? null;
  }
  async saveReconciliationCursor(
    provider: Provider,
    date: Date,
  ): Promise<void> {
    if (!Number.isFinite(date.getTime()))
      error("INVALID_RECONCILIATION_CURSOR");
    await this.pool.query(
      "INSERT INTO payment_reconciliation(provider,last_checked_at) VALUES($1,$2) ON CONFLICT(provider) DO UPDATE SET last_checked_at=greatest(payment_reconciliation.last_checked_at,excluded.last_checked_at)",
      [provider, date],
    );
  }
  async close(): Promise<void> {
    await this.pool.end();
  }
}
