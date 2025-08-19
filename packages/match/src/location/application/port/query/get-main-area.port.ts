import { MainAreaEntity } from "@app/location/domain/model/main-area";
import { UserPrincipal } from "@core/auth";
import { Query } from "@nestjs/cqrs";

export class GetMainAreaQuery extends Query<MainAreaEntity> {

    constructor(
        public readonly user : UserPrincipal
    ) {
        super();
    }
}