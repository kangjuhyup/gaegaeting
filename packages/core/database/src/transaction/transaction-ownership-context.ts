import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

@Injectable()
export class TransactionOwnershipContext {
  private readonly storage = new AsyncLocalStorage<string>();

  currentOwner(): string | undefined {
    return this.storage.getStore();
  }

  assertAvailable(owner: string): void {
    const activeOwner = this.currentOwner();
    if (activeOwner && activeOwner !== owner) {
      throw new Error(
        `Cannot enter ${owner} transaction while ${activeOwner} transaction is active`,
      );
    }
  }

  run<T>(owner: string, work: () => T): T {
    this.assertAvailable(owner);
    return this.storage.run(owner, work);
  }
}

export const defaultTransactionOwnershipContext = new TransactionOwnershipContext();
