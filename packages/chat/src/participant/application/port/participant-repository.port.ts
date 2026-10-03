import type { ParticipantReadState } from '../../domain/model/participant.js';
export abstract class ParticipantRepositoryPort {
  /** Move forward to an existing message in this participant's room; never backwards. */
  abstract read(roomId: number, userId: string, messageId: number): Promise<ParticipantReadState>;
}
