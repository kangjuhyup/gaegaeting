import type { TransactionBoundary } from '../transaction-boundary.js';

export interface TransactionAdapterHarness {
  boundary: TransactionBoundary;
  events: string[];
  currentOwner(): string | undefined;
  runWithOwner<T>(owner: string, work: () => T): T;
  reset(): Promise<void>;
}

export function defineTransactionAdapterContract(
  name: string,
  createHarness: () => Promise<TransactionAdapterHarness>,
): void {
  describe(`${name} transaction adapter contract`, () => {
    let harness: TransactionAdapterHarness;

    beforeEach(async () => {
      harness = await createHarness();
      await harness.reset();
    });

    it('commits successful work', async () => {
      await expect(
        harness.boundary.run(async () => {
          harness.events.push('work');
          expect(harness.currentOwner()).toBe(harness.boundary.owner);
          return 42;
        }),
      ).resolves.toBe(42);

      expect(harness.events).toEqual(['begin', 'work', 'commit']);
      expect(harness.currentOwner()).toBeUndefined();
    });

    it('rolls back thrown errors', async () => {
      const failure = new Error('work failed');

      await expect(
        harness.boundary.run(async () => {
          harness.events.push('work');
          throw failure;
        }),
      ).rejects.toBe(failure);

      expect(harness.events).toEqual(['begin', 'work', 'rollback']);
      expect(harness.currentOwner()).toBeUndefined();
    });

    it('reuses an active transaction for nested REQUIRED work', async () => {
      await harness.boundary.run(async () => {
        harness.events.push('outer');
        await harness.boundary.run(async () => {
          harness.events.push('nested');
        });
      });

      expect(harness.events).toEqual([
        'begin',
        'outer',
        'nested',
        'commit',
      ]);
    });

    it('keeps outer options when nested REQUIRED work supplies options', async () => {
      await harness.boundary.run(async () => {
        harness.events.push('outer');
        await harness.boundary.run(async () => {
          harness.events.push('nested');
        }, {
          isolationLevel: 'serializable',
          readOnly: true,
        });
      });

      expect(harness.events).toEqual([
        'begin',
        'outer',
        'nested',
        'commit',
      ]);
    });

    it('forwards the portable isolation level', async () => {
      await harness.boundary.run(async () => {
        harness.events.push('work');
      }, { isolationLevel: 'serializable' });

      expect(harness.events).toEqual([
        'isolation:serializable',
        'begin',
        'work',
        'commit',
      ]);
    });

    it('makes a transaction read only before running work', async () => {
      await harness.boundary.run(async () => {
        harness.events.push('work');
      }, { readOnly: true });

      expect(harness.events).toEqual([
        'begin',
        'read-only',
        'work',
        'commit',
      ]);
    });

    it('isolates concurrent async ownership contexts', async () => {
      const observedOwners: Array<string | undefined> = [];

      await Promise.all([
        harness.boundary.run(async () => {
          await Promise.resolve();
          observedOwners.push(harness.currentOwner());
        }),
        harness.boundary.run(async () => {
          await Promise.resolve();
          observedOwners.push(harness.currentOwner());
        }),
      ]);

      expect(observedOwners).toEqual([
        harness.boundary.owner,
        harness.boundary.owner,
      ]);
      expect(harness.currentOwner()).toBeUndefined();
      expect(harness.events.filter(event => event === 'begin')).toHaveLength(2);
      expect(harness.events.filter(event => event === 'commit')).toHaveLength(2);
    });

    it('rejects a transaction owned by a different ORM', async () => {
      await expect(
        harness.runWithOwner('other-orm', () =>
          harness.boundary.run(async () => undefined),
        ),
      ).rejects.toThrow(
        `Cannot enter ${harness.boundary.owner} transaction while other-orm transaction is active`,
      );
      expect(harness.events).toEqual([]);
    });
  });
}
