import { describe, expect, it, jest } from "@jest/globals";
import {
  Environment,
  NotificationTypeV2,
  VerificationException,
  VerificationStatus,
} from "@apple/app-store-server-library";
import type { JWSTransactionDecodedPayload } from "@apple/app-store-server-library";
import { AppleStoreAdapter } from "./apple-store.js";
import type {
  AppleStoreDependencies,
  AppleStoreOptions,
} from "./apple-store.js";

const account = "8f4ce7e0-b0f2-4cd7-bf62-8bdac524d8c9";
const options: AppleStoreOptions = {
  bundleId: "com.gaegaeting.app",
  environment: "Production",
  appAppleId: 123,
  signingKey: "server-owned-key",
  keyId: "key",
  issuerId: "issuer",
  rootCertificates: [Buffer.from("certificate")],
  productIds: ["snack10"],
};
const transaction: JWSTransactionDecodedPayload = {
  transactionId: "123456",
  productId: "snack10",
  bundleId: options.bundleId,
  environment: Environment.PRODUCTION,
  type: "Consumable",
  quantity: 1,
  appAccountToken: account,
  purchaseDate: 1_700_000_000_000,
  price: 2_000_000,
  currency: "KRW",
};

function fixture(overrides: Partial<JWSTransactionDecodedPayload> = {}) {
  const getTransactionInfo = jest
    .fn<AppleStoreDependencies["client"]["getTransactionInfo"]>()
    .mockResolvedValue({ signedTransactionInfo: "current-jws" });
  const getNotificationHistory = jest
    .fn<AppleStoreDependencies["client"]["getNotificationHistory"]>()
    .mockResolvedValue({ hasMore: false, notificationHistory: [] });
  const verifyAndDecodeTransaction = jest
    .fn<AppleStoreDependencies["verifier"]["verifyAndDecodeTransaction"]>()
    .mockResolvedValue({ ...transaction, ...overrides });
  const verifyAndDecodeNotification = jest
    .fn<AppleStoreDependencies["verifier"]["verifyAndDecodeNotification"]>()
    .mockResolvedValue({
      notificationUUID: "event-1",
      notificationType: NotificationTypeV2.REFUND,
      data: {
        bundleId: options.bundleId,
        appAppleId: 123,
        environment: Environment.PRODUCTION,
        signedTransactionInfo: "refund-jws",
      },
    });
  const dependencies: AppleStoreDependencies = {
    client: { getTransactionInfo, getNotificationHistory },
    verifier: { verifyAndDecodeTransaction, verifyAndDecodeNotification },
  };
  return {
    adapter: new AppleStoreAdapter(options, dependencies),
    dependencies,
    getTransactionInfo,
    getNotificationHistory,
    verifyAndDecodeTransaction,
    verifyAndDecodeNotification,
  };
}

