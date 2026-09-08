import { EntityManager } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import { DatabaseModule } from '../database.module.js';
import { DatabaseSchema } from '../database-schema.js';
import { Transactional } from '../decorator/transaction.js';

@Injectable()
class TransactionProbe {
  @Transactional()
  async execute(): Promise<string> {
    return 'done';
  }
}

describe('DatabaseModule transaction boundary injection', () => {
  it('injects the default MikroORM boundary without constructor parameters', async () => {
    const manager = { getConnection: jest.fn() };
    const transactional = jest.fn(async (work: (value: unknown) => unknown) =>
      work(manager),
    );
    const definition = DatabaseModule.forRootAsync({}, [DatabaseSchema.USER]);
    const moduleRef = await Test.createTestingModule({
      providers: [
        ...(definition.providers ?? []),
        TransactionProbe,
        { provide: EntityManager, useValue: { transactional } },
      ],
    }).compile();

    const probe = moduleRef.get(TransactionProbe);
    await expect(probe.execute()).resolves.toBe('done');
    expect(TransactionProbe.length).toBe(0);
    expect(transactional).toHaveBeenCalledTimes(1);
  });
});
