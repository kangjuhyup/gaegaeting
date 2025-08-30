import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { GetUserRoomsQuery } from "../../port/query/get-user-rooms.port";
import { RoomEntity } from "@app/room/domain/model/room";
import { RoomRepositoryPort } from "@app/room/domain/port/room-repository.port";

@QueryHandler(GetUserRoomsQuery)
export class GetUserRoomsHandler implements IQueryHandler<GetUserRoomsQuery, RoomEntity[]> {
  constructor(
    private readonly roomRepository: RoomRepositoryPort
  ) {}

  async execute(query: GetUserRoomsQuery): Promise<RoomEntity[]> {
    return await this.roomRepository.selectRoomsFromUserId(query.userId);
  }
}