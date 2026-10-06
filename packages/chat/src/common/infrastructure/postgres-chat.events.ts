import { EventEmitter } from 'node:events';
import { Client } from 'pg';
import { ConfigService } from '@nestjs/config';
import { Injectable, Logger } from '@nestjs/common';
import { readDatabaseConnectionOptions } from '@core/database';
import { ChatEventsPort, type ChatEvent } from '../application/port/chat-events.port.js';

@Injectable()
export class PostgresChatEvents extends ChatEventsPort {
  private readonly changes = new EventEmitter();
  private readonly logger = new Logger(PostgresChatEvents.name);
  private client?: Client;
  private stopped = false;
  private retry?: ReturnType<typeof setTimeout>;
  constructor(private readonly config: ConfigService) { super(); this.changes.setMaxListeners(0); }
  async onModuleInit() { await this.connect(); }
  private async connect() {
    if (this.stopped) return;
    const client = new Client(readDatabaseConnectionOptions(this.config));
    this.client = client;
    const retry = () => {
      if (this.stopped || this.client !== client) return;
      this.client = undefined;
      void client.end().catch(() => {});
      this.logger.warn('채팅 실시간 연결 재시도');
      this.retry = setTimeout(() => { void this.connect().catch(retryConnect); }, 2000);
    };
    const retryConnect = () => {
      if (!this.stopped) this.retry = setTimeout(() => { void this.connect().catch(retryConnect); }, 2000);
    };
    client.on('error', retry);
    client.on('end', retry);
    client.on('notification', notification => {
      try {
        const event = JSON.parse(notification.payload ?? '') as ChatEvent;
        if (!Number.isInteger(event.roomId) || !['ROOM', 'MESSAGE', 'READ'].includes(event.kind)) return;
        this.changes.emit('change', event);
      } catch { this.logger.warn('유효하지 않은 채팅 알림'); }
    });
    try {
      await client.connect();
      await client.query('LISTEN gaegaeting_chat');
      this.changes.emit('change', { roomId: null, messageId: null, kind: 'RESYNC' });
    } catch (error) { this.client = undefined; await client.end().catch(() => {}); throw error; }
  }
  events(roomId?: number): AsyncIterableIterator<ChatEvent> {
    let pending: ChatEvent | undefined = { roomId: roomId ?? null, kind: 'RESYNC', messageId: null };
    let waiting: ((result: IteratorResult<ChatEvent>) => void) | undefined;
    let finished = false;
    const listener = (event: ChatEvent) => {
      if (finished || (roomId !== undefined && event.roomId !== null && event.roomId !== roomId)) return;
      if (waiting) { const next = waiting; waiting = undefined; next({ done: false, value: event }); }
      // One bounded signal is enough: clients fetch persisted history, so coalescing cannot lose a message.
      else pending = pending ? { roomId: roomId ?? null, kind: 'RESYNC', messageId: null } : event;
    };
    const finish = () => {
      finished = true; pending = undefined; this.changes.off('change', listener); this.changes.off('stop', finish);
      waiting?.({ done: true, value: undefined }); waiting = undefined;
    };
    this.changes.on('change', listener); this.changes.on('stop', finish);
    return {
      [Symbol.asyncIterator]() { return this; },
      next: async () => {
        if (finished) return { done: true, value: undefined };
        if (pending) { const event = pending; pending = undefined; return { done: false, value: event }; }
        return new Promise<IteratorResult<ChatEvent>>(resolve => { waiting = resolve; });
      },
      return: async () => { finish(); return { done: true, value: undefined }; },
      throw: async error => { finish(); throw error; },
    };
  }
  async onModuleDestroy() {
    this.stopped = true; clearTimeout(this.retry); this.changes.emit('stop');
    await this.client?.end();
  }
}
