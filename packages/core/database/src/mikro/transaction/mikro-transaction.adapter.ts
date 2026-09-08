import {
  IsolationLevel,
  TransactionPropagation,
  EntityManager,
} from '@mikro-orm/core';
import { Inject, Injectable } from '@nestjs/common';
import type { TransactionBoundary } from '../../transaction/transaction-boundary.js';
import type {
  TransactionIsolationLevel,
  TransactionOptions,
} from '../../transaction/transaction-options.js';
import { TransactionOwnershipContext } from '../../transaction/transaction-ownership-context.js';

const MIKRO_ISOLATION_LEVELS: Record<TransactionIsolationLevel, IsolationLevel> = {
  'read uncommitted': IsolationLevel.READ_UNCOMMITTED,
  'read committed': IsolationLevel.READ_COMMITTED,
  'repeatable read': IsolationLevel.REPEATABLE_READ,
  serializable: IsolationLevel.SERIALIZABLE,
};

@Injectable()
export class MikroOrmTransactionAdapter implements TransactionBoundary {
  readonly owner = 'mikro-orm';

  constructor(
    @Inject(EntityManager) private readonly entityManager: EntityManager,
    private readonly ownership: TransactionOwnershipContext,
  ) {}

  async run<T>(
    work: () => Promise<T>,
    options: TransactionOptions = {},
  ): Promise<T> {
    this.ownership.assertAvailable(this.owner);
    if (this.ownership.currentOwner() === this.owner) {
      return work();
    }

    return this.entityManager.transactional(
      transactionalEntityManager =>
        this.ownership.run(this.owner, async () => {
          if (options.readOnly) {
            await transactionalEntityManager
              .getConnection()
              .execute('SET TRANSACTION READ ONLY');
          }
          return work();
        }),
      {
        propagation: TransactionPropagation.REQUIRED,
        isolationLevel: options.isolationLevel
          ? MIKRO_ISOLATION_LEVELS[options.isolationLevel]
          : undefined,
      },
    );
  }
}
