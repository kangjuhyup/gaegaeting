import { jest } from '@jest/globals';
import type { TransactionBoundary } from './transaction-boundary.js';
import { TransactionOwnershipContext } from './transaction-ownership-context.js';

describe('transaction boundary contracts', () => {
  it('runs work through the boundary', async () => {
    const boundary: TransactionBoundary = {
      owner: 'fake',
      run: jest.fn(async work => work()),
    };

    await expect(boundary.run(async () => 42)).resolves.toBe(42);
  });

  it('tracks the active owner only inside its async scope', async () => {
    const context = new TransactionOwnershipContext();

    expect(context.currentOwner()).toBeUndefined();
    await context.run('adapter-a', async () => {
      expect(context.currentOwner()).toBe('adapter-a');
      await Promise.resolve();
      expect(context.currentOwner()).toBe('adapter-a');
    });
    expect(context.currentOwner()).toBeUndefined();
  });

  it('rejects a different ORM owner in an active transaction', () => {
    const context = new TransactionOwnershipContext();

    expect(() =>
      context.run('adapter-a', () => context.assertAvailable('adapter-b')),
    ).toThrow(
      'Cannot enter adapter-b transaction while adapter-a transaction is active',
    );
  });

  it('allows the active owner to re-enter REQUIRED work', () => {
    const context = new TransactionOwnershipContext();

    expect(() =>
      context.run('adapter-a', () => context.assertAvailable('adapter-a')),
    ).not.toThrow();
  });
});
