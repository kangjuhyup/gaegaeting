import { Query } from "@nestjs/cqrs";
import { AuthProvider, UserPrincipal } from "@core/auth";

export class GetUserPrincipalQuery extends Query<UserPrincipal> {
    constructor(
        public readonly providerType : AuthProvider,
        public readonly providerId : string
    ) {
        super()
    }
}   