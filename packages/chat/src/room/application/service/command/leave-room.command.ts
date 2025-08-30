import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { LeaveRoomCommand } from "../../port/command/leave-room.port";
import { RoomRepositoryPort } from "@app/room/domain/port/room-repository.port";

@CommandHandler(LeaveRoomCommand)
export class LeaveRoomHandler implements ICommandHandler<LeaveRoomCommand, void> {
  constructor(
    private readonly roomRepository: RoomRepositoryPort
  ) {}

  async execute(command: LeaveRoomCommand): Promise<void> {
    const member = await this.roomRepository.selectMemberFromRoomAndUser(command.roomId, command.userId);
    if (!member || !member.isActive()) {
      throw new Error("Member not found or already left");
    }

    const leftMember = member.leave();
    await this.roomRepository.updateMember(leftMember);
  }
}