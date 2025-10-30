import { Injectable } from '@nestjs/common';
import { KakaoIdpPort } from '../port/kakao-idp.port';
import { AppleIdpPort } from '../port/apple-idp.port';
import { UserRepositoryPort } from '../port/user-repository.port';
import { TokenServicePort } from '../port/token-service.port';

export interface KakaoSigninCommand {
  tenantId: string;
  authCode: string;
  redirectUri?: string;
}

export interface AppleSigninCommand {
  tenantId: string;
  idToken: string;
  authorizationCode?: string;
  userPayload?: string;
}

@Injectable()
export class SocialSigninUseCase {
  constructor(
    private readonly kakaoIdp: KakaoIdpPort,
    private readonly appleIdp: AppleIdpPort,
    private readonly users: UserRepositoryPort,
    private readonly tokens: TokenServicePort,
  ) {}

  async signinWithKakao(cmd: KakaoSigninCommand) {
    const token = await this.kakaoIdp.exchangeAuthCode(cmd.tenantId, cmd.authCode, cmd.redirectUri);
    const profile = await this.kakaoIdp.getProfile(token.accessToken);

    const { user, isNew } = await this.users.findOrProvisionByIdentity({
      tenantId: cmd.tenantId,
      provider: 'kakao',
      providerSub: profile.id,
      email: profile.email,
      usernameFallback: profile.nickname ?? `kakao_${profile.id}`,
      profileJson: profile.raw,
    });

    const payload = await this.tokens.issueForUser({ tenantId: cmd.tenantId, userId: user.id });
    return payload;
  }

  async signinWithApple(cmd: AppleSigninCommand) {
    const claims = await this.appleIdp.verifyIdToken(cmd.idToken);

    const { user } = await this.users.findOrProvisionByIdentity({
      tenantId: cmd.tenantId,
      provider: 'apple',
      providerSub: claims.sub,
      email: claims.email,
      usernameFallback: `apple_${claims.sub}`,
      profileJson: claims,
    });

    const payload = await this.tokens.issueForUser({ tenantId: cmd.tenantId, userId: user.id });
    return payload;
  }
}


