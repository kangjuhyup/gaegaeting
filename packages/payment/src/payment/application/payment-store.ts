import type { Provider, VerifiedPurchase } from "../domain/payment.js";
import type { Offer } from "../../item/domain/item.js";
export type { Offer } from "../../item/domain/item.js";
export interface PreparedPurchase {
  id: string;
  userId: string;
  provider: Provider;
  accountToken: string;
  offer: Offer;
}
export interface Purchase {
  id: string;
  userId: string;
  provider: Provider;
  transactionId: string;
  state: "PURCHASED" | "REFUNDED";
  snackQuantity: number;
  priceKrw: number;
  amountMinor?: number;
  currency?: string;
  refundReview: boolean;
}
export interface PaymentJob {
  id: string;
  leaseToken: string;
  kind: "FINALIZE" | "NOTIFICATION";
  provider: Provider;
  encryptedProof: string;
  attempts: number;
}
export abstract class PaymentStore {
  abstract prepare(
    userId: string,
    provider: Provider,
    offerId: string,
  ): Promise<PreparedPurchase>;
  abstract prepared(id: string, userId: string): Promise<PreparedPurchase>;
  // A notification may recover a purchase only from a matching existing intent.
  abstract grant(
    preparedId: string | null,
    userId: string | null,
    purchase: VerifiedPurchase,
    encryptedProof: string,
  ): Promise<Purchase>;
  abstract refund(purchase: VerifiedPurchase): Promise<Purchase | null>;
  abstract restore(
    purchase: VerifiedPurchase,
    encryptedProof: string,
  ): Promise<Purchase>;
  abstract reconciliationCursor(provider: Provider): Promise<Date | null>;
  abstract saveReconciliationCursor(
    provider: Provider,
    through: Date,
  ): Promise<void>;
  abstract purchases(userId: string, after?: string): Promise<Purchase[]>;
  abstract requestRefund(userId: string, purchaseId: string): Promise<void>;
  abstract enqueueNotification(
    provider: Provider,
    eventId: string,
    encryptedProof: string,
  ): Promise<void>;
  abstract claimJobs(limit: number): Promise<PaymentJob[]>;
  abstract completeJob(id: string, leaseToken: string): Promise<void>;
  abstract failJob(id: string, leaseToken: string): Promise<void>;
  abstract close(): Promise<void>;
}
