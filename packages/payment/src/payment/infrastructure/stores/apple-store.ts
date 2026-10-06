import {
  AppStoreServerAPIClient,
  Environment,
  NotificationTypeV2,
  SignedDataVerifier,
  VerificationException,
  VerificationStatus,
} from "@apple/app-store-server-library";
import type { JWSTransactionDecodedPayload } from "@apple/app-store-server-library";
import { PaymentError, StorePort } from "../../domain/payment.js";
import type {
  StoreEnvironment,
  StoreNotification,
  VerifiedPurchase,
} from "../../domain/payment.js";
import { AppleApiClientWithTimeout } from "./apple-api-client.js";

export interface AppleStoreOptions {
  bundleId: string;
  environment: StoreEnvironment;
  appAppleId?: number;
  signingKey: string;
  keyId: string;
  issuerId: string;
  rootCertificates: Buffer[];
  productIds: readonly string[];
}

export interface AppleStoreDependencies {
  client: Pick<
    AppStoreServerAPIClient,
    "getTransactionInfo" | "getNotificationHistory"
  >;
  verifier: Pick<
    SignedDataVerifier,
    "verifyAndDecodeTransaction" | "verifyAndDecodeNotification"
  >;
}

export class AppleStoreAdapter extends StorePort {
  readonly provider = "APPLE" as const;
  private readonly client: AppleStoreDependencies["client"];
  private readonly verifier: AppleStoreDependencies["verifier"];

  constructor(
    private readonly options: AppleStoreOptions,
    dependencies?: AppleStoreDependencies,
  ) {
    super();
    if (
      !options.bundleId ||
      !options.signingKey ||
      !options.keyId ||
      !options.issuerId ||
      !options.rootCertificates.length ||
      !options.productIds.length ||
      !["Sandbox", "Production"].includes(options.environment) ||
      (options.environment === "Production" &&
        (!Number.isSafeInteger(options.appAppleId) || options.appAppleId <= 0))
    ) {
      throw new PaymentError("INVALID_STORE_CONFIGURATION");
    }
    const environment =
      options.environment === "Production"
        ? Environment.PRODUCTION
        : Environment.SANDBOX;
    this.client =
      dependencies?.client ??
      new AppleApiClientWithTimeout(
        options.signingKey,
        options.keyId,
        options.issuerId,
        options.bundleId,
        environment,
      );
    // Online certificate revocation checks must stay enabled in both environments.
    this.verifier =
      dependencies?.verifier ??
      new SignedDataVerifier(
        options.rootCertificates,
        true,
        environment,
        options.bundleId,
        options.appAppleId,
      );
  }

  async verify(proof: string): Promise<VerifiedPurchase> {
    if (typeof proof !== "string" || !proof.length || proof.length > 65_536)
      throw new PaymentError("INVALID_STORE_PROOF");
    let transactionId = proof;
    let reversal = false;
    if (proof.trimStart().startsWith("{")) {
      let wrapper: { appleNotification?: unknown };
      try {
        wrapper = JSON.parse(proof);
      } catch {
        throw new PaymentError("INVALID_STORE_PROOF");
      }
      if (
        !wrapper ||
        typeof wrapper !== "object" ||
        Object.keys(wrapper).length !== 1 ||
        typeof wrapper.appleNotification !== "string"
      ) {
        throw new PaymentError("INVALID_STORE_PROOF");
      }
      const notification = await this.decodeNotification(
        wrapper.appleNotification,
      );
      if (notification.notificationType !== NotificationTypeV2.REFUND_REVERSED)
        throw new PaymentError("INVALID_STORE_PROOF");
      transactionId = (
        await this.decodeTransaction(notification.data.signedTransactionInfo)
      ).transactionId;
      reversal = true;
    } else if (proof.includes("."))
      transactionId = (await this.decodeTransaction(proof)).transactionId;
    if (!transactionId || !/^\d+$/.test(transactionId))
      throw new PaymentError("INVALID_STORE_PROOF");
    // A valid old JWS does not prove that a purchase has not subsequently been refunded.
    let current: string | undefined;
    try {
      current = (await this.client.getTransactionInfo(transactionId))
        .signedTransactionInfo;
    } catch {
      throw new PaymentError("STORE_UNAVAILABLE");
    }
    if (!current) throw new PaymentError("INVALID_STORE_PROOF");
    const transaction = await this.decodeTransaction(current);
    if (transaction.transactionId !== transactionId)
      throw new PaymentError("INVALID_STORE_PROOF");
    const purchase = this.purchase(transaction);
    // A client flag or an old restored purchase never authorizes restoring a refunded grant.
    if (reversal) purchase.refundReversed = purchase.state === "PURCHASED";
    return purchase;
  }

