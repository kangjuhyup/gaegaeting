import { Query } from "@nestjs/cqrs";
import { UserPrincipal } from "@core/auth";

export class GetUserPrincipalQuery extends Query<UserPrincipal> {
    constructor(
        public readonly providerType : number,
        public readonly providerId : string
    ) {
        super()
    }
}   