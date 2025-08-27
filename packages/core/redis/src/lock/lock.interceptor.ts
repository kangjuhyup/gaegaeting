import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from } from 'rxjs';
import { finalize, switchMap } from 'rxjs/operators';
import { RedlockService } from './lock.service';
import { WITH_DLOCK_METADATA, WithDLockOptions } from './lock.type';

@Injectable()
export class RedlockInterceptor implements NestInterceptor {
  constructor(
    private readonly lock: RedlockService,
    private readonly reflector: Reflector,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const meta = this.reflector.get<WithDLockOptions | undefined>(WITH_DLOCK_METADATA, ctx.getHandler());
    if (!meta) return next.handle();

    const key = this.resolveKey(meta, ctx);
    const ttl = meta.ttlMs;
    const ns = meta.namespace;

    let acquired: any;

    return from(this.lock.acquire(key, ttl, ns)).pipe(
      switchMap((l) => { acquired = l; return next.handle(); }),
      finalize(async () => { if (acquired) await this.lock.release(acquired).catch(() => void 0); }),
    );
  }

  private resolveKey(meta: WithDLockOptions, ctx: ExecutionContext): string {
    if (meta.key) return meta.key;
    if (meta.keyFn) return meta.keyFn(this.getArgs(ctx), ctx);
    const cls = ctx.getClass().name;
    const name = ctx.getHandler().name;
    return `${cls}.${name}:${this.safeStringify(this.getArgs(ctx))}`;
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

  private safeStringify(v: any) { try { return JSON.stringify(v); } catch { return '[unstringifiable]'; } }
}