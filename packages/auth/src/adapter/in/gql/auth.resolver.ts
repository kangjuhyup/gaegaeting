import { Tenant } from '@app/common/decorator/tenant.decorator';
import { UserPayload } from '@app/common/decorator/user.decorator';
import { Resolver, Query, Mutation, Args, Context, Subscription } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { SocialSigninUseCase } from '../../../application/usecase/social-signin.usecase';
import { OtpUsecase } from '../../../application/usecase/otp.usecase';
import { PubSub } from 'graphql-subscriptions';
import { UserUsecase } from '@app/application/usecase/user.usecase';
import { GraphqlAuthGuard } from '@core/auth';
import { User } from '@app/domain/model/user';
import { AuthUsecase } from '@app/application/usecase/auth.usecase';
import {
  SignupInput,
  SigninInput,
  AuthPayload,
  User as GraphQLUser,
  LinkIdentityInput,
} from './graphql';

const pubsub = new PubSub();

@Resolver('Auth')
export class AuthResolver{
  constructor(
    private readonly user : UserUsecase,
    private readonly socialSignin: SocialSigninUseCase,
    private readonly otp: OtpUsecase,
    private readonly auth: AuthUsecase,
  ) {}
  
  @Mutation('signup')
  async signup(@Args('input') input: SignupInput, @Tenant() tenant: string): Promise<AuthPayload | null> {
    // 유스케이스 호출… (정책 적용, 사용자 생성, 토큰 발급)
    return { accessToken: 'stub', refreshToken: 'stub', expiresIn: 900 };
  }

  @Mutation('signin')
  async signin(@Args('input') input: SigninInput, @Tenant() tenant: string): Promise<AuthPayload | null> {
    // 비밀번호 검증/토큰 발급
    return { accessToken: 'stub', refreshToken: 'stub', expiresIn: 900 };
  }

  @Mutation('signout')
  @UseGuards(GraphqlAuthGuard)
  async signout(
    @Args('allDevices') allDevices: boolean | null,
    @UserPayload() user: User,
    @Tenant() tenant: string,
    @Context() ctx: any,
  ): Promise<boolean> {
    const authHeader = ctx.req?.headers?.authorization;
    const token = authHeader ? authHeader.replace('Bearer ', '') : undefined;

    await this.auth.signout({
      userId: user.id,
      tenantId: tenant,
      token,
      allDevices,
    });
    
    await pubsub.publish('AUTH_EVENT', { onAuthEvent: 'SIGNED_OUT' });
    return true;
  }

  @Mutation('refresh')
  async refresh(
    @Args('refreshToken') refreshToken: string,
    @Tenant() tenant: string,
  ): Promise<AuthPayload | null> {
    const result = await this.auth.refreshToken({
      refreshToken,
      tenantId: tenant,
    });

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
    };
  }

  @Mutation('kakaoSignin')
  @UseGuards(GraphqlAuthGuard)
  async kakaoSignin(
    @Args('authCode') authCode: string,
    @Args('redirectUri') redirectUri: string | null,
    @Tenant() tenant: string,
  ): Promise<AuthPayload> {
    return await this.socialSignin.signinWithKakao({ tenantId: tenant, authCode, redirectUri });
  }

  @Mutation('appleSignin')
  @UseGuards(GraphqlAuthGuard)
  async appleSignin(
    @Args('idToken') idToken: string,
    @Args('authorizationCode') authorizationCode: string | null,
    @Args('user') userPayload: string | null,
    @Tenant() tenant: string,
  ): Promise<AuthPayload> {
    return await this.socialSignin.signinWithApple({ tenantId: tenant, idToken, authorizationCode, userPayload });
  }

  @Mutation('nativeSignin')
  @UseGuards(GraphqlAuthGuard)
  async nativeSignin(
    @Args('provider') provider: string,
    @Args('accessToken') accessToken: string,
    @Args('refreshToken') refreshToken: string | null,
    @Args('expiresIn') expiresIn: number | null,
    @Args('tokenType') tokenType: string | null,
    @Tenant() tenant: string,
  ): Promise<AuthPayload> {
    return await this.socialSignin.signinWithNativeToken({
      tenantId: tenant,
      provider: provider as 'kakao' | 'apple',
      accessToken,
      refreshToken,
      expiresIn,
      tokenType,
    });
  }

  @Query('me')
  @UseGuards(GraphqlAuthGuard)
  async me(@UserPayload() user: User): Promise<GraphQLUser> {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      status: user.status,
      identities: user.identities.map((identity) => ({
        provider: identity.provider,
        providerSub: identity.providerSub,
        linkedAt: identity.linkedAt,
      })),
    };
  }

  @Mutation('requestOtp')
  @UseGuards(GraphqlAuthGuard)
  async requestOtp(
    @Args('phoneNumber') phoneNumber: string,
    @UserPayload() user: User,
  ): Promise<boolean> {
    await this.otp.requestOtp({ user, phoneNumber });
    return true;
  }

  @Mutation('verifyOtp')
  @UseGuards(GraphqlAuthGuard)
  async verifyOtp(
    @Args('phoneNumber') phoneNumber: string,
    @Args('code') code: string,
    @UserPayload() user: User,
  ): Promise<AuthPayload> {
    const { verified, payload } = await this.otp.verifyOtp({ user, phoneNumber, code });
    
    if (!verified || !payload) {
      throw new Error('OTP verification failed');
    }
    
    return payload;
  }

  @Query('myPermissions')
  @UseGuards(GraphqlAuthGuard)
  async myPermissions(@Args('clientId') clientId: string | null): Promise<string[]> {
    // TODO: 권한 조회 로직 구현
    return [];
  }

  @Mutation('linkIdentity')
  @UseGuards(GraphqlAuthGuard)
  async linkIdentity(@Args('input') input: LinkIdentityInput): Promise<boolean> {
    // TODO: Identity 연결 로직 구현
    return true;
  }

  @Mutation('unlinkIdentity')
  @UseGuards(GraphqlAuthGuard)
  async unlinkIdentity(@Args('provider') provider: string): Promise<boolean> {
    // TODO: Identity 해제 로직 구현
    return true;
  }

  @Subscription('onAuthEvent', {
    filter: (payload, _vars, ctx) => true, // 필요시 테넌트/유저 필터링
  })
  onAuthEvent(): Promise<string> {
    return (pubsub as any).asyncIterator('AUTH_EVENT');
  }
}