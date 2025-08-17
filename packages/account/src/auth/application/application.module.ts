import { Module, Provider } from "@nestjs/common";
import { SocialLoginHandler } from "./service/command/social-login.command";
import { SocialRedirectHandler } from "./service/query/social-redirect.query";
import { AuthInfraStructureModule } from "../infrastructure/infrastructure.module";
import { GetUserPrincipalHandler } from "./service/query/get-user-principal.query";
import { AuthTokenService } from "./service/auth-token.service";
import { SocialLoginByTokenHandler } from "./service/command/social-login-by-token.command";

const providers : Provider[] = [
     // Query
     SocialRedirectHandler,
     SocialRedirectHandler,   
     GetUserPrincipalHandler,

     // Command
     SocialLoginHandler,
     SocialLoginByTokenHandler,
     
     // Service
     AuthTokenService,
]

@Module({
  imports : [
    AuthInfraStructureModule,
  ],
  providers : providers,
  exports : providers
})
export class AuthApplicationModule {
    
}