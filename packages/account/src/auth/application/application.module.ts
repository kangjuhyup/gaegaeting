import { Module, Provider } from "@nestjs/common";
import { SocialLoginHandler } from "./service/command/social-login.command";
import { SocialRedirectHandler } from "./service/query/social-redirect.query";
import { AuthInfraStructureModule } from "../infrastructure/infrastructure.module";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";

const providers : Provider[] = [
     // 쿼리 핸들러
     SocialRedirectHandler,
     SocialLoginHandler,
     SocialRedirectHandler,   
]

@Module({
  imports : [
    AuthInfraStructureModule,
    // JWT
    JwtModule.registerAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          secret: configService.get<string>('JWT_SECRET', 'secret_key_for_development'),
          signOptions: {
            expiresIn: '1h', // 기본 만료 시간: 1시간
          },
        }),
      }),   
  ],
  providers : providers,
  exports : providers
})
export class AuthApplicationModule {
    
}