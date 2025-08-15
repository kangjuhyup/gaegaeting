import { UserPrincipal } from "@core/auth";

export class GetUserPrincipalResponse implements UserPrincipal {
    
    constructor(
        public readonly userId : string,
        public readonly nickname : string,
        public readonly birth : string,
        public readonly region : string,
    ) {}

    static from(
        userPrincipal : UserPrincipal
    ) {
        return new GetUserPrincipalResponse(
            userPrincipal.userId,
            userPrincipal.nickname,
            userPrincipal.birth,
            userPrincipal.region,
        )
    }
}