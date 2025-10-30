import { Tenant } from '@app/common/decorator/tenant.decorator';
import { Resolver, Query, Mutation, Args, Context, Subscription } from '@nestjs/graphql';
import { SocialSigninUseCase } from '../../../application/usecase/social-signin.usecase';
import { OtpUsecase } from '../../../application/usecase/otp.usecase';
import { PubSub } from 'graphql-subscriptions';

const pubsub = new PubSub();

@Resolver('Auth')
export class AuthResolver {
  constructor(
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
  async signout(@Args('allDevices') allDevices: boolean, @Tenant() tenant: string) {
    // 리프레시 폐기, 세션 종료
    await pubsub.publish('AUTH_EVENT', { onAuthEvent: 'SIGNED_OUT' });
    return true;
  }

  @Mutation('refresh')
  async refresh(@Args('refreshToken') token: string) {
    return { accessToken: 'stub', refreshToken: 'stub', expiresIn: 900 };
  }

  @Mutation('kakaoSignin')
  async kakaoSignin(
    @Args('authCode') authCode: string,
    @Args('redirectUri') redirectUri: string | undefined,
    @Tenant() tenant: string,
  ) {
    return await this.socialSignin.signinWithKakao({ tenantId: tenant, authCode, redirectUri });
  }

  @Mutation('appleSignin')
  async appleSignin(
    @Args('idToken') idToken: string,
    @Args('authorizationCode') authorizationCode: string | undefined,
    @Args('user') userPayload: string | undefined,
    @Tenant() tenant: string,
  ) {
    return await this.socialSignin.signinWithApple({ tenantId: tenant, idToken, authorizationCode, userPayload });
  }

  @Query('me')
  async me(@Context() ctx: any) {
    const userId = ctx.req.user?.sub ?? 'me';
    return { id: userId, username: 'current', status: 'ACTIVE', identities: [] };
  }

  @Mutation('requestOtp')
  async requestOtp(
    @Args('phoneNumber') phoneNumber: string,
    @Tenant() tenant: string,
  ) {
    await this.otp.requestOtp({ tenantId: tenant, phoneNumber });
    return true;
  }

  @Mutation('verifyOtp')
  async verifyOtpMutation(
    @Args('phoneNumber') phoneNumber: string,
    @Args('code') code: string,
    @Tenant() tenant: string,
  ) {
    const { verified } = await this.otp.verifyOtp({ tenantId: tenant, phoneNumber, code });
    return verified;
  }

  @Subscription('onAuthEvent', {
    filter: (payload, _vars, ctx) => true, // 필요시 테넌트/유저 필터링
  })
  onAuthEvent() {
    return (pubsub as any).asyncIterator('AUTH_EVENT');
  }
}