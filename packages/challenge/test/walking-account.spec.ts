import "reflect-metadata";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { ConfigService } from "@nestjs/config";
import { verifyInternalAuthAssertion } from "@core/auth-assertion";
import { WalkingAccountAdapter } from "../src/shared/infrastructure/walking-account.adapter.js";

const secret = "walking-account-adapter-test-secret-at-least-32-characters";
describe("산책 시작 시 Account 소유권 확인", () => {
  let server: Server,
    adapter: WalkingAccountAdapter,
    response: object,
    requestBody: string,
    assertion: string;
  beforeAll(async () => {
    server = createServer(async (req, res) => {
      assertion = String(req.headers["x-gaegaeting-principal"]);
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      requestBody = Buffer.concat(chunks).toString();
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(response));
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    adapter = new WalkingAccountAdapter(
      new ConfigService({
        INTERNAL_AUTH_ASSERTION_SECRET: secret,
        ACCOUNT_SERVICE_URL: `http://127.0.0.1:${(server.address() as AddressInfo).port}/account/graphql`,
      }),
    );
  });
  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });
  const user = {
    userId: "viewer",
    issuedAt: 1,
    expiresAt: 2,
    subject: "auth-subject",
    tenantId: "test",
    roles: ["ADMIN"],
    scopes: ["challenge:write"],
  };
  it("호출자 신원을 보존하되 account:read만 서명하여 프로필과 반려견을 조회한다", async () => {
    response = {
      data: {
        myProfile: { id: "viewer", nickname: "보호자" },
        pets: [{ id: 7, name: "보리" }],
      },
    };
    expect(await adapter.owner(user)).toEqual({
      nickname: "보호자",
      pets: [{ id: 7, name: "보리" }],
    });
    expect(
      verifyInternalAuthAssertion(assertion, {
        secret,
        issuer: "gaegaeting-gateway",
        audience: "account",
      }),
    ).toMatchObject({
      userId: "viewer",
      subject: "auth-subject",
      tenantId: "test",
      scopes: ["account:read"],
    });
    expect(
      verifyInternalAuthAssertion(assertion, {
        secret,
        issuer: "gaegaeting-gateway",
        audience: "account",
      }).roles,
    ).toBeUndefined();
    expect(JSON.parse(requestBody).query).toContain("pets { id name }");
  });
  it.each([
    { data: { myProfile: null, pets: [] } },
    { data: { myProfile: { id: "other", nickname: "다른 사람" }, pets: [] } },
    { errors: [{ message: "Account down" }] },
  ])(
    "프로필 미등록·신원 불일치·Account 오류는 산책 시작을 거절한다",
    async (value) => {
      response = value;
      await expect(adapter.owner(user)).rejects.toThrow();
    },
  );
});
