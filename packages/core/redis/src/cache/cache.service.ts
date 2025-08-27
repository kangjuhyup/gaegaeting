import { Inject, Injectable, Optional } from '@nestjs/common';
import Redis, { Cluster } from 'ioredis';
import { REDIS_CACHE_CLIENT, REDIS_CACHE_OPTIONS, RedisCacheModuleOptions } from './cache.type';

@Injectable()
export class CacheService {
  constructor(
    @Inject(REDIS_CACHE_CLIENT) private readonly redis: Redis | Cluster,
    @Optional() @Inject(REDIS_CACHE_OPTIONS) private readonly opts?: RedisCacheModuleOptions,
  ) {}

  private fullKey(key: string, ns?: string) {
    const prefix = this.opts?.prefix ? `${this.opts.prefix}:` : '';
    const namespace = ns ? `${ns}:` : '';
    return `${prefix}${namespace}${key}`;
  }

  async get<T = any>(key: string, ns?: string): Promise<T | null> {
    // @ts-ignore
    const raw = await this.redis.get(this.fullKey(key, ns));
    if (raw == null) return null;
    try { return JSON.parse(raw, this.opts?.reviver) as T; }
    catch { return raw as unknown as T; }
  }

  async set<T = any>(key: string, value: T, ttlSec?: number, ns?: string): Promise<void> {
    const payload = typeof value === 'string' ? value : JSON.stringify(value, this.opts?.replacer);
    const full = this.fullKey(key, ns);
    // @ts-ignore
    if (ttlSec && ttlSec > 0) await this.redis.set(full, payload, 'EX', ttlSec);
    else await this.redis.set(full, payload);
  }

  async del(key: string, ns?: string): Promise<void> {
    // @ts-ignore
    await this.redis.del(this.fullKey(key, ns));
  }

  async wrap<T>(key: string, producer: () => Promise<T>, ttlSec?: number, ns?: string): Promise<T> {
    const hit = await this.get<T>(key, ns);
    if (hit !== null) return hit;
    const fresh = await producer();
    await this.set(key, fresh, ttlSec, ns);
    return fresh;
  }

  /* optional helpers */
  async mdel(keys: string[], ns?: string) {
    if (!keys.length) return;
    const full = keys.map(k => this.fullKey(k, ns));
    // @ts-ignore
    await this.redis.del(...full);
  }
}