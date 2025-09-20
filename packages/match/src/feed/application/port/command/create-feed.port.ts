import { FeedEntity } from "@app/feed/domain/model/feed";
import { UserPrincipal } from "@core/auth";
import { Command } from "@nestjs/cqrs";

export class CreateFeedCommand extends Command<FeedEntity> {

    constructor(
       public readonly user : UserPrincipal 
    ) {
        super()
    }
}