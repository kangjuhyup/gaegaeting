import { GetUserQuery } from "../../port/in/query/get-user.port";
import { UserEntity } from "@app/user/domain/model/user";
import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { UserRepositoryPort } from "@app/user/domain/port/out/user-repository.port";

@QueryHandler(GetUserQuery)
export class GetUserHandler implements IQueryHandler<GetUserQuery, UserEntity> {
  constructor(private readonly userRepository: UserRepositoryPort) {}
  async execute(query: GetUserQuery): Promise<UserEntity> {
    const user = await this.userRepository.selectUserFromId(query.id);
    if (!user) {
      throw new Error("존재하지 않는 사용자입니다.");
    }
    return user;
  }
}
