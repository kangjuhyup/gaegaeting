import { Injectable } from '@nestjs/common';
import { KakaoIdpPort } from '../../port/kakao-idp.port';
import { AppleIdpPort } from '../../port/apple-idp.port';
import { TokenServicePort } from '../../port/token-service.port';
import { UserRepositoryPort } from '../../../domain/port/user-repository.port';
import { UserIdentityRepositoryPort } from '../../../domain/port/user-identity-repository.port';
import { User } from '../../../domain/model/user';
import { ulid } from 'ulid';
import { SocialSigninUseCase, KakaoSigninCommand, AppleSigninCommand, NativeSigninCommand, AuthPayload } from '../social-signin.usecase';

@Injectable()
export class SocialSigninUseCaseImpl implements SocialSigninUseCase {
  constructor(
    private readonly kakaoIdp: KakaoIdpPort,
    private readonly appleIdp: AppleIdpPort,
    private readonly users: UserRepositoryPort,
    private readonly identities: UserIdentityRepositoryPort,
    private readonly tokens: TokenServicePort,
  ) {}

  async signinWithKakao(cmd: KakaoSigninCommand): Promise<AuthPayload> {
    const token = await this.kakaoIdp.exchangeAuthCode(cmd.authCode, cmd.redirectUri);
    const profile = await this.kakaoIdp.getProfile(token.accessToken);

    // 1. 기존 사용자 조회
    let user = await this.users.findByIdentity(cmd.tenantId, 'kakao', profile.id);
    
    // 2. 없으면 새로 생성
    if (!user) {
      user = User.create({
        id: ulid(),
        tenantId: cmd.tenantId,
        username: profile.nickname ?? `kakao_${profile.id}`,
        email: profile.email,
      });
      user = await this.users.create(user);

      // 3. Identity 생성
      await this.identities.create({
        tenantId: cmd.tenantId,
        userId: user.id,
        provider: 'kakao',
        providerSub: profile.id,
        email: profile.email,
        profileJson: profile.raw,
      });
    }

    const payload = await this.tokens.issueForUser({ tenantId: cmd.tenantId, userId: user.id });
    return payload;
  }

  async signinWithApple(cmd: AppleSigninCommand): Promise<AuthPayload> {
    const claims = await this.appleIdp.verifyIdToken(cmd.idToken);

    // 1. 기존 사용자 조회
    let user = await this.users.findByIdentity(cmd.tenantId, 'apple', claims.sub);
    
    // 2. 없으면 새로 생성
    if (!user) {
      user = User.create({
        id: ulid(),
        tenantId: cmd.tenantId,
        username: `apple_${claims.sub}`,
        email: claims.email,
      });
      user = await this.users.create(user);

      // 3. Identity 생성
      await this.identities.create({
        tenantId: cmd.tenantId,
        userId: user.id,
        provider: 'apple',
        providerSub: claims.sub,
        email: claims.email,
        profileJson: claims,
      });
    }

    const payload = await this.tokens.issueForUser({ tenantId: cmd.tenantId, userId: user.id });
    return payload;
  }

  async signinWithNativeToken(cmd: NativeSigninCommand): Promise<AuthPayload> {
    let user;

    if (cmd.provider === 'kakao') {
      // 카카오 프로필 조회
      const profile = await this.kakaoIdp.getProfile(cmd.accessToken);

      // 1. 기존 사용자 조회
      user = await this.users.findByIdentity(cmd.tenantId, 'kakao', profile.id);
      
      // 2. 없으면 새로 생성
      if (!user) {
        user = User.create({
          id: ulid(),
          tenantId: cmd.tenantId,
          username: profile.nickname ?? `kakao_${profile.id}`,
          email: profile.email,
        });
        user = await this.users.create(user);

        // 3. Identity 생성
        await this.identities.create({
          tenantId: cmd.tenantId,
          userId: user.id,
          provider: 'kakao',
          providerSub: profile.id,
          email: profile.email,
          profileJson: profile.raw,
        });
      }
    } else if (cmd.provider === 'apple') {
      // Apple의 경우 accessToken이 idToken일 수 있음
      // 또는 별도의 프로필 조회 API가 필요할 수 있음
      // 현재는 기본 구현만 제공
      throw new Error('Apple native signin not yet implemented');
    } else {
      throw new Error(`Unsupported provider: ${cmd.provider}`);
    }

    const payload = await this.tokens.issueForUser({ tenantId: cmd.tenantId, userId: user.id });
    return payload;
  }
}

