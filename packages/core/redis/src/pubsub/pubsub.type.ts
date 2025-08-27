import type { RedisClientMode } from '../redis.type';

export const REDIS_PUB_CLIENT = Symbol('REDIS_PUB_CLIENT');
export const REDIS_SUB_CLIENT = Symbol('REDIS_SUB_CLIENT');
export const REDIS_PUBSUB_OPTIONS = Symbol('REDIS_PUBSUB_OPTIONS');

export interface RedisPubSubModuleOptions {
  client: RedisClientMode; // 단일 연결로 pub/sub 각각 생성
  json?: { replacer?: (this:any,k:string,v:any)=>any; reviver?: (this:any,k:string,v:any)=>any };
  swallowHandlerError?: boolean;
}
export interface RedisPubSubModuleAsyncOptions {
  useFactory: (...args: any[]) => Promise<RedisPubSubModuleOptions> | RedisPubSubModuleOptions;
  inject?: any[];
}