import { EntityManager, MikroORM } from '@mikro-orm/core';
import { Test } from '@nestjs/testing';
import { DEFAULT_TRANSACTION_BOUNDARY } from './transaction/transaction.tokens.js';
import { DatabaseModule } from './database.module.js';
import { DatabaseSchema } from './database-schema.js';
import { MikroOrmTransactionAdapter } from './mikro/transaction/mikro-transaction.adapter.js';

describe('DatabaseModule', () => {
  const options = {
    useFactory: () => ({
      get<T>(_key: string, fallback?: T): T {
        return fallback as T;
      },
    }),
  };

  it('composes MikroORM and binds it as the default transaction boundary', async () => {
    const dynamicModule = DatabaseModule.forRootAsync(options, [
      DatabaseSchema.USER,
    ]);
    const mikroImport = await dynamicModule.imports?.[0];

    expect(mikroImport?.exports).toEqual(expect.arrayContaining([MikroORM]));
    expect(dynamicModule.providers).toEqual(
      expect.arrayContaining([
        MikroOrmTransactionAdapter,
        {
          provide: DEFAULT_TRANSACTION_BOUNDARY,
          useExisting: MikroOrmTransactionAdapter,
        },
      ]),
    );
    expect(dynamicModule.exports).toEqual(
      expect.arrayContaining([DEFAULT_TRANSACTION_BOUNDARY]),
    );
  });

  it('boots the database module and exposes the default transaction boundary without connecting', async () => {
    const entityManager = {};
    const orm = { em: entityManager, close: async () => undefined };
    const module = await Test.createTestingModule({
      imports: [DatabaseModule.forRootAsync(options, [DatabaseSchema.USER])],
    })
      .overrideProvider(MikroORM)
      .useValue(orm)
      .overrideProvider(EntityManager)
      .useValue(entityManager)
      .compile();

    try {
      expect(module.get(DEFAULT_TRANSACTION_BOUNDARY)).toBeInstanceOf(
        MikroOrmTransactionAdapter,
      );
      expect(module.get(EntityManager)).toBe(entityManager);
    } finally {
      await module.close();
    }
  });

  it('rejects an empty schema selection before creating a connection', () => {
    expect(() => DatabaseModule.forRootAsync(options, [])).toThrow(
      'At least one database schema is required',
    );
  });
});
