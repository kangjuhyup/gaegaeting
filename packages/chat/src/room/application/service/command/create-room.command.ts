import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { CreateRoomCommand } from "../../port/command/create-room.port";
import { RoomEntity, RoomType } from "@app/room/domain/model/room";
import { RoomRepositoryPort } from "@app/room/domain/port/room-repository.port";
import { MemberEntity, MemberRole } from "@app/room/domain/model/member";
import { Transactional } from "@core/database";

@CommandHandler(CreateRoomCommand)
export class CreateRoomHandler implements ICommandHandler<CreateRoomCommand, RoomEntity> {
  constructor(
    private readonly roomRepository: RoomRepositoryPort
  ) {}

  @Transactional()
  async execute(command: CreateRoomCommand): Promise<RoomEntity> {
    // Check if direct room already exists between users
    if (!command.title) {
      const sortedUserIds = [command.userId1, command.userId2].sort();
      const directKey = `${sortedUserIds[0]}-${sortedUserIds[1]}`;
      const existingRoom = await this.roomRepository.selectRoomFromDirectKey(directKey);
      if (existingRoom) {
        return existingRoom;
      }
    }

    // Create new room
    const room = command.title 
      ? RoomEntity.createGroupRoom(command.title)
      : RoomEntity.createDirectRoom(command.userId1, command.userId2);

    const savedRoom = await this.roomRepository.insertRoom(room);

    // Add members
    const member1 = MemberEntity.create(savedRoom.id, command.userId1, MemberRole.OWNER);
    const member2 = MemberEntity.create(savedRoom.id, command.userId2, MemberRole.MEMBER);

    await this.roomRepository.insertMembers(savedRoom.id, [member1, member2]);

    return savedRoom;
  }
}