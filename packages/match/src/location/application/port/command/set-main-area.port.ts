import { MainAreaEntity } from "@app/location/domain/model/main-area";
import { UserPrincipal } from "@core/auth";
import { MainAreaCode } from "@core/database";
import { Command } from "@nestjs/cqrs";

export class SetMainAreaCommand extends Command<MainAreaEntity> {

    constructor(
        public readonly user : UserPrincipal,
        public readonly code : MainAreaCode
    ) {
        super();
    }
}