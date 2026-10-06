import { createHash } from "node:crypto";
import { GoogleAuth, OAuth2Client } from "google-auth-library";
import { PaymentError, StorePort } from "../../domain/payment.js";
import type {
  StoreEnvironment,
  StoreNotification,
  VerifiedPurchase,
} from "../../domain/payment.js";

export interface GoogleStoreOptions {
  packageName: string;
  environment: StoreEnvironment;
  pushAudience: string;
  pushServiceAccountEmail: string;
  productIds: readonly string[];
  credentials?: { client_email: string; private_key: string };
}

interface PlayRequest {
  url: string;
  method: "GET" | "POST";
  params?: Record<string, string | number | boolean>;
}

export interface GoogleStoreDependencies {
  request<T>(options: PlayRequest): Promise<{ data: T }>;
  oidc: Pick<OAuth2Client, "verifyIdToken">;
}

interface ProductPurchaseV2 {
  productLineItem?: {
    productId?: string;
    productOfferDetails?: {
      offerId?: string;
      quantity?: number;
      refundableQuantity?: number;
      consumptionState?: string;
      rentOfferDetails?: unknown;
    };
  }[];
  purchaseStateContext?: { purchaseState?: string };
  testPurchaseContext?: { fopType?: string };
  orderId?: string;
  obfuscatedExternalAccountId?: string;
  purchaseCompletionTime?: string;
}

interface VoidedPurchases {
  tokenPagination?: { nextPageToken?: string };
  voidedPurchases?: {
    purchaseToken?: string;
    orderId?: string;
    voidedTimeMillis?: string;
  }[];
}

export class GoogleStoreAdapter extends StorePort {
  readonly provider = "GOOGLE" as const;
  private readonly request: GoogleStoreDependencies["request"];
  private readonly oidc: GoogleStoreDependencies["oidc"];
  private readonly baseUrl: string;