describe("Apple consumable purchase evidence", () => {
  it("requires the production app identifier before accepting any store evidence", () => {
    expect(
      () =>
        new AppleStoreAdapter(
          { ...options, appAppleId: undefined },
          fixture().dependencies,
        ),
    ).toThrow("INVALID_STORE_CONFIGURATION");
  });

  it("verifies current store evidence and converts KRW milliunits to won", async () => {
    const { adapter } = fixture();
    await expect(adapter.verify("123456")).resolves.toMatchObject({
      provider: "APPLE",
      transactionId: "123456",
      accountToken: account,
      state: "PURCHASED",
      quantity: 1,
      amountMinor: 2000,
      currency: "KRW",
    });
  });

  it("requeries a previously signed purchase so replaying its old proof cannot hide a refund", async () => {
    const { adapter, verifyAndDecodeTransaction, getTransactionInfo } =
      fixture();
    verifyAndDecodeTransaction
      .mockResolvedValueOnce(transaction)
      .mockResolvedValueOnce({
        ...transaction,
        revocationDate: 1_700_100_000_000,
      });
    await expect(adapter.verify("old.signed.proof")).resolves.toMatchObject({
      state: "REFUNDED",
    });
    expect(getTransactionInfo).toHaveBeenCalledWith("123456");
  });

  it("does not fall back to an old signed purchase when the current lookup is unavailable", async () => {
    const { adapter, getTransactionInfo } = fixture();
    getTransactionInfo.mockRejectedValueOnce(
      new Error("private upstream response"),
    );
    await expect(adapter.verify("old.signed.proof")).rejects.toThrow(
      "STORE_UNAVAILABLE",
    );
  });

  it.each([
    ["another app", { bundleId: "com.attacker.app" }],
    ["another environment", { environment: Environment.SANDBOX }],
    ["an unknown product", { productId: "snack999" }],
    ["a subscription", { type: "Auto-Renewable Subscription" }],
    ["a multi-quantity purchase", { quantity: 2 }],
    ["a purchase without account binding", { appAccountToken: undefined }],
    ["an invalid account binding", { appAccountToken: "not-a-uuid" }],
  ])("rejects %s", async (_reason, overrides) => {
    await expect(fixture(overrides).adapter.verify("123456")).rejects.toThrow(
      "INVALID_STORE_PROOF",
    );
  });

  it("rejects a signed response for a different transaction", async () => {
    await expect(
      fixture({ transactionId: "654321" }).adapter.verify("123456"),
    ).rejects.toThrow("INVALID_STORE_PROOF");
  });

  it("rejects a proof that fails cryptographic verification before fetching a transaction", async () => {
    const { adapter, getTransactionInfo, verifyAndDecodeTransaction } =
      fixture();
    verifyAndDecodeTransaction.mockRejectedValueOnce(new Error("signature"));
    await expect(adapter.verify("forged.signed.proof")).rejects.toThrow(
      "INVALID_STORE_PROOF",
    );
    expect(getTransactionInfo).not.toHaveBeenCalled();
  });

  it("reports a certificate revocation network outage as retryable store unavailability", async () => {
    const { adapter, verifyAndDecodeTransaction } = fixture();
    verifyAndDecodeTransaction.mockRejectedValueOnce(
      new VerificationException(
        VerificationStatus.RETRYABLE_VERIFICATION_FAILURE,
      ),
    );
    await expect(adapter.verify("123456")).rejects.toThrow("STORE_UNAVAILABLE");
  });
});

