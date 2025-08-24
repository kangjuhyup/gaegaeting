import { MatchPairCreatedV1Payload } from "@app/common/payload";
import { Topics } from "@app/common/topic";
import { SavePairCommand } from "@app/pair/applicatoin/port/command/save-pair.port";
import { CommandBus, EventsHandler, QueryBus } from "@nestjs/cqrs";
import { OnEvent } from "@nestjs/event-emitter";

@EventsHandler()
export class PariEventHandler {
    constructor(
        private readonly commandBus : CommandBus
    ) {}

    @OnEvent(Topics.MATCH_PAIR_CREATED_V1)
    async handleMatchPairCreatedEvent(payload : MatchPairCreatedV1Payload) {
        await this.commandBus.execute(new SavePairCommand(payload.leftUserId, payload.rightUserId, payload.likeAId, payload.likeBId))
    }
}