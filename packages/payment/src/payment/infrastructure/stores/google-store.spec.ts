import { createHash } from "node:crypto";
import { describe, expect, it, jest } from "@jest/globals";
import { LoginTicket } from "google-auth-library";
import { GoogleStoreAdapter } from "./google-store.js";
import type {
  GoogleStoreDependencies,
  GoogleStoreOptions,
} from "./google-store.js";

const options: GoogleStoreOptions = {
  packageName: "com.gaegaeting.app",
  environment: "Production",
  pushAudience: "https://payment.example/google",
  pushServiceAccountEmail: "push@app.iam.gserviceaccount.com",
  productIds: ["snack10"],
};
const token = "purchase-token";
const tokenId = createHash("sha256").update(token).digest("hex");
const product = {
  productLineItem: [
    {
      productId: "snack10",
      productOfferDetails: {
        quantity: 1,
        refundableQuantity: 1,
        consumptionState: "CONSUMPTION_STATE_YET_TO_BE_CONSUMED",
        offerId: "event-price",
      },
    },
  ],
  purchaseStateContext: { purchaseState: "PURCHASED" },
  obfuscatedExternalAccountId: "account-binding",
  orderId: "GPA.123",
  purchaseCompletionTime: "2026-10-01T12:00:00Z",
};

function fixture(raw: unknown = product) {
  const request = jest
    .fn<
      (options: {
        url: string;
        method: string;
        params?: unknown;
      }) => Promise<{ data: unknown }>
    >()
    .mockResolvedValue({ data: raw });
  const verifyIdToken = jest
    .fn<GoogleStoreDependencies["oidc"]["verifyIdToken"]>()
    .mockResolvedValue(
      new LoginTicket("", {
        email: options.pushServiceAccountEmail,
        email_verified: true,
        aud: options.pushAudience,
        iss: "https://accounts.google.com",
        sub: "123",
        iat: 1,
        exp: 2,
      }),
    );
  const dependencies = {
    request,
    oidc: { verifyIdToken },
  } as unknown as GoogleStoreDependencies;
  return {
    adapter: new GoogleStoreAdapter(options, dependencies),
    request,
    verifyIdToken,
  };
}

function body(event: object, packageName = options.packageName) {
  return {
    message: {
      messageId: "message-1",
      data: Buffer.from(JSON.stringify({ packageName, ...event })).toString(
        "base64",
      ),
    },
  };
}

describe("Google consumable purchase evidence", () => {
  it("uses a stable purchase-token digest even when a paid promotional purchase has no order ID", async () => {
    const { adapter } = fixture({ ...product, orderId: undefined });
    await expect(adapter.verify(token)).resolves.toMatchObject({
      transactionId: tokenId,
      accountToken: "account-binding",
      state: "PURCHASED",
      storeOfferId: "event-price",
    });
  });

  it("does not confuse the catalog price with verified paid transaction amount", async () => {
    const purchase = await fixture().adapter.verify(token);
    expect(purchase.amountMinor).toBeUndefined();
    expect(purchase.currency).toBeUndefined();
  });

  it("keeps a pending purchase pending without inventing a completed payment time", async () => {
    const { adapter } = fixture({
      ...product,
      purchaseStateContext: { purchaseState: "PENDING" },
      purchaseCompletionTime: undefined,
      orderId: undefined,
    });
    await expect(adapter.verify(token)).resolves.toMatchObject({
      transactionId: tokenId,
      state: "PENDING",
      purchasedAt: new Date(0),
    });
    await expect(adapter.finalize(token)).rejects.toThrow(
      "PURCHASE_NOT_COMPLETED",
    );
  });

  it.each([
    [
      "missing account binding",
      { ...product, obfuscatedExternalAccountId: undefined },
    ],
    [
      "a sandbox payment on production",
      { ...product, testPurchaseContext: { fopType: "TEST" } },
    ],
    [
      "an unknown product",
      {
        ...product,
        productLineItem: [
          { ...product.productLineItem[0], productId: "unknown" },
        ],
      },
    ],
    [
      "multi-quantity purchasing",
      {
        ...product,
        productLineItem: [
          {
            ...product.productLineItem[0],
            productOfferDetails: { quantity: 2 },
          },
        ],
      },
    ],
    [
      "missing quantity evidence",
      {
        ...product,
        productLineItem: [
          { ...product.productLineItem[0], productOfferDetails: {} },
        ],
      },
    ],
    [
      "a rental product",
      {
        ...product,
        productLineItem: [
          {
            ...product.productLineItem[0],
            productOfferDetails: { quantity: 1, rentOfferDetails: {} },
          },
        ],
      },
    ],
    [
      "an unspecified purchase state",
      {
        ...product,
        purchaseStateContext: { purchaseState: "PURCHASE_STATE_UNSPECIFIED" },
      },
    ],
  ])("rejects %s", async (_reason, raw) => {
    await expect(fixture(raw).adapter.verify(token)).rejects.toThrow(
      "INVALID_STORE_PROOF",
    );
  });

  it("marks a fully refunded purchase as refunded even if its purchase state is still PURCHASED", async () => {
    const raw = {
      ...product,
      productLineItem: [
        {
          ...product.productLineItem[0],
          productOfferDetails: { quantity: 1, refundableQuantity: 0 },
        },
      ],
    };
    await expect(fixture(raw).adapter.verify(token)).resolves.toMatchObject({
      transactionId: tokenId,
      state: "REFUNDED",
    });
  });

  it("makes consumption idempotent after an ambiguous network error by confirming the current consumed state", async () => {
    const { adapter, request } = fixture();
    request
      .mockResolvedValueOnce({ data: product })
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce({
        data: {
          ...product,
          productLineItem: [
            {
              ...product.productLineItem[0],
              productOfferDetails: {
                quantity: 1,
                refundableQuantity: 1,
                consumptionState: "CONSUMPTION_STATE_CONSUMED",
              },
            },
          ],
        },
      });
    await expect(adapter.finalize(token)).resolves.toBeUndefined();
    expect(request.mock.calls[1][0]).toMatchObject({
      method: "POST",
      url: expect.stringContaining(":consume"),
    });
  });

  it("reports consumption failures instead of silently acknowledging an unconsumed purchase", async () => {
    const { adapter, request } = fixture();
    request
      .mockResolvedValueOnce({ data: product })
      .mockRejectedValueOnce(new Error("failure"))
      .mockResolvedValueOnce({ data: product });
    await expect(adapter.finalize(token)).rejects.toThrow(
      "STORE_FINALIZATION_FAILED",
    );
  });
});

