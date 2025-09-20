import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { GetUserPrincipalQuery } from "../../port/query/get-user-principal.port";
import { UserPrincipal } from "@core/auth";
import { AuthRepositoryPort } from "@app/auth/domain/port/auth-repository.port";
import { NotFoundException } from "@nestjs/common";

@QueryHandler(GetUserPrincipalQuery)
export class GetUserPrincipalHandler implements IQueryHandler<GetUserPrincipalQuery,UserPrincipal> {
    
    constructor(
        private readonly authRepository : AuthRepositoryPort
    ) {}
    
    async execute(query: GetUserPrincipalQuery): Promise<UserPrincipal> {
        const principal = await this.authRepository.findUserByAuthProvider(query.providerType, query.providerId);
        if(!principal) throw new NotFoundException('해당 프로바이더에 맞는 유저를 찾을 수 없습니다.')
        return principal;
    }
}