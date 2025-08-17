import { Query } from "@nestjs/cqrs";

export class SocialRedirectQuery extends Query<string> {
    constructor(
        public readonly providerType : number,
        public readonly redirectUrl : string
    ) {
        super()
    }
}   