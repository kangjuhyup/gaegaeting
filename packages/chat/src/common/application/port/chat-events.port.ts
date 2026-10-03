export interface ChatEvent {
  roomId: number | null; kind: 'ROOM' | 'MESSAGE' | 'READ' | 'RESYNC'; messageId: number | null;
}
export abstract class ChatEventsPort {
  abstract events(roomId?: number): AsyncIterableIterator<ChatEvent>;
}