  async finalize(_proof: string): Promise<void> {
    // Standard StoreKit consumables are finished on-device after the server commits the grant.
  }

  async notification(body: unknown): Promise<StoreNotification> {
    if (
      !body ||
      typeof body !== "object" ||
      typeof (body as { signedPayload?: unknown }).signedPayload !== "string"
    ) {
      throw new PaymentError("INVALID_STORE_NOTIFICATION");
    }
    const signedPayload = (body as { signedPayload: string }).signedPayload;
    const decoded = await this.decodeNotification(signedPayload);
    const data = decoded.data;
    // REFUND_REVERSED also goes through current-state verification, never blindly re-granting.
    this.purchase(await this.decodeTransaction(data.signedTransactionInfo));
    const proof =
      decoded.notificationType === NotificationTypeV2.REFUND_REVERSED
        ? JSON.stringify({ appleNotification: signedPayload })
        : data.signedTransactionInfo;
    if (proof.length > 65_536)
      throw new PaymentError("INVALID_STORE_NOTIFICATION");
    return { eventId: decoded.notificationUUID, proof };
  }

  async refunds(since: Date): Promise<StoreNotification[]> {
    const endDate = Date.now();
    const startDate = since.getTime();
    // Sandbox history is retained for 30 days; production history for 180 days.
    const retentionDays = this.options.environment === "Sandbox" ? 30 : 180;
    if (
      !Number.isFinite(startDate) ||
      startDate < endDate - retentionDays * 86_400_000 ||
      startDate > endDate
    ) {
      throw new PaymentError("REFUND_RECONCILIATION_WINDOW_EXCEEDED");
    }
    if (startDate === endDate) return [];
    const notifications: StoreNotification[] = [];
    let token: string | null = null;
    const seen = new Set<string>();
    do {
      let page: Awaited<
        ReturnType<AppStoreServerAPIClient["getNotificationHistory"]>
      >;
      try {
        page = await this.client.getNotificationHistory(token, {
          startDate,
          endDate,
        });
      } catch {
        throw new PaymentError("STORE_UNAVAILABLE");
      }
      for (const item of page.notificationHistory ?? []) {
        if (!item.signedPayload)
          throw new PaymentError("INVALID_STORE_NOTIFICATION");
        let decoded: Awaited<
          ReturnType<SignedDataVerifier["verifyAndDecodeNotification"]>
        >;
        try {
          decoded = await this.verifier.verifyAndDecodeNotification(
            item.signedPayload,
          );
        } catch (error) {
          throw this.verificationError(error, "INVALID_STORE_NOTIFICATION");
        }
        if (
          [
            NotificationTypeV2.REFUND,
            NotificationTypeV2.REVOKE,
            NotificationTypeV2.REFUND_REVERSED,
          ].includes(decoded.notificationType as NotificationTypeV2)
        ) {
          notifications.push(
            await this.notification({ signedPayload: item.signedPayload }),
          );
        }
      }
      if (!page.hasMore) break;
      if (!page.paginationToken || seen.has(page.paginationToken))
        throw new PaymentError("INVALID_STORE_PAGINATION");
      token = page.paginationToken;
      seen.add(token);
    } while (true);
    return notifications;
  }