describe("Google authenticated notifications and refund recovery", () => {
  it("rejects a push without authenticated OIDC identity before querying a purchase", async () => {
    const { adapter, request, verifyIdToken } = fixture();
    await expect(
      adapter.notification(body({ testNotification: {} })),
    ).rejects.toThrow("INVALID_STORE_NOTIFICATION");
    expect(request).not.toHaveBeenCalled();
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it.each([
    [
      "another push service account",
      { email: "attacker@app.iam.gserviceaccount.com", email_verified: true },
    ],
    [
      "an unverified push email",
      { email: options.pushServiceAccountEmail, email_verified: false },
    ],
  ])("rejects %s", async (_reason, claims) => {
    const { adapter, verifyIdToken, request } = fixture();
    verifyIdToken.mockResolvedValueOnce(
      new LoginTicket("", {
        ...claims,
        iss: "https://accounts.google.com",
        aud: options.pushAudience,
        sub: "1",
        iat: 1,
        exp: 2,
      }),
    );
    await expect(
      adapter.notification(body({ testNotification: {} }), "Bearer token"),
    ).rejects.toThrow("INVALID_STORE_NOTIFICATION");
    expect(request).not.toHaveBeenCalled();
  });

  it("passes the configured audience into the cryptographic OIDC verifier", async () => {
    const { adapter, verifyIdToken } = fixture();
    await expect(
      adapter.notification(
        body({ testNotification: {} }),
        "Bearer signed-token",
      ),
    ).rejects.toThrow("UNSUPPORTED_STORE_NOTIFICATION");
    expect(verifyIdToken).toHaveBeenCalledWith({
      idToken: "signed-token",
      audience: options.pushAudience,
    });
  });

  it("rejects another package even when its push identity is trusted", async () => {
    await expect(
      fixture().adapter.notification(
        body({ testNotification: {} }, "com.other"),
        "Bearer token",
      ),
    ).rejects.toThrow("INVALID_STORE_NOTIFICATION");
  });

  it("resolves a voided purchase using current store state and retains its purchase-token identity", async () => {
    const { adapter } = fixture({
      ...product,
      purchaseStateContext: { purchaseState: "CANCELLED" },
    });
    await expect(
      adapter.notification(
        body({
          voidedPurchaseNotification: {
            purchaseToken: token,
            productType: 2,
            orderId: "GPA.123",
          },
        }),
        "Bearer token",
      ),
    ).resolves.toEqual({ eventId: "message-1", proof: token });
  });

  it("retries a voided notification when the current store purchase has not caught up with the refund", async () => {
    await expect(
      fixture().adapter.notification(
        body({
          voidedPurchaseNotification: {
            purchaseToken: token,
            productType: 2,
            orderId: "GPA.123",
          },
        }),
        "Bearer token",
      ),
    ).rejects.toThrow("STORE_NOTIFICATION_NOT_READY");
  });

  it("recovers missing refunds across all voided-purchase pages", async () => {
    const { adapter, request } = fixture({
      ...product,
      purchaseStateContext: { purchaseState: "CANCELLED" },
    });
    const refund = {
      ...product,
      purchaseStateContext: { purchaseState: "CANCELLED" },
    };
    request
      .mockResolvedValueOnce({
        data: {
          voidedPurchases: [{ purchaseToken: token, voidedTimeMillis: "123" }],
          tokenPagination: { nextPageToken: "next" },
        },
      })
      .mockResolvedValueOnce({ data: refund })
      .mockResolvedValueOnce({
        data: {
          voidedPurchases: [{ purchaseToken: token, voidedTimeMillis: "456" }],
        },
      })
      .mockResolvedValueOnce({ data: refund });
    await expect(
      adapter.refunds(new Date(Date.now() - 86_400_000)),
    ).resolves.toEqual([
      { eventId: `voided:${tokenId}:123`, proof: token },
      { eventId: `voided:${tokenId}:456`, proof: token },
    ]);
    expect(request.mock.calls[2][0].params).toMatchObject({ token: "next" });
  });

  it("reports a reconciliation gap beyond the 30-day provider window", async () => {
    await expect(fixture().adapter.refunds(new Date(0))).rejects.toThrow(
      "REFUND_RECONCILIATION_WINDOW_EXCEEDED",
    );
  });
});
