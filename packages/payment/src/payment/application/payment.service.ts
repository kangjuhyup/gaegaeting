import {
  PaymentError,
  type Provider,
  type StoreEnvironment,
  type StorePort,
} from "../domain/payment.js";
import { PaymentStore } from "./payment-store.js";
import { ItemService } from "../../item/application/item.service.js";
import { ProofEncryption } from "./proof-encryption.js";

export interface Confirmation {
  id: string;
  state: "PENDING" | "PURCHASED" | "REFUNDED";
  snackQuantity: number;
}

export class PaymentService {
  constructor(
    private readonly store: PaymentStore,
    private readonly stores: readonly StorePort[],
    private readonly vault: ProofEncryption,
    private readonly environment: StoreEnvironment,
    private readonly items: ItemService,
  ) {}
  private adapter(provider: Provider): StorePort {
    const adapter = this.stores.find(
      (candidate) => candidate.provider === provider,
    );
    if (!adapter) throw new PaymentError("STORE_UNAVAILABLE");
    return adapter;
  }
  async prepare(userId: string, provider: Provider, offerId: string) {
    this.adapter(provider);
    await this.items.requireOffer(provider, offerId);
    return this.store.prepare(userId, provider, offerId);
  }
  purchases(userId: string, after?: string) {
    return this.store.purchases(userId, after);
  }

  async confirm(
    userId: string,
    preparedId: string,
    proof: string,
  ): Promise<Confirmation> {
    if (!proof || proof.length > 65_536)
      throw new PaymentError("INVALID_PROOF");
    const intent = await this.store.prepared(preparedId, userId);
    const verified = await this.adapter(intent.provider).verify(proof);
    if (
      verified.provider !== intent.provider ||
      verified.environment !== this.environment ||
      verified.productId !== intent.offer.storeProductId ||
      verified.accountToken.toLowerCase() !==
        intent.accountToken.toLowerCase() ||
      verified.quantity !== 1 ||
      (intent.offer.storeOfferId &&
        verified.storeOfferId !== intent.offer.storeOfferId)
    ) {
      throw new PaymentError("PURCHASE_MISMATCH");
    }
    if (verified.state === "PENDING")
      return { id: intent.id, state: "PENDING", snackQuantity: 0 };
    if (verified.state === "REFUNDED") {
      const purchase = await this.store.refund(verified);
      return {
        id: purchase?.id ?? intent.id,
        state: "REFUNDED",
        snackQuantity: 0,
      };
    }
    const purchase = verified.refundReversed
      ? await this.store.restore(verified, this.vault.encrypt(proof))
      : await this.store.grant(
          intent.id,
          userId,
          verified,
          this.vault.encrypt(proof),
        );
    return {
      id: purchase.id,
      state: purchase.state,
      snackQuantity: purchase.snackQuantity,
    };
  }

  async notification(
    provider: Provider,
    body: unknown,
    authorization?: string,
  ) {
    let event;
    try {
      event = await this.adapter(provider).notification(body, authorization);
    } catch (error) {
      if (
        error instanceof PaymentError &&
        error.code === "UNSUPPORTED_STORE_NOTIFICATION"
      )
        return;
      throw error;
    }
    if (!event.eventId || !event.proof || event.proof.length > 65_536)
      throw new PaymentError("INVALID_NOTIFICATION");
    await this.store.enqueueNotification(
      provider,
      event.eventId,
      this.vault.encrypt(event.proof),
    );
  }

  async processJobs(): Promise<{ completed: number; failed: number }> {
    const jobs = await this.store.claimJobs(5);
    let completed = 0,
      failed = 0;
    for (const job of jobs) {
      try {
        const proof = this.vault.decrypt(job.encryptedProof);
        const adapter = this.adapter(job.provider);
        if (job.kind === "FINALIZE") {
          const purchase = await adapter.verify(proof);
          if (
            purchase.environment !== this.environment ||
            purchase.provider !== job.provider
          )
            throw new PaymentError("PURCHASE_MISMATCH");
          if (purchase.state === "REFUNDED") await this.store.refund(purchase);
          else if (purchase.state === "PURCHASED")
            await adapter.finalize(proof);
          else throw new PaymentError("PURCHASE_NOT_COMPLETED");
        } else {
          const purchase = await adapter.verify(proof);
          if (
            purchase.environment !== this.environment ||
            purchase.provider !== job.provider
          )
            throw new PaymentError("PURCHASE_MISMATCH");
          if (purchase.state === "REFUNDED") await this.store.refund(purchase);
          else if (purchase.state === "PURCHASED") {
            if (purchase.refundReversed)
              await this.store.restore(purchase, this.vault.encrypt(proof));
            else
              await this.store.grant(
                null,
                null,
                purchase,
                this.vault.encrypt(proof),
              );
          }
        }
        await this.store.completeJob(job.id, job.leaseToken);
        completed++;
      } catch {
        await this.store.failJob(job.id, job.leaseToken);
        failed++;
      }
    }
    return { completed, failed };
  }

  async reconcileRefunds() {
    const failures: string[] = [];
    for (const adapter of this.stores) {
      try {
        const through = new Date();
        const cursor = await this.store.reconciliationCursor(adapter.provider);
        const since = cursor
          ? new Date(cursor.getTime() - 3_600_000)
          : new Date(through.getTime() - 28 * 86_400_000);
        const retention =
          (adapter.provider === "APPLE" && this.environment === "Production"
            ? 180
            : 30) * 86_400_000;
        if (since.getTime() < through.getTime() - retention)
          throw new PaymentError("REFUND_RECONCILIATION_WINDOW_EXCEEDED");
        const events = await adapter.refunds(since);
        for (const event of events) {
          if (!event.eventId || !event.proof || event.proof.length > 65_536)
            throw new PaymentError("INVALID_NOTIFICATION");
          await this.store.enqueueNotification(
            adapter.provider,
            event.eventId,
            this.vault.encrypt(event.proof),
          );
        }
        await this.store.saveReconciliationCursor(adapter.provider, through);
      } catch (error) {
        const code =
          error instanceof PaymentError ? error.code : "STORE_UNAVAILABLE";
        failures.push(code);
        console.error(
          JSON.stringify({
            name: "Payment-Worker",
            event:
              code === "REFUND_RECONCILIATION_WINDOW_EXCEEDED"
                ? "refund_reconciliation_requires_review"
                : "refund_reconciliation_failed",
            provider: adapter.provider,
            code,
          }),
        );
      }
    }
    if (failures.length)
      throw new PaymentError(
        failures.includes("REFUND_RECONCILIATION_WINDOW_EXCEEDED")
          ? "REFUND_RECONCILIATION_WINDOW_EXCEEDED"
          : "STORE_UNAVAILABLE",
      );
  }
}
