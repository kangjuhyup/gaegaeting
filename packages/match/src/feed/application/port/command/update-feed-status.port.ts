import { FeedItemStatus } from "@app/feed/domain/enum/feed-item-status.enum";
import { FeedItemEntity } from "@app/feed/domain/model/feed-item";
import { UserPrincipal } from "@core/auth";
import { Command } from "@nestjs/cqrs";

export class UpdateFeedItemStatusCommand extends Command<FeedItemEntity> {

    constructor(
        public readonly user : UserPrincipal,
        public readonly id : number,
        public readonly status : FeedItemStatus
    ) {
        super()
    }
}