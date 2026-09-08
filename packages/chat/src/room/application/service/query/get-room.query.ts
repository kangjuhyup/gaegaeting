import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { GetRoomQuery } from "../../port/query/get-room.port";
import { RoomEntity } from "@app/room/domain/model/room";
import { RoomRepositoryPort } from "@app/room/domain/port/room-repository.port";

@QueryHandler(GetRoomQuery)
export class GetRoomHandler implements IQueryHandler<GetRoomQuery, RoomEntity> {
  constructor(
    private readonly roomRepository: RoomRepositoryPort
  ) {}

  async execute(query: GetRoomQuery): Promise<RoomEntity> {
    const room = await this.roomRepository.selectRoomFromIdWithMembers(query.roomId);
    if (!room) {
      throw new Error("Room not found");
    }
    return room;
  }
}