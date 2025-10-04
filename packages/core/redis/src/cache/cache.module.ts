import { DynamicModule, Module } from '@nestjs/common';
import { createRedisClient } from '../redis.factory';
import { REDIS_CACHE_CLIENT, REDIS_CACHE_OPTIONS, RedisCacheModuleAsyncOptions, RedisCacheModuleOptions } from './cache.type';
import { CacheService } from './cache.service';

@Module({})
export class RedisCacheModule {
  static forRoot(options: RedisCacheModuleOptions): DynamicModule {
    const client = createRedisClient({ client: options.client });
    return {
      module: RedisCacheModule,
      providers: [
        { provide: REDIS_CACHE_OPTIONS, useValue: options },
        { provide: REDIS_CACHE_CLIENT, useValue: client },
        CacheService,
      ],
      exports: [CacheService, REDIS_CACHE_OPTIONS, REDIS_CACHE_CLIENT],
    };
  }

  static forRootAsync(opts: RedisCacheModuleAsyncOptions): DynamicModule {
    return {
      module: RedisCacheModule,
      imports: opts.imports ?? [],
      providers: [
        { provide: REDIS_CACHE_OPTIONS, useFactory: opts.useFactory, inject: opts.inject ?? [] },
        {
          provide: REDIS_CACHE_CLIENT,
          useFactory: (o: RedisCacheModuleOptions) => createRedisClient({ client: o.client }),
          inject: [REDIS_CACHE_OPTIONS],
        },
        CacheService,
      ],
      exports: [CacheService, REDIS_CACHE_OPTIONS, REDIS_CACHE_CLIENT],
    };
  }
}