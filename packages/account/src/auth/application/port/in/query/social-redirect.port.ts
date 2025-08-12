import { AuthProvider } from "@auth/domain/model/type/auth-provider.type";
import { Query } from "@nestjs/cqrs";

export class SocialRedirectQuery extends Query<string> {
    constructor(
        public readonly provider : AuthProvider,
        public readonly redirectUrl : string
    ) {
        super()
    }
}   