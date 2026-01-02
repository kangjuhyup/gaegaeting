import { YYYYMMDD } from "@core/util";
import { FeedEntity } from "../model/feed";

export abstract class FeedRepositoryPort {

    abstract getMyFeedWithItems(userId:string,date:YYYYMMDD) : Promise<FeedEntity[]>

    abstract saveFeed(feed:FeedEntity) : Promise<FeedEntity>

}