import { AccountUserPhoneVerifiedV1Payload } from "@app/common/payload";
import { Topics } from "@app/common/topic";
import { UpdateUserCommand } from "@app/user/application/port/command/update-user-profile.port";
import { CommandBus, EventsHandler } from "@nestjs/cqrs";
import { OnEvent } from "@nestjs/event-emitter";

@EventsHandler()
export class PariEventHandler {
    constructor(
        private readonly commandBus : CommandBus
    ) {}

    @OnEvent(Topics.ACCOUNT_USER_PHONE_VERIFIED_V1)
    async handleMatchPairCreatedEvent(payload : AccountUserPhoneVerifiedV1Payload) {
        await this.commandBus.execute(new UpdateUserCommand(payload.userId, { phoneNumber : payload.phoneNumber }))
    }
}