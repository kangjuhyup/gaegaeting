import { SetMetadata } from '@nestjs/common';
import type { RedisClientMode } from '../redis.type';

export const REDLOCK = Symbol('REDLOCK');
export const REDLOCK_CLIENTS = Symbol('REDLOCK_CLIENTS');
export const REDLOCK_OPTIONS = Symbol('REDLOCK_OPTIONS');

export interface RedlockModuleOptions {
  clients: RedisClientMode; // 권장: multi-single (독립 Redis 3~5개)
  prefix?: string;
  redlock?: { driftFactor?: number; retryCount?: number; retryDelay?: number; retryJitter?: number; };
  defaultTtlMs?: number;
}
export interface RedlockModuleAsyncOptions {
  useFactory: (...args:any[]) => Promise<RedlockModuleOptions> | RedlockModuleOptions;
  inject?: any[];
}

export const WITH_DLOCK_METADATA = 'with-dlock:options';
export type LockKeyFn = (args:any[], ctx?:any)=>string;
export type WithDLockOptions = { key?:string; keyFn?:LockKeyFn; namespace?:string; ttlMs?:number; };
export const WithDLock = (opts: WithDLockOptions)=> SetMetadata(WITH_DLOCK_METADATA, opts);