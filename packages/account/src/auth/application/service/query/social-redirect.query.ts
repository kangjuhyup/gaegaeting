import { ConfigService } from '@nestjs/config';
import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { SocialRedirectQuery } from "@app/auth/application/port/query/social-redirect.port";
import { SocialRedirectStrategy, KakaoRedirectStrategy, NaverRedirectStrategy, GoogleRedirectStrategy } from '../redirect-strategy';
import { AuthProvider } from '@core/auth';

@QueryHandler(SocialRedirectQuery)
export class SocialRedirectHandler implements IQueryHandler<SocialRedirectQuery, string> {
  private readonly strategies: Map<number, SocialRedirectStrategy>;
  
  constructor(private readonly configService: ConfigService) {
    this.strategies = new Map<number, SocialRedirectStrategy>();
    this.strategies.set(AuthProvider.KAKAO.value, new KakaoRedirectStrategy(configService));
    this.strategies.set(AuthProvider.NAVER.value, new NaverRedirectStrategy(configService));
    this.strategies.set(AuthProvider.GOOGLE.value, new GoogleRedirectStrategy(configService));
  }

  async execute(query: SocialRedirectQuery): Promise<string> {
    const { providerType, redirectUrl } = query;
    
    const strategy = this.strategies.get(providerType);
    if (!strategy) {
      throw new Error(`지원하지 않는 인증 제공자입니다: ${providerType}`);
    }
    
    return strategy.generateAuthUrl(redirectUrl);
  }
}