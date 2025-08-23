import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { UpdateFeedItemStatusCommand } from "../../port/command/update-feed-status.port";
import { FeedRepositoryPort } from "@app/feed/domain/port/feed.repository.port";
import { FeedItemEntity } from "@app/feed/domain/model/feed-item";
import { FeedItemRepositoryPort } from "@app/feed/domain/port/feed-item.repository.port";
import { FeedItemStatus } from "@app/feed/domain/enum/feed-item-status.enum";

@CommandHandler(UpdateFeedItemStatusCommand)
export class UpdateFeedItemStatusHandler implements ICommandHandler<UpdateFeedItemStatusCommand, FeedItemEntity> {
    
    constructor(
        private readonly feedItemRepository : FeedItemRepositoryPort
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
                break;
            case FeedItemStatus.PASS:
                feedItem.setPass()
                break;
        }
        return this.feedItemRepository.updateFeedItem(feedItem)
    }
}