import { FeedEntity } from "#app/feed/domain/model/feed";
import { type UserPrincipal } from "@core/auth";
import { Query } from "@nestjs/cqrs";

export class GetMyFeedQuery extends Query<FeedEntity[]> {

    constructor(
       public readonly user : UserPrincipal,
    ) {
        super()
    }
}