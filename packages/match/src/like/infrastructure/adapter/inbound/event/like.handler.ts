import { MatchFeedLikeV1Payload } from "@app/common/payload";
import { Topics } from "@app/common/topic";
import { SaveLikeCommand } from "@app/like/application/port/command/save-like.port";
import { CommandBus, EventsHandler, QueryBus } from "@nestjs/cqrs";
import { OnEvent } from "@nestjs/event-emitter";

@EventsHandler()
export class LikeEventHandler {

    constructor(
        private readonly queryBus : QueryBus,
        private readonly commandBus : CommandBus
    ) {}

    @OnEvent(Topics.MATCH_FEED_LIKE_V1)
    async handleMatchFeedLike(event : MatchFeedLikeV1Payload) {
        await this.commandBus.execute(new SaveLikeCommand(event.likerId,event.likeeId,0))
    }
}
    