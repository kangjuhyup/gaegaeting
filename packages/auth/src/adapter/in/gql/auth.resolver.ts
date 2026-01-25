import { Tenant } from '@app/common/decorator/tenant.decorator';
import { JwtPayload } from '@app/common/decorator/user.decorator';
import { Resolver, Query, Mutation, Args, Context, Subscription } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { SocialSigninUseCase } from '../../../application/usecase/social-signin.usecase';
import { OtpUsecase } from '../../../application/usecase/otp.usecase';
import { PubSub } from 'graphql-subscriptions';
import { UserUsecase } from '@app/application/usecase/user.usecase';
import { GraphqlAccessGuard } from '@core/auth';
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
  @UseGuards(GraphqlAccessGuard)
  async signout(
    @Args('allDevices') allDevices: boolean | null,
    @JwtPayload() payload: JwtPayload,
    @Tenant() tenant: string,
    @Context() ctx: any,
  ): Promise<boolean> {
    const authHeader = ctx.req?.headers?.authorization;
    const token = authHeader ? authHeader.replace('Bearer ', '') : undefined;

    await this.auth.signout({
      userId: payload.id,
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
  @UseGuards(GraphqlAccessGuard)
  async kakaoSignin(
    @Args('authCode') authCode: string,
    @Args('redirectUri') redirectUri: string | null,
    @Tenant() tenant: string,
  ): Promise<AuthPayload> {
    return await this.socialSignin.signinWithKakao({ tenantId: tenant, authCode, redirectUri });
  }

  @Mutation('appleSignin')
  @UseGuards(GraphqlAccessGuard)
  async appleSignin(
    @Args('idToken') idToken: string,
    @Args('authorizationCode') authorizationCode: string | null,
    @Args('user') userPayload: string | null,
    @Tenant() tenant: string,
  ): Promise<AuthPayload> {
    return await this.socialSignin.signinWithApple({ tenantId: tenant, idToken, authorizationCode, userPayload });
  }

  @Mutation('nativeSignin')
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
  @UseGuards(GraphqlAccessGuard)
  async me(@JwtPayload() payload: JwtPayload): Promise<GraphQLUser> {
    const user = await this.user.getUser(payload.userId);
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      status: user.status,
      identities: []
    };
  }

  @Mutation('requestOtp')
  @UseGuards(GraphqlAccessGuard)
  async requestOtp(
    @Args('phoneNumber') phoneNumber: string,
    @JwtPayload() payload: JwtPayload,
  ): Promise<boolean> {
    await this.otp.requestOtp({ payload, phoneNumber });
    return true;
  }

  @Mutation('verifyOtp')
  @UseGuards(GraphqlAccessGuard)
  async verifyOtp(
    @Args('phoneNumber') phoneNumber: string,
    @Args('code') code: string,
    @JwtPayload() payload: JwtPayload,
  ): Promise<AuthPayload> {
    const verifyResult = await this.otp.verifyOtp({ payload, phoneNumber, code });
    
    if (!verifyResult.verified || !verifyResult.payload) {
      throw new Error('OTP verification failed');
    }
    
    return {
      accessToken: verifyResult.payload.accessToken,
      refreshToken: verifyResult.payload.refreshToken,
      expiresIn: verifyResult.payload.expiresIn,
    };
  }

  @Query('myPermissions')
  @UseGuards(GraphqlAccessGuard)
  async myPermissions(@Args('clientId') clientId: string | null): Promise<string[]> {
    // TODO: 권한 조회 로직 구현
    return [];
  }

  @Mutation('linkIdentity')
  @UseGuards(GraphqlAccessGuard)
  async linkIdentity(@Args('input') input: LinkIdentityInput): Promise<boolean> {
    // TODO: Identity 연결 로직 구현
    return true;
  }

  @Mutation('unlinkIdentity')
  @UseGuards(GraphqlAccessGuard)
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