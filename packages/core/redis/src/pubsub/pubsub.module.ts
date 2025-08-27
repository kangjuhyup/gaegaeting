import { DynamicModule, Module } from '@nestjs/common';
import { createRedisClient } from '../redis.factory';
import { REDIS_PUB_CLIENT, REDIS_SUB_CLIENT, REDIS_PUBSUB_OPTIONS, RedisPubSubModuleAsyncOptions, RedisPubSubModuleOptions } from './pubsub.type';
import { RedisPubSubService } from './pubsub.service';

@Module({})
export class RedisPubSubModule {
  static forRoot(options: RedisPubSubModuleOptions): DynamicModule {
    const pub = createRedisClient({ client: options.client });
    const sub = createRedisClient({ client: options.client });
    return {
      module: RedisPubSubModule,
      providers: [
        { provide: REDIS_PUBSUB_OPTIONS, useValue: options },
        { provide: REDIS_PUB_CLIENT, useValue: pub },
        { provide: REDIS_SUB_CLIENT, useValue: sub },
        RedisPubSubService,
      ],
      exports: [RedisPubSubService],
    };
  }

  static forRootAsync(opts: RedisPubSubModuleAsyncOptions): DynamicModule {
    return {
      module: RedisPubSubModule,
      providers: [
        { provide: REDIS_PUBSUB_OPTIONS, useFactory: opts.useFactory, inject: opts.inject ?? [] },
        {
          provide: REDIS_PUB_CLIENT,
          useFactory: (o: RedisPubSubModuleOptions) => createRedisClient({ client: o.client }),
          inject: [REDIS_PUBSUB_OPTIONS],
        },
        {
          provide: REDIS_SUB_CLIENT,
          useFactory: (o: RedisPubSubModuleOptions) => createRedisClient({ client: o.client }),
          inject: [REDIS_PUBSUB_OPTIONS],
        },
        RedisPubSubService,
      ],
      exports: [RedisPubSubService],
    };
  }
}