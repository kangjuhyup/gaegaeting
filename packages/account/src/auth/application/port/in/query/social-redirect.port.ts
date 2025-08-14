import { AuthProvider } from "@core/database";
import { Query } from "@nestjs/cqrs";

export class SocialRedirectQuery extends Query<string> {
    constructor(
        public readonly provider : AuthProvider,
        public readonly redirectUrl : string
    ) {
        super()
    }
}   