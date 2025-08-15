import { UserPrincipal } from "@app/type";
import { Injectable } from "@nestjs/common";

@Injectable()
export class UserService {

    constructor(
        private readonly userServiceHost : string
    ) {}

    async getUserFromProvider(providerType : string, providerId : string) : Promise<UserPrincipal> {
        const response = await fetch(`${this.userServiceHost}/auth/principal/${providerType}/${providerId}`).catch(err => {
            throw err;
        });
        // HTTP 에러 상태 확인 (200-299 범위가 아니면 에러)
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: '알 수 없는 오류' }));
            //TODO: AuthService 통신에러로 변경해야함.
            throw new Error(`HTTP 에러 ${response.status}: ${errorData.message || JSON.stringify(errorData)}`);
        }
        
        const data = await response.json() as UserPrincipal;
        return data;
    }
}