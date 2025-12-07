import { Injectable } from '@nestjs/common';
import { KakaoIdpPort } from '../../port/api/kakao-idp.port';
import { AppleIdpPort } from '../../port/api/apple-idp.port';
import { TokenServicePort } from '../../port/token-service.port';
import { UserServicePort } from '../../port/user-service.port';
import { SocialSigninUseCase, KakaoSigninCommand, AppleSigninCommand, NativeSigninCommand, AuthPayload } from '../social-signin.usecase';

@Injectable()
export class SocialSigninUseCaseImpl implements SocialSigninUseCase {
  constructor(
    private readonly kakaoIdp: KakaoIdpPort,
    private readonly appleIdp: AppleIdpPort,
    private readonly userService: UserServicePort,
    private readonly tokens: TokenServicePort,
  ) {}

  async signinWithKakao(cmd: KakaoSigninCommand): Promise<AuthPayload> {
    const token = await this.kakaoIdp.exchangeAuthCode(cmd.authCode, cmd.redirectUri);
    const profile = await this.kakaoIdp.getProfile(token.accessToken);

    // 사용자 생성 또는 조회 (Service에서 처리)
    const user = await this.userService.createUserFromSocialProfile({
      tenantId: cmd.tenantId,
      provider: 'kakao',
      providerSub: profile.id,
      username: profile.nickname,
      email: profile.email,
      profileJson: profile.raw,
    });

    // 사용자의 역할과 권한 조회
    const { roles, permissions } = await this.userService.getUserRolesAndPermissions(user.id);

    const payload = await this.tokens.issueForUser({ 
      tenantId: cmd.tenantId, 
      userId: user.id,
      roles,
      permissions,
    });
    return payload;
  }

  async signinWithApple(cmd: AppleSigninCommand): Promise<AuthPayload> {
    const claims = await this.appleIdp.verifyIdToken(cmd.idToken);

    // 사용자 생성 또는 조회 (Service에서 처리)
    const user = await this.userService.createUserFromSocialProfile({
      tenantId: cmd.tenantId,
      provider: 'apple',
      providerSub: claims.sub,
      username: `apple_${claims.sub}`,
      email: claims.email,
      profileJson: claims,
    });

    // 사용자의 역할과 권한 조회
    const { roles, permissions } = await this.userService.getUserRolesAndPermissions(user.id);

    const payload = await this.tokens.issueForUser({ 
      tenantId: cmd.tenantId, 
      userId: user.id,
      roles,
      permissions,
    });
    return payload;
  }

  async signinWithNativeToken(cmd: NativeSigninCommand): Promise<AuthPayload> {
    let user;

    if (cmd.provider === 'kakao') {
      // 카카오 프로필 조회
      const profile = await this.kakaoIdp.getProfile(cmd.accessToken);

      // 사용자 생성 또는 조회 (Service에서 처리)
      user = await this.userService.createUserFromSocialProfile({
        tenantId: cmd.tenantId,
        provider: 'kakao',
        providerSub: profile.id,
        username: profile.nickname,
        email: profile.email,
        profileJson: profile.raw,
      });
    } else if (cmd.provider === 'apple') {
      // Apple의 경우 accessToken이 idToken일 수 있음
      // 또는 별도의 프로필 조회 API가 필요할 수 있음
      // 현재는 기본 구현만 제공
      throw new Error('Apple native signin not yet implemented');
    } else {
      throw new Error(`Unsupported provider: ${cmd.provider}`);
    }

    // 사용자의 역할과 권한 조회
    const { roles, permissions } = await this.userService.getUserRolesAndPermissions(user.id);

    const payload = await this.tokens.issueForUser({ 
      tenantId: cmd.tenantId, 
      userId: user.id,
      roles,
      permissions,
    });
    return payload;
  }

}

