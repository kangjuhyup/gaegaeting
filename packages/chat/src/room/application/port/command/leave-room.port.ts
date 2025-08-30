import { Command } from "@nestjs/cqrs";

export class LeaveRoomCommand extends Command<void> {
  constructor(
    public readonly roomId: number,
    public readonly userId: string
  ) {
    super();
  }
}