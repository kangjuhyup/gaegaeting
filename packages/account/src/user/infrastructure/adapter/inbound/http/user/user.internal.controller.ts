import { CheckRegisteredUserQuery } from "@app/user/application/port/query/check-registered.user.port";
import { Controller, Get, Param } from "@nestjs/common";
import { QueryBus } from "@nestjs/cqrs";
import { ApiTags } from "@nestjs/swagger";

@ApiTags('Account','User','Internal')
@Controller('internal/users/')
export class InternalUserController {

    constructor(
        private readonly queryBus : QueryBus
    ) {}

    @Get('registed/:providerType/:providerId')
    async getRegisted(
        @Param() providerType : string,
        @Param() providerId : string
    ) {
        return await this.queryBus.execute(new CheckRegisteredUserQuery(Number(providerType),providerId))
    }
}