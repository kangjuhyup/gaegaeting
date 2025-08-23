import { FeedItemEntity } from "../model/feed-item";

export abstract class FeedItemRepositoryPort {
    
    abstract getFeedItemFromId(id:number) : Promise<FeedItemEntity>
    abstract updateFeedItem(feedItem:FeedItemEntity) : Promise<FeedItemEntity>
}