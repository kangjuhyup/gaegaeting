import { Tenant } from '@app/common/decorator/tenant.decorator';
import { UserPayload } from '@app/common/decorator/user.decorator';
import { Resolver, Query, Mutation, Args, Context, Subscription } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { SocialSigninUseCase } from '../../../application/usecase/social-signin.usecase';
import { OtpUsecase } from '../../../application/usecase/otp.usecase';
import { PubSub } from 'graphql-subscriptions';
import { UserUsecase } from '@app/application/usecase/user.usecase';
import { GraphqlAuthGuard } from '@app/common/guard/graphql-auth.guard';
import { User } from '@app/domain/model/user';

const pubsub = new PubSub();

@Resolver('Auth')
export class AuthResolver {
  constructor(
    private readonly user : UserUsecase,
    private readonly socialSignin: SocialSigninUseCase,
    private readonly otp: OtpUsecase,
  ) {}
  
  @Mutation('signup')
  async signup(@Args('input') input: any, @Tenant() tenant: string) {
    // 유스케이스 호출… (정책 적용, 사용자 생성, 토큰 발급)
    return { accessToken: 'stub', refreshToken: 'stub', expiresIn: 900 };
  }

  @Mutation('signin')
  async signin(@Args('input') input: any, @Tenant() tenant: string) {
    // 비밀번호 검증/토큰 발급
    return { accessToken: 'stub', refreshToken: 'stub', expiresIn: 900 };
  }

  @Mutation('signout')
  @UseGuards(GraphqlAuthGuard)
  async signout(@Args('allDevices') allDevices: boolean, @Context() ctx: any) {
    // 리프레시 폐기, 세션 종료
    await pubsub.publish('AUTH_EVENT', { onAuthEvent: 'SIGNED_OUT' });
    return true;
  }

  @Mutation('refresh')
  async refresh(@Args('refreshToken') token: string, @Context() ctx: any) {
    return { accessToken: 'stub', refreshToken: 'stub', expiresIn: 900 };
  }

  @Mutation('kakaoSignin')
  @UseGuards(GraphqlAuthGuard)
  async kakaoSignin(
    @Args('authCode') authCode: string,
    @Args('redirectUri') redirectUri: string | undefined,
    @Tenant() tenant: string,
  ) {
    return await this.socialSignin.signinWithKakao({ tenantId: tenant, authCode, redirectUri });
  }

  @Mutation('appleSignin')
  @UseGuards(GraphqlAuthGuard)
  async appleSignin(
    @Args('idToken') idToken: string,
    @Args('authorizationCode') authorizationCode: string | undefined,
    @Args('user') userPayload: string | undefined,
    @Tenant() tenant: string,
  ) {
    return await this.socialSignin.signinWithApple({ tenantId: tenant, idToken, authorizationCode, userPayload });
  }

  @Mutation('nativeSignin')
  @UseGuards(GraphqlAuthGuard)
  async nativeSignin(
    @Args('provider') provider: string,
    @Args('accessToken') accessToken: string,
    @Args('refreshToken') refreshToken: string | undefined,
    @Args('expiresIn') expiresIn: number | undefined,
    @Args('tokenType') tokenType: string | undefined,
    @Tenant() tenant: string,
  ) {
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
  async me(@UserPayload() user: User) {
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
  ) {
    await this.otp.requestOtp({ user, phoneNumber });
    return true;
  }

  @Mutation('verifyOtp')
  @UseGuards(GraphqlAuthGuard)
  async verifyOtpMutation(
    @Args('phoneNumber') phoneNumber: string,
    @Args('code') code: string,
    @UserPayload() user: User,
  ) {
    const { verified } = await this.otp.verifyOtp({ user, phoneNumber, code });
    return verified;
  }

  @Subscription('onAuthEvent', {
    filter: (payload, _vars, ctx) => true, // 필요시 테넌트/유저 필터링
  })
  onAuthEvent() {
    return (pubsub as any).asyncIterator('AUTH_EVENT');
  }
}