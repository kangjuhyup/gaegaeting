import { UnprocessableEntityException } from "@nestjs/common";
import { createHmac } from "node:crypto";
import type {
  IdentityVerificationPort,
  IdentityVerificationRequest,
} from "../port/identity-verification.port.js";
import type {
  SignupIdentity,
  SignupVerification,
} from "../port/account-signup-repository.port.js";
import type { RegistrationOptions } from "./registration.service.js";
import {
  isAdultIdentity,
  normalizeIdentityVerificationRequest,
} from "./identity-verification-request.js";

export function validateSignupConsent(input: {
  termsVersion: string;
  termsAgreed: boolean;
}): string {
  if (
    input.termsAgreed !== true ||
    typeof input.termsVersion !== "string" ||
    !input.termsVersion.trim() ||
    input.termsVersion.trim().length > 64
  ) {
    throw new UnprocessableEntityException("Terms agreement is required");
  }
  return input.termsVersion.trim();
}

// Both signup methods use this same DI domain and verified identity policy.
// CI and raw DI are intentionally absent from the returned reservation.
export async function verifySignupIdentity(
  verifier: IdentityVerificationPort,
  input: IdentityVerificationRequest,
  options: RegistrationOptions,
): Promise<{
  diDigest: string;
  provisioningKey: string;
  identity: SignupIdentity;
  verification: SignupVerification;
}> {
  const verified = await verifier.request(
    normalizeIdentityVerificationRequest(input),
  );
  if (verified.adult !== true)
    throw new UnprocessableEntityException("Adult verification is required");
  if (
    typeof verified.di !== "string" ||
    !verified.di.trim() ||
    typeof verified.provider !== "string" ||
    !verified.provider.trim() ||
    verified.provider.length > 32 ||
    typeof verified.providerTransactionId !== "string" ||
    !verified.providerTransactionId.trim() ||
    verified.providerTransactionId.length > 128 ||
    !(verified.verifiedAt instanceof Date) ||
    Number.isNaN(verified.verifiedAt.getTime())
  )
    throw new UnprocessableEntityException(
      "Identity verification result is incomplete",
    );
  const identity = normalizeIdentityVerificationRequest(verified.identity);
  if (!isAdultIdentity(identity.birthDate, options.now?.() ?? new Date()))
    throw new UnprocessableEntityException("Adult verification is required");
  return {
    diDigest: createHmac("sha256", options.diHmacSecret)
      .update(`signup-di\0${verified.di}`)
      .digest("hex"),
    provisioningKey: createHmac("sha256", options.diHmacSecret)
      .update(`signup-provision\0${verified.di}`)
      .digest("base64url"),
    identity: {
      ...identity,
      birthDate: new Date(`${identity.birthDate}T00:00:00.000Z`),
    },
    verification: {
      provider: verified.provider,
      providerTransactionId: verified.providerTransactionId,
      verifiedAt: verified.verifiedAt,
    },
  };
}
