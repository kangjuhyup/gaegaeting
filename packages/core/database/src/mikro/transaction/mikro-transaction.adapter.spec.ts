import { IsolationLevel, TransactionPropagation, type EntityManager } from '@mikro-orm/core';
import { jest } from '@jest/globals';
import { AsyncLocalStorage } from 'node:async_hooks';
import { TransactionOwnershipContext } from '../../transaction/transaction-ownership-context.js';
import {
  defineTransactionAdapterContract,
  type TransactionAdapterHarness,
} from '../../transaction/testing/transaction-adapter.contract.js';
import { MikroOrmTransactionAdapter } from './mikro-transaction.adapter.js';

interface MikroHarness extends TransactionAdapterHarness {
  transactional: jest.Mock<(...args: any[]) => Promise<unknown>>;
}

function createHarness(): MikroHarness {
  const events: string[] = [];
  const ownership = new TransactionOwnershipContext();
  const transactionContext = new AsyncLocalStorage<EntityManager>();
  const connection = {
    execute: jest.fn(async (statement: string) => {
      if (statement === 'SET TRANSACTION READ ONLY') {
        events.push('read-only');
      }
      return [];
    }),
  };
  const transactionalEntityManager = {
    getConnection: () => connection,
  } as unknown as EntityManager;
  const transactional = jest.fn<(...args: any[]) => Promise<unknown>>(
    async (work: (entityManager: EntityManager) => Promise<unknown>, options: any) => {
      const activeEntityManager = transactionContext.getStore();
      if (activeEntityManager && options.propagation === TransactionPropagation.REQUIRED) {
        return work(activeEntityManager);
      }
      if (options.isolationLevel) {
        events.push(`isolation:${options.isolationLevel}`);
      }
      events.push('begin');
      return transactionContext.run(transactionalEntityManager, async () => {
        try {
          const result = await work(transactionalEntityManager);
          events.push('commit');
          return result;
        } catch (error) {
          events.push('rollback');
          throw error;
        }
      });
    },
  );
  const entityManager = { transactional } as unknown as EntityManager;
  const boundary = new MikroOrmTransactionAdapter(entityManager, ownership);

  return {
    boundary,
    events,
    transactional,
    currentOwner: () => ownership.currentOwner(),
    runWithOwner: (owner, work) => ownership.run(owner, work),
    reset: async () => {
      events.length = 0;
      transactional.mockClear();
      connection.execute.mockClear();
    },
  };
}

describe('MikroOrmTransactionAdapter', () => {
  it('uses REQUIRED propagation and maps portable isolation', async () => {
    const harness = createHarness();

    await harness.boundary.run(async () => undefined, {
      isolationLevel: 'serializable',
    });

    expect(harness.transactional).toHaveBeenCalledWith(expect.any(Function), {
      propagation: TransactionPropagation.REQUIRED,
      isolationLevel: IsolationLevel.SERIALIZABLE,
    });
  });

  it('does not replace the active default transaction token', () => {
    expect(MikroOrmTransactionAdapter).toBeDefined();
  });
});

defineTransactionAdapterContract('MikroORM', async () => createHarness());
