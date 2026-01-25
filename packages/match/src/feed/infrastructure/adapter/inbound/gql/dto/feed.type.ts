import { FeedEntity } from '@app/feed/domain/model/feed';
import { Field, ObjectType } from "@nestjs/graphql";
import { FeedItem } from "./feed-item.type";

@ObjectType()
export class Feed {
    @Field(() => String)
    id: string;

    @Field(() => String)
    date: string;

    @Field(() => String)
    slot: string;

    @Field(() => [FeedItem])
    items: FeedItem[];

    static fromDomain(feed: FeedEntity): Feed {
        return {
            id: String(feed.id),
            date: feed.date.toString(),
            slot: String(feed.slot),
            items: (feed.items ?? []).map(FeedItem.fromDomain),
        };
    }

    static fromDomains(feeds: FeedEntity[]): Feed[] {
        return feeds.map(Feed.fromDomain);
    }
}