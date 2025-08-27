// src/redis-pubsub/redis-pubsub.service.ts
import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { REDIS_PUBSUB_OPTIONS, REDIS_PUB_CLIENT, REDIS_SUB_CLIENT, RedisPubSubModuleOptions } from './pubsub.type';
import Redis, { Cluster } from 'ioredis';

type Handler = (message: any, channel: string) => Promise<void> | void;

@Injectable()
export class RedisPubSubService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisPubSubService.name);
  private readonly handlers = new Map<string, Set<Handler>>();       // channel -> handlers
  private readonly pHandlers = new Map<string, Set<Handler>>();      // pattern -> handlers

  constructor(
    @Inject(REDIS_PUBSUB_OPTIONS) private readonly opts: RedisPubSubModuleOptions,
    @Inject(REDIS_PUB_CLIENT) private readonly pub: Redis | Cluster,
    @Inject(REDIS_SUB_CLIENT) private readonly sub: Redis | Cluster,
  ) {}

  async onModuleInit() {
    this.sub.on('message', (channel, payload) => this.dispatch(channel, payload));
    this.sub.on('pmessage', (_pattern, channel, payload) => this.dispatch(channel, payload, _pattern));

    // useful logs
    this.sub.on('error', (e) => this.logger.error(`SUB error: ${e.message}`, e.stack));
    this.pub.on('error', (e) => this.logger.error(`PUB error: ${e.message}`, e.stack));

    // cluster ready events are also handled by ioredis internally
    this.logger.log('RedisPubSubService initialized');
  }

  async onModuleDestroy() {
    try {
      // ioredis gracefully closes connections
      await Promise.allSettled([this.sub.quit(), this.pub.quit()]);
    } catch {
      await Promise.allSettled([this.sub.disconnect(), this.pub.disconnect()]);
    }
  }

  // ---------- publish ----------
  async publish(channel: string, data: any): Promise<number> {
    const payload = this.stringify(data);
    // ioredis Cluster/Redis 동일 API
    return this.pub.publish(channel, payload);
  }

  // ---------- subscribe ----------
  async subscribe(channel: string, handler: Handler): Promise<void> {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
      await this.sub.subscribe(channel);
    }
    this.handlers.get(channel)!.add(handler);
  }

  async unsubscribe(channel: string, handler?: Handler): Promise<void> {
    const set = this.handlers.get(channel);
    if (!set) return;

    if (handler) {
      set.delete(handler);
    } else {
      set.clear();
    }
    if (set.size === 0) {
      this.handlers.delete(channel);
      await this.sub.unsubscribe(channel);
    }
  }

  // ---------- pattern subscribe ----------
  async psubscribe(pattern: string, handler: Handler): Promise<void> {
    if (!this.pHandlers.has(pattern)) {
      this.pHandlers.set(pattern, new Set());
      await this.sub.psubscribe(pattern);
    }
    this.pHandlers.get(pattern)!.add(handler);
  }

  async punsubscribe(pattern: string, handler?: Handler): Promise<void> {
    const set = this.pHandlers.get(pattern);
    if (!set) return;

    if (handler) {
      set.delete(handler);
    } else {
      set.clear();
    }
    if (set.size === 0) {
      this.pHandlers.delete(pattern);
      await this.sub.punsubscribe(pattern);
    }
  }

  // ---------- utils ----------
  private dispatch(channel: string, payload: string, pattern?: string) {
    const message = this.parse(payload);

    const run = async (h: Handler) => {
      try {
        await h(message, channel);
      } catch (e: any) {
        if (this.opts.swallowHandlerError ?? true) {
          this.logger.error(`handler error on ${channel}${pattern ? ` (pattern: ${pattern})` : ''}: ${e?.message}`);
        } else {
          throw e;
        }
      }
    };

    const hs = this.handlers.get(channel);
    if (hs) hs.forEach((h) => void run(h));

    if (pattern) {
      const ps = this.pHandlers.get(pattern);
      if (ps) ps.forEach((h) => void run(h));
    }
  }

  private stringify(data: any): string {
    if (typeof data === 'string') return data;
    try {
      return JSON.stringify(data, this.opts.json?.replacer);
    } catch {
      // fallback
      return String(data);
    }
  }

  private parse(payload: string): any {
    try {
      return JSON.parse(payload, this.opts.json?.reviver);
    } catch {
      return payload;
    }
  }

  /** 핑(헬스체크) */
  async ping(): Promise<string> {
    // @ts-ignore
    return this.pub.ping();
  }
}