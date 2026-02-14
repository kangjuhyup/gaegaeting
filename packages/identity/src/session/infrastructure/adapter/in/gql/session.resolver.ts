import {
  Resolver,
  Query,
  Mutation,
  Args,
  Context,
  Subscription,
} from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { PubSub } from "graphql-subscriptions";
import { QueryBus, CommandBus } from "@nestjs/cqrs";
import { GraphqlAccessGuard } from "@core/auth";
import {
  AuthPayload,
  SignupInput,
  SigninInput,
  LinkIdentityInput,
} from "./dto/session.input";
import { GraphQLUser } from "./dto/session.type";
import { SigninCommand } from "@app/session/application/port/command/sigin-in.command";

const pubsub = new PubSub();

@Resolver()
export class AuthResolver {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Mutation(() => Boolean)
  @UseGuards(GraphqlAccessGuard)
  async signout(
    @Args("allDevices", { type: () => Boolean, nullable: true })
    allDevices: boolean | null,
    @Context() ctx: any,
  ): Promise<boolean> {
    const authHeader = ctx.req?.headers?.authorization;
    const token = authHeader ? authHeader.replace("Bearer ", "") : undefined;

    await this.auth.signout({
      userId: payload.id,
      tenantId: tenant,
      token,
      allDevices,
    });

    await pubsub.publish("AUTH_EVENT", { onAuthEvent: "SIGNED_OUT" });
    return true;
  }

  @Mutation(() => AuthPayload, { nullable: true })
  async refresh(
    @Args("refreshToken") refreshToken: string,
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

  @Mutation(() => AuthPayload)
  @UseGuards(GraphqlAccessGuard)
  async kakaoSignin(
    @Args("authCode") authCode: string,
    @Args("redirectUri", { nullable: true }) redirectUri: string | null,
  ): Promise<AuthPayload> {
    return await this.socialSignin.signinWithKakao({
      tenantId: tenant,
      authCode,
      redirectUri,
    });
  }

  @Mutation(() => AuthPayload)
  @UseGuards(GraphqlAccessGuard)
  async appleSignin(
    @Args("idToken") idToken: string,
    @Args("authorizationCode", { nullable: true })
    authorizationCode: string | null,
    @Args("user", { nullable: true }) userPayload: string | null,
  ): Promise<AuthPayload> {
    return await this.socialSignin.signinWithApple({
      tenantId: tenant,
      idToken,
      authorizationCode,
      userPayload,
    });
  }

  @Mutation(() => AuthPayload)
  async nativeSignin(
    @Args("provider") provider: string,
    @Args("accessToken") accessToken: string,
    @Args("refreshToken", { nullable: true }) refreshToken: string | null,
    @Args("expiresIn", { type: () => Number, nullable: true })
    expiresIn: number | null,
    @Args("tokenType", { nullable: true }) tokenType: string | null,
  ): Promise<AuthPayload> {
    const output = await this.commandBus.execute(
      SigninInput.of({
        provider: provider,
        accessToken: accessToken,
        refreshToken: refreshToken,
        expiresIn: expiresIn,
        tokenType: tokenType,
      }),
    );
  }

  @Query(() => GraphQLUser)
  @UseGuards(GraphqlAccessGuard)
  async me(): Promise<GraphQLUser> {
    const user = await this.user.getUser(payload.userId);
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      status: user.status,
      identities: [],
    };
  }

  @Mutation(() => Boolean)
  @UseGuards(GraphqlAccessGuard)
  async requestOtp(@Args("phoneNumber") phoneNumber: string): Promise<boolean> {
    await this.otp.requestOtp({ payload, phoneNumber });
    return true;
  }

  @Mutation(() => AuthPayload)
  @UseGuards(GraphqlAccessGuard)
  async verifyOtp(
    @Args("phoneNumber") phoneNumber: string,
    @Args("code") code: string,
  ): Promise<AuthPayload> {
    const verifyResult = await this.otp.verifyOtp({
      payload,
      phoneNumber,
      code,
    });

    if (!verifyResult.verified || !verifyResult.payload) {
      throw new Error("OTP verification failed");
    }

    return {
      accessToken: verifyResult.payload.accessToken,
      refreshToken: verifyResult.payload.refreshToken,
      expiresIn: verifyResult.payload.expiresIn,
    };
  }

  @Query(() => [String])
  @UseGuards(GraphqlAccessGuard)
  async myPermissions(
    @Args("clientId", { nullable: true }) clientId: string | null,
  ): Promise<string[]> {
    // TODO
    return [];
  }

  @Mutation(() => Boolean)
  @UseGuards(GraphqlAccessGuard)
  async linkIdentity(
    @Args("input") input: LinkIdentityInput,
  ): Promise<boolean> {
    // TODO
    return true;
  }

  @Mutation(() => Boolean)
  @UseGuards(GraphqlAccessGuard)
  async unlinkIdentity(@Args("provider") provider: string): Promise<boolean> {
    // TODO
    return true;
  }

  @Subscription(() => String, {
    filter: (_payload, _vars, _ctx) => true,
  })
  onAuthEvent() {
    return (pubsub as any).asyncIterator("AUTH_EVENT");
  }
}
