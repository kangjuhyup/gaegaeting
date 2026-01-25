import { FeedItemStatus } from "@app/feed/domain/enum/feed-item-status.enum";
import { Field, Float, InputType } from "@nestjs/graphql";
import { IsIn, IsNumber, IsString } from "class-validator";

@InputType()
export class ActionFeedInput {
    @Field(() => Float)
    @IsNumber()
    id: number;

    @Field(() => String)
    @IsString()
    @IsIn(FeedItemStatus.labels())
    state: string;

    toStatus(): FeedItemStatus {
        return FeedItemStatus.fromLabel(this.state);
    }
}