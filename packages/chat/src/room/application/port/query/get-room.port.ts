import { RoomEntity } from "@app/room/domain/model/room";
import { Query } from "@nestjs/cqrs";

export class GetRoomQuery extends Query<RoomEntity> {
  constructor(public readonly roomId: number) {
    super();
  }
}