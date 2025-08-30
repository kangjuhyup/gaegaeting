import { RoomEntity } from "@app/room/domain/model/room";
import { Command } from "@nestjs/cqrs";

export class CreateRoomCommand extends Command<RoomEntity> {
  constructor(
    public readonly userId1: string,
    public readonly userId2: string,
    public readonly title?: string
  ) {
    super();
  }
}