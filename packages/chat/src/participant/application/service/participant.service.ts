import { BadRequestException, Injectable } from '@nestjs/common';
import { ParticipantRepositoryPort } from '../port/participant-repository.port.js';
@Injectable()
export class ParticipantService {
  constructor(private readonly repository: ParticipantRepositoryPort) {}
  read(roomId: number, userId: string, messageId: number) {
    if (!Number.isSafeInteger(messageId) || messageId < 1) throw new BadRequestException('유효하지 않은 읽음 위치입니다.');
    return this.repository.read(roomId, userId, messageId);
  }
}
