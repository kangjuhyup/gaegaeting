import { ConfigService } from '@nestjs/config';
import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { SocialRedirectQuery } from "@app/auth/application/port/in/query/social-redirect.port";
import { SocialRedirectStrategy, KakaoRedirectStrategy, NaverRedirectStrategy, GoogleRedirectStrategy } from '../redirect-strategy';
import { AuthProvider } from '@core/auth';

@QueryHandler(SocialRedirectQuery)
export class SocialRedirectHandler implements IQueryHandler<SocialRedirectQuery, string> {
  private readonly strategies: Map<AuthProvider, SocialRedirectStrategy>;
  
  constructor(private readonly configService: ConfigService) {
    this.strategies = new Map<AuthProvider, SocialRedirectStrategy>();
    this.strategies.set(AuthProvider.KAKAO, new KakaoRedirectStrategy(configService));
    this.strategies.set(AuthProvider.NAVER, new NaverRedirectStrategy(configService));
    this.strategies.set(AuthProvider.GOOGLE, new GoogleRedirectStrategy(configService));
  }

  async execute(query: SocialRedirectQuery): Promise<string> {
    const { provider, redirectUrl } = query;
    
    const strategy = this.strategies.get(provider);
    if (!strategy) {
      throw new Error(`지원하지 않는 인증 제공자입니다: ${provider}`);
    }
    
    return strategy.generateAuthUrl(redirectUrl);
  }
}