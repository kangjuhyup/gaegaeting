import { LocationEntity } from "@app/location/domain/model/location";
import { UserPrincipal } from "@core/auth";
import { Command } from "@nestjs/cqrs";

export class SetLocationCommand extends Command<LocationEntity> {

    constructor(
        public readonly user : UserPrincipal,
        public readonly location : LocationEntity
    ) {
        super();
    }
}