import { Module, Provider } from "@nestjs/common";
import { SocialLoginHandler } from "./service/command/social-login.command";
import { SocialRedirectHandler } from "./service/query/social-redirect.query";
import { AuthInfraStructureModule } from "../infrastructure/infrastructure.module";

const providers : Provider[] = [
     // 쿼리 핸들러
     SocialRedirectHandler,
     SocialLoginHandler,
     SocialRedirectHandler,   
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