describe("Apple authenticated notifications and refund recovery", () => {
  it("rejects an invalid notification signature", async () => {
    const { adapter, verifyAndDecodeNotification } = fixture();
    verifyAndDecodeNotification.mockRejectedValueOnce(
      new Error("invalid signature"),
    );
    await expect(
      adapter.notification({ signedPayload: "forged" }),
    ).rejects.toThrow("INVALID_STORE_NOTIFICATION");
  });

  it("rejects a production notification for another App Store app identifier", async () => {
    const { adapter, verifyAndDecodeNotification } = fixture();
    verifyAndDecodeNotification.mockResolvedValueOnce({
      notificationUUID: "event",
      data: {
        bundleId: options.bundleId,
        appAppleId: 999,
        environment: Environment.PRODUCTION,
        signedTransactionInfo: "jws",
      },
    });
    await expect(
      adapter.notification({ signedPayload: "signed" }),
    ).rejects.toThrow("INVALID_STORE_NOTIFICATION");
  });

  it("acknowledges a known unsupported notification only after the official app-bound signature verifier accepts it", async () => {
    const { adapter, verifyAndDecodeNotification } = fixture();
    verifyAndDecodeNotification.mockResolvedValueOnce({
      notificationType: NotificationTypeV2.TEST,
      notificationUUID: "test",
    });
    await expect(
      adapter.notification({ signedPayload: "verified-test" }),
    ).rejects.toThrow("UNSUPPORTED_STORE_NOTIFICATION");
    expect(verifyAndDecodeNotification).toHaveBeenCalledWith("verified-test");
  });

  it("recovers missing refund notifications across every history page", async () => {
    const { adapter, getNotificationHistory } = fixture();
    getNotificationHistory
      .mockResolvedValueOnce({
        hasMore: true,
        paginationToken: "next",
        notificationHistory: [{ signedPayload: "page-one" }],
      })
      .mockResolvedValueOnce({
        hasMore: false,
        notificationHistory: [{ signedPayload: "page-two" }],
      });
    const since = new Date(Date.now() - 86_400_000);
    await expect(adapter.refunds(since)).resolves.toHaveLength(2);
    expect(getNotificationHistory).toHaveBeenNthCalledWith(
      2,
      "next",
      expect.objectContaining({ startDate: since.getTime() }),
    );
  });

  it("includes refund reversals and lets current transaction status resolve them", async () => {
    const { adapter, getNotificationHistory, verifyAndDecodeNotification } =
      fixture();
    getNotificationHistory.mockResolvedValueOnce({
      hasMore: false,
      notificationHistory: [{ signedPayload: "reversed" }],
    });
    verifyAndDecodeNotification.mockResolvedValue({
      notificationUUID: "reversal",
      notificationType: NotificationTypeV2.REFUND_REVERSED,
      data: {
        bundleId: options.bundleId,
        appAppleId: 123,
        environment: Environment.PRODUCTION,
        signedTransactionInfo: "current",
      },
    });
    await expect(
      adapter.refunds(new Date(Date.now() - 86_400_000)),
    ).resolves.toEqual([
      {
        eventId: "reversal",
        proof: JSON.stringify({ appleNotification: "reversed" }),
      },
    ]);
  });

  it("restores entitlement only when an authenticated reversal is followed by a currently purchased transaction", async () => {
    const { adapter, verifyAndDecodeNotification, getTransactionInfo } =
      fixture();
    verifyAndDecodeNotification.mockResolvedValue({
      notificationUUID: "reversal",
      notificationType: NotificationTypeV2.REFUND_REVERSED,
      data: {
        bundleId: options.bundleId,
        appAppleId: 123,
        environment: Environment.PRODUCTION,
        signedTransactionInfo: "transaction",
      },
    });
    const notification = await adapter.notification({
      signedPayload: "signed-reversal",
    });
    expect(notification.proof).toBe(
      JSON.stringify({ appleNotification: "signed-reversal" }),
    );
    await expect(adapter.verify(notification.proof)).resolves.toMatchObject({
      state: "PURCHASED",
      refundReversed: true,
    });
    expect(getTransactionInfo).toHaveBeenCalledWith("123456");
  });

  it("never restores entitlement from a stale reversal when the current transaction has been refunded again", async () => {
    const { adapter, verifyAndDecodeNotification, verifyAndDecodeTransaction } =
      fixture();
    verifyAndDecodeNotification.mockResolvedValue({
      notificationUUID: "reversal",
      notificationType: NotificationTypeV2.REFUND_REVERSED,
      data: {
        bundleId: options.bundleId,
        appAppleId: 123,
        environment: Environment.PRODUCTION,
        signedTransactionInfo: "transaction",
      },
    });
    verifyAndDecodeTransaction
      .mockResolvedValueOnce(transaction)
      .mockResolvedValueOnce({
        ...transaction,
        revocationDate: 1_700_100_000_000,
      });
    await expect(
      adapter.verify(JSON.stringify({ appleNotification: "old-reversal" })),
    ).resolves.toMatchObject({ state: "REFUNDED", refundReversed: false });
  });

  it("rejects a forged notification wrapper before querying the transaction", async () => {
    const { adapter, verifyAndDecodeNotification, getTransactionInfo } =
      fixture();
    verifyAndDecodeNotification.mockRejectedValueOnce(
      new Error("forged signature"),
    );
    await expect(
      adapter.verify(JSON.stringify({ appleNotification: "forged-reversal" })),
    ).rejects.toThrow("INVALID_STORE_NOTIFICATION");
    expect(getTransactionInfo).not.toHaveBeenCalled();
  });

  it("rejects client-supplied reversal flags", async () => {
    const { adapter, getTransactionInfo } = fixture();
    await expect(
      adapter.verify(
        JSON.stringify({ appleNotification: "signed", refundReversed: true }),
      ),
    ).rejects.toThrow("INVALID_STORE_PROOF");
    expect(getTransactionInfo).not.toHaveBeenCalled();
  });

  it("rejects a genuine refund notification misrepresented as a reversal wrapper", async () => {
    await expect(
      fixture().adapter.verify(
        JSON.stringify({ appleNotification: "actual-refund" }),
      ),
    ).rejects.toThrow("INVALID_STORE_PROOF");
  });

  it("does not treat an ordinary signed purchased transaction as evidence of refund reversal", async () => {
    const purchase = await fixture().adapter.verify("signed.transaction.proof");
    expect(purchase.refundReversed).toBeUndefined();
  });

  it("reports a history gap outside the provider retention window", async () => {
    await expect(fixture().adapter.refunds(new Date(0))).rejects.toThrow(
      "REFUND_RECONCILIATION_WINDOW_EXCEEDED",
    );
  });
});
