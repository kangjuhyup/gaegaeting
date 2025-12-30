import { CreateFeedCommand } from "@app/feed/application/port/command/create-feed.port";
import { GetMyFeedQuery } from "@app/feed/application/port/query/get-my-feed.port";
import { GraphqlAccessGuard, UserParam, UserPrincipal } from "@core/auth";
import { UseGuards } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { Feed } from "./dto/feed.type";
import { ActionFeedInput } from "./dto/action-feed.input";
import { UpdateFeedItemStatusCommand } from "@app/feed/application/port/command/update-feed-status.port";
import { FeedItemStatus } from "@app/feed/domain/enum/feed-item-status.enum";

@Resolver()
@UseGuards(GraphqlAccessGuard)
export class FeedResolver {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Query(() => [Feed])
    async getDailyFeed(
        @UserParam() user: UserPrincipal,
    ) {
        const feeds = await this.queryBus.execute(new GetMyFeedQuery(user));
        return Feed.fromDomains(feeds);
    }
    

    // TODO: DailyFeed 외 조건형 피드 목록 조회

    @Mutation(() => Boolean)
    async createDailyFeed(
        @UserParam() user: UserPrincipal,
    ) {
        await this.commandBus.execute(new CreateFeedCommand(user));
        return true;
    }

    // TODO: DailyFeed 외 조건형 피드 생성

    @Mutation(() => Boolean)
    async actionFeed(
        @UserParam() user: UserPrincipal,
        @Args('input') input: ActionFeedInput,
    ) {
        await this.commandBus.execute(
            new UpdateFeedItemStatusCommand(user, input.id, input.toStatus()),
        )
        return true;
    }
}
