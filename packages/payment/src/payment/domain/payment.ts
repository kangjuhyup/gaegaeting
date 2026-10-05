import type { Provider, StoreEnvironment } from "../../common/domain/store.js";
export type { Provider, StoreEnvironment } from "../../common/domain/store.js";
export type PurchaseState = "PENDING" | "PURCHASED" | "REFUNDED";

export interface VerifiedPurchase {
  provider: Provider;
  transactionId: string;
  productId: string;
  accountToken: string;
  environment: StoreEnvironment;
  state: PurchaseState;
  quantity: number;
  purchasedAt: Date;
  storeOfferId?: string;
  amountMinor?: number;
  currency?: string;
  // Set only by an authenticated Apple reversal event AND a current Purchased lookup.
  refundReversed?: boolean;
}

export interface StoreNotification {
  eventId: string;
  proof: string;
}

export abstract class StorePort {
  abstract readonly provider: Provider;
  abstract verify(proof: string): Promise<VerifiedPurchase>;
  abstract finalize(proof: string): Promise<void>;
  abstract notification(
    body: unknown,
    authorization?: string,
  ): Promise<StoreNotification>;
  // Refund reconciliation must work even when a notification was lost.
  abstract refunds(since: Date): Promise<StoreNotification[]>;
}

export { PaymentError } from "../../common/domain/payment-error.js";
