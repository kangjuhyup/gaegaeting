import { FeedItemStatus } from '@app/feed/domain/enum/feed-item-status.enum';
import { FeedItemEntity } from '@app/feed/domain/model/feed-item';
import { Field, ObjectType } from '@nestjs/graphql';

function toIsoOrEmpty(date?: Date | null): string {
  return date ? date.toISOString() : '';
}

@ObjectType()
export class FeedItem {
    @Field(() => String)
    id: string;

    @Field(() => String)
    targetUserId: string;

    @Field(() => String)
    state: string;

    @Field(() => String)
    showAt: string;

    @Field(() => String)
    actionAt: string;

    static fromDomain(item: FeedItemEntity): FeedItem {
        return {
            id: String(item.id),
            targetUserId: item.targetUserId,
            state: FeedItemStatus.from(item.state).label,
            showAt: toIsoOrEmpty(item.showAt),
            actionAt: toIsoOrEmpty(item.actionAt),
        };
    }
}