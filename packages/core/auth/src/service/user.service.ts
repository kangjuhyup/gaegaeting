import { UserPrincipal } from "@app/type";
import { Injectable } from "@nestjs/common";

@Injectable()
export class UserService {

    constructor(
        private readonly userServiceHost : string
    ) {}

    async getUserFromProvider(providerType : string, providerId : string) : Promise<UserPrincipal> {
        const response = await fetch(`${this.userServiceHost}/auth/principal/${providerType}/${providerId}`);
        const data = await response.json() as UserPrincipal;
        return data;
    }
}