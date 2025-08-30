import { RoomEntity } from "@app/room/domain/model/room";
import { Query } from "@nestjs/cqrs";

export class GetRoomByPairQuery extends Query<RoomEntity> {
  constructor(public readonly pairId: number) {
    super();
  }
}