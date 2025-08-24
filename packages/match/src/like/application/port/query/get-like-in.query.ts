import { LikeEntity } from "@app/like/domain/model/like";
import { Query } from "@nestjs/cqrs";
import { UserPrincipal } from "@core/auth";

export class GetLikeInQuery extends Query<LikeEntity[]> {
    constructor(
        public readonly user : UserPrincipal
    ) {
        super()
    }
}