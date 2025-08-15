import { AuthProvider } from "@core/auth";
import { Query } from "@nestjs/cqrs";

export class SocialRedirectQuery extends Query<string> {
    constructor(
        public readonly provider : AuthProvider,
        public readonly redirectUrl : string
    ) {
        super()
    }
}   