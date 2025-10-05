import { UserRegistered } from "@app/user/domain/model/vo/user-reisgetered";
import { Query } from "@nestjs/cqrs";

export class CheckRegisteredUserQuery extends Query<UserRegistered> {

    constructor(
        public readonly providerType : number,
        public readonly providerId : string
    ){
        super()
    }
}