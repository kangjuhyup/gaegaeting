export interface ParticipantReadState {
  roomId: number; userId: string; lastReadMessageId: number; lastReadAt: string | null;
}
