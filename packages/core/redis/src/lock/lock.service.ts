import { Inject, Injectable, Optional } from '@nestjs/common';
import Redlock, { ResourceLockedError, ExecutionError } from 'redlock';
import { REDLOCK, REDLOCK_OPTIONS, RedlockModuleOptions } from './lock.type';

@Injectable()
export class RedlockService {
  constructor(
    @Inject(REDLOCK) private readonly redlock: Redlock,
    @Optional() @Inject(REDLOCK_OPTIONS) private readonly opts?: RedlockModuleOptions,
  ) {}

  private fullKey(key: string, ns?: string) {
    const prefix = this.opts?.prefix ? `${this.opts.prefix}:` : '';
    const namespace = ns ? `${ns}:` : '';
    return `${prefix}${namespace}${key}`;
  }

  /** 락 획득 (실패 시 예외) */
  async acquire(key: string, ttlMs?: number, ns?: string) {
    const resource = this.fullKey(key, ns);
    const ttl = ttlMs ?? this.opts?.defaultTtlMs ?? 10_000;
    return this.redlock.acquire([resource], ttl);
  }

  /** 락 시도 (실패 시 null 반환) */
  async tryAcquire(key: string, ttlMs?: number, ns?: string) {
    try {
      return await this.acquire(key, ttlMs, ns);
    } catch (e) {
      if (e instanceof ResourceLockedError || e instanceof ExecutionError) return null;
      throw e;
    }
  }

  /** 락 해제 */
  async release(lock: Awaited<ReturnType<Redlock['acquire']>>) {
    await lock.release();
  }

  /** TTL 연장 */
  async extend(lock: Awaited<ReturnType<Redlock['acquire']>>, ttlMs: number) {
    return lock.extend(ttlMs);
  }

  /** withLock: 락 획득 → job 실행 → 해제 보장 */
  async using<T>(
    key: string,
    job: () => Promise<T>,
    opts?: { ttlMs?: number; ns?: string },
  ): Promise<T> {
    const lock = await this.acquire(key, opts?.ttlMs, opts?.ns);
    try {
      return await job();
    } finally {
      await this.release(lock).catch(() => void 0);
    }
  }
}