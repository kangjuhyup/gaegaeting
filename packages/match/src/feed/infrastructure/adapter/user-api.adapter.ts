import { ENV_KEY } from "@app/config/env.config";
import { User } from "@app/feed/domain/model/vo/user";
import { UserApiPort } from "@app/feed/domain/port/user-api.port";
import { FetchHttpClient } from "@core/http";
import { Injectable } from "@nestjs/common";

@Injectable()
export class UserApiAdapter implements UserApiPort {
    constructor(
        private readonly fetchClient : FetchHttpClient
    ) {}

    async getUser(userId:string) : Promise<User> {
        const response = await this.fetchClient.get<{
            id: string,
            nickname: string,
            gender: string,
            region: string,
            bio: string,
            phoneNumber: string,
            profileImages? : string[],
        }>(`${ENV_KEY.USER_SERVICE_HOST}/users/${userId}`);
        return new User(
            response.data.id,
            response.data.nickname,
            response.data.profileImages ? response.data.profileImages[0] : undefined 
        )
    }
}