  private async decodeTransaction(
    proof: string,
  ): Promise<JWSTransactionDecodedPayload> {
    try {
      return await this.verifier.verifyAndDecodeTransaction(proof);
    } catch (error) {
      throw this.verificationError(error, "INVALID_STORE_PROOF");
    }
  }

  private async decodeNotification(
    signedPayload: string,
  ): Promise<
    Awaited<ReturnType<SignedDataVerifier["verifyAndDecodeNotification"]>>
  > {
    if (!signedPayload || signedPayload.length > 200_000)
      throw new PaymentError("INVALID_STORE_NOTIFICATION");
    let decoded: Awaited<
      ReturnType<SignedDataVerifier["verifyAndDecodeNotification"]>
    >;
    try {
      decoded = await this.verifier.verifyAndDecodeNotification(signedPayload);
    } catch (error) {
      throw this.verificationError(error, "INVALID_STORE_NOTIFICATION");
    }
    const data = decoded.data;
    // The official verifier validates app identity using data, summary, externalPurchaseToken, or appData.
    if (!data) throw new PaymentError("UNSUPPORTED_STORE_NOTIFICATION");
    if (
      data.bundleId !== this.options.bundleId ||
      data.environment !== this.options.environment ||
      (this.options.environment === "Production" &&
        data.appAppleId !== this.options.appAppleId)
    ) {
      throw new PaymentError("INVALID_STORE_NOTIFICATION");
    }
    if (!decoded.notificationUUID || !data.signedTransactionInfo)
      throw new PaymentError("UNSUPPORTED_STORE_NOTIFICATION");
    return decoded;
  }

  private verificationError(error: unknown, fallback: string): PaymentError {
    return new PaymentError(
      error instanceof VerificationException &&
        error.status === VerificationStatus.RETRYABLE_VERIFICATION_FAILURE
        ? "STORE_UNAVAILABLE"
        : fallback,
    );
  }

  private purchase(
    transaction: JWSTransactionDecodedPayload,
  ): VerifiedPurchase {
    if (
      transaction.bundleId !== this.options.bundleId ||
      transaction.environment !== this.options.environment ||
      !transaction.transactionId ||
      !transaction.productId ||
      !this.options.productIds.includes(transaction.productId) ||
      transaction.type !== "Consumable" ||
      transaction.quantity !== 1 ||
      !transaction.appAccountToken ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        transaction.appAccountToken,
      ) ||
      !Number.isSafeInteger(transaction.purchaseDate) ||
      transaction.purchaseDate <= 0
    ) {
      throw new PaymentError("INVALID_STORE_PROOF");
    }
    const result: VerifiedPurchase = {
      provider: this.provider,
      transactionId: transaction.transactionId,
      productId: transaction.productId,
      accountToken: transaction.appAccountToken.toLowerCase(),
      environment: this.options.environment,
      state: transaction.revocationDate != null ? "REFUNDED" : "PURCHASED",
      quantity: 1,
      purchasedAt: new Date(transaction.purchaseDate),
    };
    if (transaction.offerIdentifier)
      result.storeOfferId = transaction.offerIdentifier;
    if (
      transaction.currency &&
      /^[A-Z]{3}$/.test(transaction.currency) &&
      Number.isSafeInteger(transaction.price) &&
      transaction.price >= 0
    ) {
      const digits = new Intl.NumberFormat("en", {
        style: "currency",
        currency: transaction.currency,
      }).resolvedOptions().maximumFractionDigits;
      const amountMinor = (transaction.price / 1000) * 10 ** digits;
      if (Number.isSafeInteger(amountMinor)) {
        result.amountMinor = amountMinor;
        result.currency = transaction.currency;
      }
    }
    return result;
  }
}
