import type { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PaymentService } from "./application/payment.service.js";
import { PaymentStore } from "./application/payment-store.js";

export class PaymentWorker implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private running?: Promise<void>;
  private lastReconciliation = 0;
  constructor(
    private readonly payment: PaymentService,
    private readonly store: PaymentStore,
    private readonly enabled: boolean,
  ) {}
  onModuleInit() {
    if (!this.enabled) return;
    this.timer = setInterval(() => {
      if (this.running) return;
      this.running = this.tick().finally(() => {
        this.running = undefined;
      });
    }, 1000);
    this.timer.unref();
  }
  private async tick() {
    try {
      const result = await this.payment.processJobs();
      if (result.failed)
        console.warn(
          JSON.stringify({
            name: "Payment-Worker",
            event: "jobs_retry_scheduled",
            count: result.failed,
          }),
        );
    } catch {
      console.warn(
        JSON.stringify({ name: "Payment-Worker", event: "jobs_unavailable" }),
      );
    }
    if (Date.now() - this.lastReconciliation < 3_600_000) return;
    try {
      await this.payment.reconcileRefunds();
      this.lastReconciliation = Date.now();
    } catch {
      // A failing provider never advances its durable reconciliation checkpoint.
      this.lastReconciliation = Date.now() - 3_540_000;
      console.warn(
        JSON.stringify({
          name: "Payment-Worker",
          event: "refund_reconciliation_retry",
        }),
      );
    }
  }
  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    await this.running;
    await this.store.close();
  }
}
