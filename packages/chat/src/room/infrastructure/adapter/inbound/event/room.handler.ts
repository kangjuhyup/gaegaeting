import { Controller } from "@nestjs/common";
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';
import { RoomRepositoryPort } from '@app/room/domain/port/room-repository.port';
import { RoomEntity } from '@app/room/domain/model/room';
import { MemberEntity, MemberRole } from '@app/room/domain/model/member';
import { ChatRoomCreatedV1Payload } from '@app/common/payload';

@Controller()
export class RoomHandler {
  constructor(
    private readonly roomRepository: RoomRepositoryPort
  ) {}

  @EventPattern('chat.room.created.v1')
  async createRoom(@Payload() payload: ChatRoomCreatedV1Payload, @Ctx() context: KafkaContext) {
    try {
      console.log('Received chat room creation event:', payload);

      // Check if room already exists for this pair
      const directKey = this.getDirectKey(payload.leftUserId, payload.rightUserId);
      const existingRoom = await this.roomRepository.selectRoomFromDirectKey(directKey);
      
      if (existingRoom) {
        console.log(`Room already exists for pair ${payload.pairId}`);
        return;
      }

      // Create direct room between the two users with pairId
      const room = RoomEntity.createDirectRoom(payload.leftUserId, payload.rightUserId, payload.pairId);
      const savedRoom = await this.roomRepository.insertRoom(room);

      // Add both users as members
      const member1 = MemberEntity.create(savedRoom.id, payload.leftUserId, MemberRole.OWNER);
      const member2 = MemberEntity.create(savedRoom.id, payload.rightUserId, MemberRole.MEMBER);

      await this.roomRepository.insertMembers(savedRoom.id, [member1, member2]);

      console.log(`Chat room created successfully for pair ${payload.pairId}, room ID: ${savedRoom.id}`);
    } catch (error) {
      console.error('Error creating chat room:', error);
      // 실패 시 재시도 로직이나 Dead Letter Queue 처리가 필요할 수 있음
    }
  }

  private getDirectKey(userId1: string, userId2: string): string {
    const sortedUserIds = [userId1, userId2].sort();
    return `${sortedUserIds[0]}-${sortedUserIds[1]}`;
  }
}