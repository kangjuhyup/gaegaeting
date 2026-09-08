import { FeedItemEntity } from "../model/feed-item.js";

export abstract class FeedItemRepositoryPort {
    
    abstract getFeedItemFromId(id:number) : Promise<FeedItemEntity>
    abstract updateFeedItem(feedItem:FeedItemEntity) : Promise<FeedItemEntity>
    abstract saveFeedItem(feedItem:FeedItemEntity) : Promise<FeedItemEntity>
}