import { ItemProcessor } from "@app/batch/interface/processor";
import { FeedEntity } from "@app/feed/domain/model/feed";

export class FeedExpiredProcessor implements ItemProcessor<FeedEntity, FeedEntity> {
    async process(item: FeedEntity): Promise<FeedEntity | null> {
        return item;
    }
}