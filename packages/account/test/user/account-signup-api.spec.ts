import { Module, ValidationPipe, type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { ApolloFederationDriver } from "@nestjs/apollo";
import { GraphQLModule, Query, Resolver } from "@nestjs/graphql";
import { jest } from "@jest/globals";
import { RegistrationResolver } from "../../src/user/infrastructure/adapter/inbound/gql/registration.resolver.js";
import { AccountSignupService } from "../../src/user/application/service/account-signup.service.js";
import { RegistrationService } from "../../src/user/application/service/registration.service.js";
import { MockIdentityVerificationAdapter } from "../../src/user/infrastructure/adapter/outbound/identity/mock-identity-verification.adapter.js";
import type { AccountSignupReservation } from "../../src/user/application/port/account-signup-repository.port.js";

@Resolver()
class SignupTestQuery {
  @Query(() => Boolean)
  signupTestReady(): boolean {
    return true;
  }
}

describe("회원가입 GraphQL 계약", () => {
  let app: INestApplication;
  let endpoint: string;
  const reserve = jest.fn(async (_reservation: AccountSignupReservation) => ({
    userId: "user-1",
    username: "alice",
    issuer: "issuer",
  }));
  const provision = jest.fn(async () => ({ authSubject: "auth-subject" }));
  const input = {
    termsVersion: "v1",
    termsAgreed: true,
    username: "alice",
    password: "password123",
    email: "alice@example.com",
    name: "홍길동",
    birthDate: "1996-05-14",
    gender: "FEMALE",
    phone: "010-1234-5678",
  };

  beforeAll(async () => {
    const verifier = new MockIdentityVerificationAdapter(
      new ConfigService({
        NODE_ENV: "test",
        REGISTRATION_MOCK_ENABLED: true,
        REGISTRATION_DI_HMAC_SECRET: "s".repeat(32),
      }),
    );
    const service = new AccountSignupService(
      verifier,
      { provision },
      {
        reserve,
        complete: async () => ({
          userId: "user-1",
          username: "alice",
          issuer: "issuer",
        }),
        findIdentity: async () => null,
      },
      {
        authIssuer: "issuer",
        diHmacSecret: "s".repeat(32),
        diHmacKeyVersion: 1,
        handoffTtlMs: 600000,
        claimTtlMs: 300000,
      },
    );
    @Module({
      imports: [
        GraphQLModule.forRoot({
          driver: ApolloFederationDriver,
          autoSchemaFile: { federation: 2 },
        }),
      ],
      providers: [
        SignupTestQuery,
        RegistrationResolver,
        { provide: AccountSignupService, useValue: service },
        { provide: RegistrationService, useValue: {} },
      ],
    })
    class SignupTestModule {}
    app = await NestFactory.create(SignupTestModule, { logger: false });
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

  afterEach(() => {
    reserve.mockClear();
    provision.mockClear();
  });
  afterAll(async () => {
    if (app) await app.close();
  });

  async function signup(value: Record<string, unknown>) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query:
          "mutation Signup($input: RegisterAccountInput!) { registerAccount(input: $input) { authSubject } }",
        variables: { input: value },
      }),
    });
    return response.json();
  }

  test("클라이언트가 CI·DI 없이 회원 정보를 보내면 서버가 인증하고 subject만 응답한다", async () => {
    const result = await signup(input);
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      registerAccount: { authSubject: "auth-subject" },
    });
    expect(reserve).toHaveBeenCalledWith(
      expect.objectContaining({
        diDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
        identity: expect.objectContaining({ phone: "01012345678" }),
        verification: expect.objectContaining({ provider: "mock" }),
      }),
    );
    expect(reserve.mock.calls[0][0]).not.toHaveProperty("ci");
    expect(reserve.mock.calls[0][0]).not.toHaveProperty("di");
  });

  test.each(["ci", "di", "providerTransactionId", "adult"])(
    "클라이언트가 인증 결과 %s를 주입하면 가입 전에 거절한다",
    async (field) => {
      const result = await signup({
        ...input,
        [field]: field === "adult" ? true : "client-supplied",
      });
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: expect.stringContaining(field) }),
        ]),
      );
      expect(reserve).not.toHaveBeenCalled();
      expect(provision).not.toHaveBeenCalled();
    },
  );

  test.each(["name", "birthDate", "gender"])(
    "본인인증 요청에 필요한 %s가 없으면 가입 전에 거절한다",
    async (field) => {
      const value = { ...input };
      delete value[field as keyof typeof value];
      const result = await signup(value);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: expect.stringContaining(field) }),
        ]),
      );
      expect(reserve).not.toHaveBeenCalled();
      expect(provision).not.toHaveBeenCalled();
    },
  );
});
