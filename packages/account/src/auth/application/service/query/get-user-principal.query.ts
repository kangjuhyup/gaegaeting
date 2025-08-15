import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { GetUserPrincipalQuery } from "../../port/in/query/get-user-princial.port";
import { UserPrincipal } from "@core/auth";
import { AuthRepositoryPort } from "@app/auth/domain/port/out/auth-repository.port";

@QueryHandler(GetUserPrincipalQuery)
export class GetUserPrincipalHandler implements IQueryHandler<GetUserPrincipalQuery,UserPrincipal> {
    
    constructor(
        private readonly authRepository : AuthRepositoryPort
    ) {}
    
    execute(query: GetUserPrincipalQuery): Promise<UserPrincipal> {
        return this.authRepository.findUserByAuthProvider(query.providerType, query.providerId);
    }
}