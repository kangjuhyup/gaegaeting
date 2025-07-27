import { UserEntity } from "@app/domain/model/user";
import { Query } from "@nestjs/cqrs";

export class GetUserQuery extends Query<UserEntity> {
  constructor(public readonly id: string) {
    super();
  }
}
