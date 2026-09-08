import { Inject } from '@nestjs/common';
import type { TransactionBoundary } from '../transaction/transaction-boundary.js';
import {
  DEFAULT_TRANSACTION_BOUNDARY,
  TRANSACTION_BOUNDARY_PROPERTY,
} from '../transaction/transaction.tokens.js';

type TransactionalInstance = {
  constructor: { name: string };
  [TRANSACTION_BOUNDARY_PROPERTY]?: TransactionBoundary;
};

export function Transactional(): MethodDecorator {
  return (target, propertyKey, descriptor: PropertyDescriptor) => {
    Inject(DEFAULT_TRANSACTION_BOUNDARY)(
      target,
      TRANSACTION_BOUNDARY_PROPERTY,
    );
    const originalMethod = descriptor.value;

    descriptor.value = async function (
      this: TransactionalInstance,
      ...args: unknown[]
    ) {
      const boundary = this[TRANSACTION_BOUNDARY_PROPERTY];
      if (!boundary) {
        throw new Error(
          `No transaction boundary is registered for ${this.constructor.name}.${String(propertyKey)}`,
        );
      }

      return boundary.run(() => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}
