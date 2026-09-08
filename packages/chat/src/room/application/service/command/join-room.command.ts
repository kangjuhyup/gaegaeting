import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { JoinRoomCommand } from "../../port/command/join-room.port";
import { RoomRepositoryPort } from "@app/room/domain/port/room-repository.port";
import { MemberEntity } from "@app/room/domain/model/member";
import { Transactional } from "@core/database";

@CommandHandler(JoinRoomCommand)
export class JoinRoomHandler implements ICommandHandler<JoinRoomCommand, void> {
  constructor(
    private readonly roomRepository: RoomRepositoryPort
  ) {}

  @Transactional()
  async execute(command: JoinRoomCommand): Promise<void> {
    const room = await this.roomRepository.selectRoomFromId(command.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    // Check if user is already a member
    const existingMember = await this.roomRepository.selectMemberFromRoomAndUser(command.roomId, command.userId);
    if (existingMember && existingMember.isActive()) {
      return; // Already a member
    }

    const member = MemberEntity.create(command.roomId, command.userId);
    await this.roomRepository.insertMembers(command.roomId, [member]);
  }
}