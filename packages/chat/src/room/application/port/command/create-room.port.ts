import { Command } from "@nestjs/cqrs";
import { RoomEntity } from "../../../domain/model/room";

export class CreateRoomCommand extends Command<RoomEntity> {
  constructor(
    public readonly userId1: string,
    public readonly userId2: string,
    public readonly title?: string
  ) {
    super();
  }
}
