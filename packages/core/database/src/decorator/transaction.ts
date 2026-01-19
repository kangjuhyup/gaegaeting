import { DataSource, EntityManager } from 'typeorm';
import { TransactionContext } from '../transaction/transaction-context';

export function Transactional(dataSource?: DataSource) {
  return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const existingManager = TransactionContext.getEntityManager();
      
      if (existingManager) {
        return originalMethod.apply(this, args);
      }

      const ds = dataSource || this.dataSource || TransactionContext.getDataSource();
      if (!ds) {
        throw new Error(
          'DataSource not found. Provide DataSource via decorator parameter, ensure it exists on the class instance, or register DatabaseModule so TransactionContext can receive it via DI.',
        );
      }

      return ds.transaction(async (manager: EntityManager) => {
        return TransactionContext.runAsync(manager, () => originalMethod.apply(this, args));
      });
    };

    return descriptor;
  };
}