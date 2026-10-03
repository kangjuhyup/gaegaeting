import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { RoomRepositoryPort } from '../../room/application/port/room-repository.port.js';
import { ChatEventsPort, type ChatEvent } from './port/chat-events.port.js';

@Injectable()
export class ChatRealtimeService {
  constructor(private readonly rooms: RoomRepositoryPort, private readonly source: ChatEventsPort) {}
  async watch(userId: string, roomId?: number): Promise<AsyncIterableIterator<ChatEvent>> {
    if (roomId !== undefined) await this.rooms.room(roomId, userId);
    const events = this.source.events(roomId);
    return {
      [Symbol.asyncIterator]() { return this; },
      next: async () => {
        for (;;) {
          const event = await events.next();
          if (event.done || event.value.kind === 'RESYNC') return event;
          try {
            await this.rooms.room(event.value.roomId!, userId);
            return event;
          } catch (error) {
            if (error instanceof NotFoundException) continue;
            throw new ServiceUnavailableException('실시간 연결을 다시 시작해 주세요.');
          }
        }
      },
      return: async () => { await events.return?.(); return { done: true, value: undefined }; },
      throw: async error => { await events.return?.(); throw error; },
    };
  }
}
