import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { EntityManager } from 'typeorm';

@Injectable()
export class TransactionContext {
  private static readonly asyncStorage = new AsyncLocalStorage<EntityManager>();

  static getEntityManager(): EntityManager | undefined {
    return this.asyncStorage.getStore();
  }

  static run<T>(entityManager: EntityManager, callback: () => T): T {
    return this.asyncStorage.run(entityManager, callback);
  }

  static async runAsync<T>(entityManager: EntityManager, callback: () => Promise<T>): Promise<T> {
    return this.asyncStorage.run(entityManager, callback);
  }
}