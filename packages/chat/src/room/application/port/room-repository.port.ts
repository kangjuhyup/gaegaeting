import type { ChatPair, ChatRoom } from '../../domain/model/room.js';
export abstract class RoomRepositoryPort {
  /** Persist the room and its two participants atomically, once per match. */
  abstract ensureRoom(pair: ChatPair): Promise<number>;
  abstract rooms(userId: string): Promise<ChatRoom[]>;
  abstract room(roomId: number, userId: string): Promise<ChatRoom>;
}
