import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from } from 'rxjs';
import { tap, switchMap } from 'rxjs/operators';
import { CacheService } from './cache.service';
import { CACHEABLE_METADATA, CACHE_EVICT_METADATA, CacheableOptions, CacheEvictOptions } from './cache.type';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private readonly cache: CacheService,
    private readonly reflector: Reflector,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const target = ctx.getHandler();
    const cacheable = this.reflector.get<CacheableOptions | undefined>(CACHEABLE_METADATA, target);
    const evict = this.reflector.get<CacheEvictOptions | undefined>(CACHE_EVICT_METADATA, target);

    // Evict 우선 처리: 실제 핸들러 수행 후 캐시 삭제
    if (evict) {
      const key = this.buildKey(evict, ctx);
      const ns = evict.namespace;
      return next.handle().pipe(
        tap(async () => { if (key) await this.cache.del(key, ns); }),
      );
    }

    if (!cacheable) return next.handle();

    const key = this.buildKey(cacheable, ctx);
    const ns = cacheable.namespace;
    const ttl = cacheable.ttlSec;

    if (!key) return next.handle();

    // 캐시 조회 → miss면 실제 핸들러 → set
    return from(this.cache.get(key, ns)).pipe(
      switchMap((hit) => {
        if (hit !== null) return from(Promise.resolve(hit));
        return next.handle().pipe(
          tap(async (value) => { await this.cache.set(key, value, ttl, ns); }),
        );
      }),
    );
  }

  private buildKey(opts: { key?: string; keyFn?: (args: any[], ctx?: any) => string }, ctx: ExecutionContext): string | null {
    if (opts.key) return opts.key;
    if (opts.keyFn) {
      const args = this.getArgs(ctx);
      try { return opts.keyFn(args, ctx); } catch { return null; }
    }
    // 기본: 클래스명.메서드명(JSON(args))
    const cls = ctx.getClass().name;
    const handler = ctx.getHandler().name;
    const args = this.safeStringify(this.getArgs(ctx));
    return `${cls}.${handler}:${args}`;
  }

  private getArgs(ctx: ExecutionContext) {
    const type = ctx.getType<'http' | 'rpc' | 'ws'>();
    if (type === 'http') {
      const req = ctx.switchToHttp().getRequest();
      return [req.params, req.query, req.body, req.user];
    }
    if (type === 'rpc') return [ctx.switchToRpc().getData()];
    if (type === 'ws') return [ctx.switchToWs().getData()];
    return [];
  }

  private safeStringify(v: any) {
    try { return JSON.stringify(v); } catch { return '[unstringifiable]'; }
  }
}