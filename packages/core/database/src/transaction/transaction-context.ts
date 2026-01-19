import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { DataSource, EntityManager } from 'typeorm';

@Injectable()
export class TransactionContext {
  private static readonly asyncStorage = new AsyncLocalStorage<EntityManager>();
  private static dataSource: DataSource | undefined;

  /**
   * Nest DI로 DataSource를 주입받아 static 컨텍스트에 보관합니다.
   * - 데코레이터(@Transactional)에서 this.dataSource 없이도 트랜잭션을 시작할 수 있게 합니다.
   */
  constructor(dataSource: DataSource) {
    TransactionContext.dataSource = dataSource;
  }

  static getDataSource(): DataSource | undefined {
    return this.dataSource;
  }

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