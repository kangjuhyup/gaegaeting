import { DataSource, EntityManager, EntityTarget, Repository } from 'typeorm';
import { TransactionContext } from '../transaction/transaction-context';

export class BaseRepository<T> {
  constructor(
    private readonly entity: EntityTarget<T>,
    protected readonly dataSource: DataSource,
  ) {}

  protected getManager(): EntityManager {
    const transactionManager = TransactionContext.getEntityManager();
    return transactionManager || this.dataSource.manager;
  }

  public getRepository(): Repository<T> {
    const manager = this.getManager();
    return manager.getRepository(this.entity);
  }
}