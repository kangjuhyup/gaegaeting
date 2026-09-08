import type { TransactionOptions } from './transaction-options.js';

export interface TransactionBoundary {
  readonly owner: string;
  run<T>(
    work: () => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T>;
}
