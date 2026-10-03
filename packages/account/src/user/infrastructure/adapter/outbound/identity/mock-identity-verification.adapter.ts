import { ForbiddenException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ENV_KEY } from "#app/config/env.config";
import { createHmac, randomUUID } from "node:crypto";
import {
  IdentityVerificationPort,
  type IdentityVerificationResult,
  type IdentityVerificationRequest,
  type SignupIdentityVerificationResult,
} from "../../../../application/port/identity-verification.port.js";
import {
  isAdultIdentity,
  normalizeIdentityVerificationRequest,
} from "../../../../application/service/identity-verification-request.js";

@Injectable()
export class MockIdentityVerificationAdapter implements IdentityVerificationPort {
  constructor(private readonly config: ConfigService) {}

  async request(
    input: IdentityVerificationRequest,
  ): Promise<SignupIdentityVerificationResult> {
    this.assertEnabled();
    const identity = normalizeIdentityVerificationRequest(input);
    const source = JSON.stringify([
      identity.name,
      identity.birthDate,
      identity.gender,
      identity.phone,
    ]);
    const secret = this.config.getOrThrow<string>(
      ENV_KEY.REGISTRATION_DI_HMAC_SECRET,
    );
    const digest = (purpose: string) =>
      createHmac("sha256", secret)
        .update(`${purpose}\0${source}`)
        .digest("base64url");
    const verifiedAt = new Date();
    return {
      provider: "mock",
      providerTransactionId: `mock-${randomUUID()}`,
      ci: `mock-ci-${digest("mock-ci")}`,
      di: `mock-di-${digest("mock-di")}`,
      adult: isAdultIdentity(identity.birthDate, verifiedAt),
      identity,
      verifiedAt,
    };
  }

  async verify(
    input: IdentityVerificationResult,
  ): Promise<IdentityVerificationResult> {
    this.assertEnabled();
    if (
      !input.providerTransactionId?.trim() ||
      !input.ci?.trim() ||
      !input.di?.trim()
    ) {
      throw new Error("Mock identity verification result is incomplete");
    }
    return {
      providerTransactionId: input.providerTransactionId,
      ci: input.ci,
      di: input.di,
      adult: input.adult,
    };
  }

  private assertEnabled(): void {
    if (
      this.config.get<string>(ENV_KEY.NODE_ENV) === "production" ||
      !this.config.get<boolean>(ENV_KEY.REGISTRATION_MOCK_ENABLED)
    ) {
      throw new ForbiddenException("Mock identity verification is disabled");
    }
  }
}
