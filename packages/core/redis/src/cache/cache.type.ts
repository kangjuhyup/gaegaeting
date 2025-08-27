import { SetMetadata } from '@nestjs/common';
import type { RedisClientMode } from '../redis.type';

export const REDIS_CACHE_CLIENT = Symbol('REDIS_CACHE_CLIENT');
export const REDIS_CACHE_OPTIONS = Symbol('REDIS_CACHE_OPTIONS');

export interface RedisCacheModuleOptions {
  client: RedisClientMode;
  prefix?: string;
  replacer?: (this: any, key: string, value: any) => any;
  reviver?: (this: any, key: string, value: any) => any;
}

export interface RedisCacheModuleAsyncOptions {
  useFactory: (...args: any[]) => Promise<RedisCacheModuleOptions> | RedisCacheModuleOptions;
  inject?: any[];
}

export const CACHEABLE_METADATA = 'cacheable:options';
export const CACHE_EVICT_METADATA = 'cache:evict';

export type CacheKeyFn = (args: any[], context?: any) => string;

export type CacheableOptions = {
  key?: string;
  keyFn?: CacheKeyFn;
  namespace?: string;
  ttlSec?: number;
};
export type CacheEvictOptions = {
  key?: string;
  keyFn?: CacheKeyFn;
  namespace?: string;
};

export const Cacheable = (opts: CacheableOptions) => SetMetadata(CACHEABLE_METADATA, opts);
export const CacheEvict = (opts: CacheEvictOptions) => SetMetadata(CACHE_EVICT_METADATA, opts);