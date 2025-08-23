import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { UpdateFeedItemStatusCommand } from "../../port/command/update-feed-status.port";
import { FeedRepositoryPort } from "@app/feed/domain/port/feed.repository.port";
import { FeedItemEntity } from "@app/feed/domain/model/feed-item";
import { FeedItemRepositoryPort } from "@app/feed/domain/port/feed-item.repository.port";
import { FeedItemStatus } from "@app/feed/domain/enum/feed-item-status.enum";
import { MessageRouter } from "../../service/message-router";
import { Topics } from "../../topic";

@CommandHandler(UpdateFeedItemStatusCommand)
export class UpdateFeedItemStatusHandler implements ICommandHandler<UpdateFeedItemStatusCommand, FeedItemEntity> {
    
    constructor(
        private readonly feedItemRepository : FeedItemRepositoryPort,
        private readonly messageRouter : MessageRouter
    ) {}
    
    async execute(command: UpdateFeedItemStatusCommand): Promise<FeedItemEntity> {
        const feedItem = await this.feedItemRepository.getFeedItemFromId(command.id)
        switch(command.status) {
            case FeedItemStatus.DELIVERY:
                feedItem.setDelivery()
                break;
            case FeedItemStatus.VIEW:
                feedItem.setView()
                break;
            case FeedItemStatus.LIKE:
                feedItem.setLike()
                await this.messageRouter.sendMessage(Topics.MATCH_FEED_LIKE_V1,feedItem)
                break;
            case FeedItemStatus.PASS:
                feedItem.setPass()
                break;
        }
        return await this.feedItemRepository.updateFeedItem(feedItem)
    }
}