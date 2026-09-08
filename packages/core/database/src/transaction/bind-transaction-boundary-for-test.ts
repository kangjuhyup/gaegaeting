import type { TransactionBoundary } from './transaction-boundary.js';
import { TRANSACTION_BOUNDARY_PROPERTY } from './transaction.tokens.js';

export function bindTransactionBoundaryForTest(
  target: object,
  boundary: TransactionBoundary,
): void {
  Object.defineProperty(target, TRANSACTION_BOUNDARY_PROPERTY, {
    configurable: true,
    enumerable: false,
    value: boundary,
    writable: true,
  });
}
