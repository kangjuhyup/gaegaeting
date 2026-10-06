import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { PaymentService } from "./payment.service.js";
import type { PaymentStore } from "./payment-store.js";
import type { ProofEncryption } from "./proof-encryption.js";
import type { ItemService } from "../../item/application/item.service.js";
import type { StorePort, StoreEnvironment } from "../domain/payment.js";

function fixture(environment: StoreEnvironment) {
  const save = jest.fn<PaymentStore["saveReconciliationCursor"]>();
  const refunds = jest.fn<StorePort["refunds"]>().mockResolvedValue([]);
  const store = {
    reconciliationCursor: async () => new Date(Date.now() - 31 * 86_400_000),
    saveReconciliationCursor: save,
  } as unknown as PaymentStore;
  const adapter = { provider: "APPLE", refunds } as unknown as StorePort;
  return {
    save,
    refunds,
    service: new PaymentService(
      store,
      [adapter],
      {} as ProofEncryption,
      environment,
      {} as ItemService,
    ),
  };
}

describe("Apple refund history coverage", () => {
  afterEach(() => jest.restoreAllMocks());

  it("preserves the checkpoint and requests review after a 31-day Sandbox outage", async () => {
    const log = jest.spyOn(console, "error").mockImplementation(() => {});
    const { service, save, refunds } = fixture("Sandbox");
    await expect(service.reconcileRefunds()).rejects.toThrow(
      "REFUND_RECONCILIATION_WINDOW_EXCEEDED",
    );
    expect(save).not.toHaveBeenCalled();
    expect(refunds).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining("refund_reconciliation_requires_review"),
    );
  });

  it("advances the checkpoint after a successful 31-day Production reconciliation", async () => {
    const { service, save, refunds } = fixture("Production");
    await service.reconcileRefunds();
    expect(refunds).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledTimes(1);
  });
});
