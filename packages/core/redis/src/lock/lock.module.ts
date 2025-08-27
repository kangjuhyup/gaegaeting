import { DynamicModule, Module } from '@nestjs/common';
import Redlock from 'redlock';
import { createRedisClients } from '../redis.factory';
import { REDLOCK, REDLOCK_CLIENTS, REDLOCK_OPTIONS, RedlockModuleAsyncOptions, RedlockModuleOptions } from './lock.type';
import Redis from 'ioredis';

@Module({})
export class RedisRedlockModule {
  static forRoot(options: RedlockModuleOptions): DynamicModule {
    const clients = createRedisClients({ client: options.clients });
    const redlock = new Redlock(clients as Redis[], {
      driftFactor: options.redlock?.driftFactor ?? 0.01,
      retryCount:  options.redlock?.retryCount  ?? 10,
      retryDelay:  options.redlock?.retryDelay  ?? 200,
      retryJitter: options.redlock?.retryJitter ?? 0,
    });

    return {
      module: RedisRedlockModule,
      providers: [
        { provide: REDLOCK_OPTIONS, useValue: options },
        { provide: REDLOCK_CLIENTS, useValue: clients },
        { provide: REDLOCK, useValue: redlock },
      ],
      exports: [REDLOCK, REDLOCK_OPTIONS, REDLOCK_CLIENTS],
    };
  }

  static forRootAsync(opts: RedlockModuleAsyncOptions): DynamicModule {
    return {
      module: RedisRedlockModule,
      providers: [
        { provide: REDLOCK_OPTIONS, useFactory: opts.useFactory, inject: opts.inject ?? [] },
        {
          provide: REDLOCK_CLIENTS,
          useFactory: (o: RedlockModuleOptions) => createRedisClients({ client: o.clients }),
          inject: [REDLOCK_OPTIONS],
        },
        {
          provide: REDLOCK,
          useFactory: (clients: any[], o: RedlockModuleOptions) =>
            new (require('redlock').default)(clients, {
              driftFactor: o.redlock?.driftFactor ?? 0.01,
              retryCount:  o.redlock?.retryCount  ?? 10,
              retryDelay:  o.redlock?.retryDelay  ?? 200,
              retryJitter: o.redlock?.retryJitter ?? 0,
            }),
          inject: [REDLOCK_CLIENTS, REDLOCK_OPTIONS],
        },
      ],
      exports: [REDLOCK, REDLOCK_OPTIONS, REDLOCK_CLIENTS],
    };
  }
}