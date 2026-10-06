import { EntityManager } from "@core/database/mikro";
import { Injectable } from "@nestjs/common";
import { AsyncLocalStorage } from "node:async_hooks";
import { ChallengeTransaction } from "../../application/challenge-transaction.js";

@Injectable()
export class ChallengeSession extends ChallengeTransaction {
  private readonly context = new AsyncLocalStorage<{
    userId: string;
    em: EntityManager;
  }>();
  constructor(private readonly manager: EntityManager) {
    super();
  }

  get em(): EntityManager {
    return this.context.getStore()?.em ?? this.manager.fork();
  }

  async query<T extends object>(
    sql: string,
    parameters: unknown[] = [],
  ): Promise<T[]> {
    const em = this.em;
    return em
      .getConnection()
      .execute(sql, parameters, "all", em.getTransactionContext());
  }

  async run<T>(userId: string, work: () => Promise<T>): Promise<T> {
    const active = this.context.getStore();
    if (active) {
      if (active.userId !== userId)
        throw new Error("Cross-user nested transactions are not allowed");
      return work();
    }
    return this.manager.fork().transactional(async (em) => {
      await em
        .getConnection()
        .execute(
          "select pg_advisory_xact_lock(hashtextextended(?, 0))",
          [`challenge:${userId}`],
          "all",
          em.getTransactionContext(),
        );
      return this.context.run({ userId, em }, work);
    });
  }
}
