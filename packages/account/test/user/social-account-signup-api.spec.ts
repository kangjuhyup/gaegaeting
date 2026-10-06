import { Module, ValidationPipe, type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ApolloFederationDriver } from "@nestjs/apollo";
import { GraphQLModule, Query, Resolver } from "@nestjs/graphql";
import { jest } from "@jest/globals";
import { SocialAccountSignupService } from "../../src/user/application/service/social-account-signup.service.js";
import { SocialRegistrationResolver } from "../../src/user/infrastructure/adapter/inbound/gql/social-registration.resolver.js";

@Resolver()
class SignupQuery {
  @Query(() => Boolean) socialSignupReady(): boolean {
    return true;
  }
}

describe("비밀번호 없는 카카오 가입 API", () => {
  let app: INestApplication;
  let endpoint: string;
  const register = jest.fn(async () => ({ authSubject: "auth-user" }));
  const input = {
    ticket: "t".repeat(43),
    attemptId: "a".repeat(43),
    termsVersion: "v1",
    termsAgreed: true,
    name: "홍길동",
    birthDate: "1996-05-14",
    gender: "FEMALE",
    phone: "01012345678",
  };
  beforeAll(async () => {
    @Module({
      imports: [
        GraphQLModule.forRoot({
          driver: ApolloFederationDriver,
          autoSchemaFile: { federation: 2 },
        }),
      ],
      providers: [
        SignupQuery,
        SocialRegistrationResolver,
        { provide: SocialAccountSignupService, useValue: { register } },
      ],
    })
    class SignupModule {}
    app = await NestFactory.create(SignupModule, { logger: false });
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.listen(0, "127.0.0.1");
    endpoint = `${await app.getUrl()}/graphql`;
  });
  afterEach(() => register.mockClear());
  afterAll(async () => {
    if (app) await app.close();
  });
  async function request(value: Record<string, unknown>) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query:
          "mutation Signup($input:RegisterSocialAccountInput!){registerSocialAccount(input:$input){authSubject}}",
        variables: { input: value },
      }),
    });
    return response.json();
  }
  test("아이디·비밀번호·이메일 없이 가입할 수 있고 Auth subject만 반환한다", async () => {
    const result = await request(input);
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      registerSocialAccount: { authSubject: "auth-user" },
    });
    expect(register).toHaveBeenCalledWith(input);
  });
  test('approved native selector is an optional additive input; identity fields remain server verified', async () => {
    const value = { ...input, clientId: 'gaegaeting-mobile' };
    const result = await request(value);
    expect(result.errors).toBeUndefined();
    expect(register).toHaveBeenCalledWith(value);
  });
  test.each([
    "ci",
    "di",
    "providerSub",
    "issuer",
    "clientId",
    "adult",
    "username",
    "password",
    "authSubject",
  ])("클라이언트가 %s를 주입해 인증 결합을 변경할 수 없다", async (field) => {
    const result = await request({
      ...input,
      [field]: field === "adult" ? true : "client-injected",
    });
    expect(result.errors).toBeDefined();
    expect(register).not.toHaveBeenCalled();
  });
  test.each([
    "ticket",
    "attemptId",
    "name",
    "birthDate",
    "gender",
    "phone",
    "termsVersion",
    "termsAgreed",
  ])("필수 %s가 없는 가입 요청은 서비스에 전달하지 않는다", async (field) => {
    const value: Record<string, unknown> = { ...input };
    delete value[field];
    const result = await request(value);
    expect(result.errors).toBeDefined();
    expect(register).not.toHaveBeenCalled();
  });
  test.each([
    { ticket: "unsafe.with.dots" },
    { attemptId: "../other" },
    { name: "x".repeat(51) },
    { phone: "x".repeat(33) },
    { termsVersion: "x".repeat(65) },
  ])(
    "형식·크기 제한을 위반한 요청은 서비스에 전달하지 않는다: %j",
    async (patch) => {
      const result = await request({ ...input, ...patch });
      expect(result.errors).toBeDefined();
      expect(register).not.toHaveBeenCalled();
    },
  );
});
