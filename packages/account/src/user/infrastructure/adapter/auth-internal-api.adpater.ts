import { AuthInternalApiPort } from "@app/user/domain/port/auth-internal-api.port";
import { AuthProviderPrincipal } from "@core/auth";
import { Injectable } from "@nestjs/common";
import { AuthOrmRepository } from '../../../auth/infrastructure/repository/auth.repository';

@Injectable()
export class AuthInternalApiAdapter implements AuthInternalApiPort {

    constructor(
        //TODO: 추후에 서비스가 분리되었을 때 API 클라이언트로 변경
        private readonly authOrmRepository : AuthOrmRepository
    ){}

    async setUserId(providerType:number,providerId:string, userId: string): Promise<void> {
        await this.authOrmRepository.updateUserId(providerType,providerId, userId);
    }
}