  constructor(
    private readonly options: GoogleStoreOptions,
    dependencies?: GoogleStoreDependencies,
  ) {
    super();
    if (
      !options.packageName ||
      !options.productIds.length ||
      !options.pushAudience ||
      !options.pushServiceAccountEmail.endsWith(".gserviceaccount.com") ||
      !["Sandbox", "Production"].includes(options.environment) ||
      (options.credentials &&
        (!options.credentials.client_email || !options.credentials.private_key))
    ) {
      throw new PaymentError("INVALID_STORE_CONFIGURATION");
    }
    this.baseUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(options.packageName)}/purchases`;
    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/androidpublisher"],
      credentials: options.credentials,
    });
    this.request =
      dependencies?.request ??
      (async <T>(request: PlayRequest) =>
        auth.request<T>({ ...request, timeout: 10_000, retry: false }));
    this.oidc = dependencies?.oidc ?? new OAuth2Client();
  }

  async verify(proof: string): Promise<VerifiedPurchase> {
    return this.purchase(proof, await this.fetchPurchase(proof));
  }

  async finalize(proof: string): Promise<void> {
    const raw = await this.fetchPurchase(proof);
    const purchase = this.purchase(proof, raw);
    if (purchase.state !== "PURCHASED")
      throw new PaymentError("PURCHASE_NOT_COMPLETED");
    if (
      raw.productLineItem[0].productOfferDetails.consumptionState ===
      "CONSUMPTION_STATE_CONSUMED"
    )
      return;
    const url = `${this.baseUrl}/products/${encodeURIComponent(purchase.productId)}/tokens/${encodeURIComponent(proof)}:consume`;
    try {
      await this.request({ url, method: "POST" });
    } catch {
      // An ambiguous response can mean consumption committed. Confirm, never swallow arbitrary errors.
      const current = await this.fetchPurchase(proof);
      const verified = this.purchase(proof, current);
      if (
        verified.state === "PURCHASED" &&
        current.productLineItem[0].productOfferDetails.consumptionState ===
          "CONSUMPTION_STATE_CONSUMED"
      )
        return;
      throw new PaymentError("STORE_FINALIZATION_FAILED");
    }
  }

  async notification(
    body: unknown,
    authorization?: string,
  ): Promise<StoreNotification> {
    if (!authorization || !/^Bearer \S+$/i.test(authorization))
      throw new PaymentError("INVALID_STORE_NOTIFICATION");
    try {
      const ticket = await this.oidc.verifyIdToken({
        idToken: authorization.split(" ")[1],
        audience: this.options.pushAudience,
      });
      const payload = ticket.getPayload();
      if (
        !payload ||
        payload.email !== this.options.pushServiceAccountEmail ||
        payload.email_verified !== true ||
        !["accounts.google.com", "https://accounts.google.com"].includes(
          payload.iss,
        )
      )
        throw new Error("identity");
    } catch {
      throw new PaymentError("INVALID_STORE_NOTIFICATION");
    }
    const envelope = this.object(body);
    const message = this.object(envelope.message);
    if (
      typeof message.messageId !== "string" ||
      !message.messageId ||
      typeof message.data !== "string" ||
      !message.data ||
      message.data.length > 200_000
    )
      throw new PaymentError("INVALID_STORE_NOTIFICATION");
    let decoded: Record<string, unknown>;
    try {
      decoded = this.object(
        JSON.parse(Buffer.from(message.data, "base64").toString("utf8")),
      );
    } catch {
      throw new PaymentError("INVALID_STORE_NOTIFICATION");
    }
    if (decoded.packageName !== this.options.packageName)
      throw new PaymentError("INVALID_STORE_NOTIFICATION");
    if (
      decoded.testNotification ||
      decoded.subscriptionNotification ||
      decoded.pendingRefundReviewNotification
    ) {
      throw new PaymentError("UNSUPPORTED_STORE_NOTIFICATION");
    }
    const isVoided = decoded.voidedPurchaseNotification != null;
    const event = this.object(
      isVoided
        ? decoded.voidedPurchaseNotification
        : decoded.oneTimeProductNotification,
    );
    if (isVoided && event.productType !== 2)
      throw new PaymentError("UNSUPPORTED_STORE_NOTIFICATION");
    if (!isVoided && ![1, 2].includes(event.notificationType as number))
      throw new PaymentError("UNSUPPORTED_STORE_NOTIFICATION");
    if (typeof event.purchaseToken !== "string" || !event.purchaseToken)
      throw new PaymentError("INVALID_STORE_NOTIFICATION");
    // Notifications only identify the token; purchase identity and current state come from Play.
    const raw = await this.fetchPurchase(event.purchaseToken);
    const purchase = this.purchase(event.purchaseToken, raw);
    if (
      (!isVoided && event.sku !== purchase.productId) ||
      (isVoided &&
        event.orderId &&
        raw.orderId &&
        event.orderId !== raw.orderId)
    ) {
      throw new PaymentError("INVALID_STORE_NOTIFICATION");
    }
    if (isVoided && purchase.state !== "REFUNDED")
      throw new PaymentError("STORE_NOTIFICATION_NOT_READY");
    return { eventId: message.messageId, proof: event.purchaseToken };
  }

  async refunds(since: Date): Promise<StoreNotification[]> {
    const endTime = Date.now();
    const startTime = since.getTime();
    // Play only exposes a 30-day voided-purchase window. A wider request must be handled operationally.
    if (
      !Number.isFinite(startTime) ||
      startTime < endTime - 30 * 86_400_000 ||
      startTime > endTime
    ) {
      throw new PaymentError("REFUND_RECONCILIATION_WINDOW_EXCEEDED");
    }
    const result: StoreNotification[] = [];
    let token: string | undefined;
    const seen = new Set<string>();
    do {
      let page: VoidedPurchases;
      try {
        page = (
          await this.request<VoidedPurchases>({
            url: `${this.baseUrl}/voidedpurchases`,
            method: "GET",
            params: {
              startTime: String(startTime),
              endTime: String(endTime),
              type: 0,
              includeQuantityBasedPartialRefund: true,
              maxResults: 1000,
              ...(token ? { token } : {}),
            },
          })
        ).data;
      } catch {
        throw new PaymentError("STORE_UNAVAILABLE");
      }
      for (const purchase of page.voidedPurchases ?? []) {
        if (!purchase.purchaseToken || !purchase.voidedTimeMillis)
          throw new PaymentError("INVALID_STORE_NOTIFICATION");
        const current = await this.verify(purchase.purchaseToken);
        if (current.state !== "REFUNDED")
          throw new PaymentError("STORE_NOTIFICATION_NOT_READY");
        result.push({
          eventId: `voided:${current.transactionId}:${purchase.voidedTimeMillis}`,
          proof: purchase.purchaseToken,
        });
      }
      token = page.tokenPagination?.nextPageToken;
      if (token && seen.has(token))
        throw new PaymentError("INVALID_STORE_PAGINATION");
      if (token) seen.add(token);
    } while (token);
    return result;
  }

  private async fetchPurchase(proof: string): Promise<ProductPurchaseV2> {
    if (typeof proof !== "string" || !proof || proof.length > 4096)
      throw new PaymentError("INVALID_STORE_PROOF");
    try {
      return (
        await this.request<ProductPurchaseV2>({
          url: `${this.baseUrl}/productsv2/tokens/${encodeURIComponent(proof)}`,
          method: "GET",
        })
      ).data;
    } catch {
      throw new PaymentError("STORE_UNAVAILABLE");
    }
  }

  private purchase(token: string, raw: ProductPurchaseV2): VerifiedPurchase {
    const line = raw?.productLineItem?.[0];
    const offer = line?.productOfferDetails;
    const accountToken = raw?.obfuscatedExternalAccountId;
    const state = raw?.purchaseStateContext?.purchaseState;
    const environment = raw?.testPurchaseContext ? "Sandbox" : "Production";
    if (
      raw?.productLineItem?.length !== 1 ||
      !line?.productId ||
      !this.options.productIds.includes(line.productId) ||
      !offer ||
      offer.quantity !== 1 ||
      offer.rentOfferDetails != null ||
      !accountToken ||
      environment !== this.options.environment ||
      !["PURCHASED", "PENDING", "CANCELLED"].includes(state)
    ) {
      throw new PaymentError("INVALID_STORE_PROOF");
    }
    const completedAt = raw.purchaseCompletionTime
      ? new Date(raw.purchaseCompletionTime)
      : undefined;
    if (
      (completedAt && !Number.isFinite(completedAt.getTime())) ||
      (state === "PURCHASED" && !completedAt)
    ) {
      throw new PaymentError("INVALID_STORE_PROOF");
    }
    // A cancelled pending payment never had a paid timestamp or an entitlement to revoke.
    const purchaseState =
      state === "PENDING" || (state === "CANCELLED" && !completedAt)
        ? "PENDING"
        : state === "CANCELLED" || offer.refundableQuantity === 0
          ? "REFUNDED"
          : "PURCHASED";
    const result: VerifiedPurchase = {
      provider: this.provider,
      transactionId: createHash("sha256").update(token).digest("hex"),
      productId: line.productId,
      accountToken,
      environment,
      state: purchaseState,
      quantity: 1,
      purchasedAt: completedAt ?? new Date(0),
    };
    if (offer.offerId) result.storeOfferId = offer.offerId;
    // ProductPurchaseV2 does not expose a paid amount; a catalog price is not transaction evidence.
    return result;
  }

  private object(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new PaymentError("INVALID_STORE_NOTIFICATION");
    return value as Record<string, unknown>;
  }
}
