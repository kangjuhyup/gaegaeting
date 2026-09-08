import { RoomEntity } from "@app/room/domain/model/room";
import { Query } from "@nestjs/cqrs";

export class GetUserRoomsQuery extends Query<RoomEntity[]> {
  constructor(public readonly userId: string) {
    super();
  }
}