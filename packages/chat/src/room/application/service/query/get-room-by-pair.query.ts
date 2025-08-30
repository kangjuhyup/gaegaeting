import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { GetRoomByPairQuery } from "../../port/query/get-room-by-pair.port";
import { RoomEntity } from "@app/room/domain/model/room";
import { RoomRepositoryPort } from "@app/room/domain/port/room-repository.port";

@QueryHandler(GetRoomByPairQuery)
export class GetRoomByPairHandler implements IQueryHandler<GetRoomByPairQuery, RoomEntity> {
  constructor(
    private readonly roomRepository: RoomRepositoryPort
  ) {}

  async execute(query: GetRoomByPairQuery): Promise<RoomEntity> {
    const room = await this.roomRepository.selectRoomFromPairId(query.pairId);
    if (!room) {
      throw new Error("Room not found for this pair");
    }
    return room;
  }
}