import {
  ConflictException,
  Inject,
  Injectable,
  UnprocessableEntityException,
} from "@nestjs/common";
import { createHmac } from "node:crypto";
import { AuthAccountProvisioningPort } from "../port/auth-account-provisioning.port.js";
import {
  AccountSignupRepositoryPort,
  type SignupIdentity,
} from "../port/account-signup-repository.port.js";
import {
  IdentityVerificationPort,
  type IdentityVerificationRequest,
} from "../port/identity-verification.port.js";
import {
  REGISTRATION_OPTIONS,
  type RegistrationOptions,
} from "./registration.service.js";
import {
  isAdultIdentity,
  normalizeIdentityVerificationRequest,
} from "./identity-verification-request.js";

export interface RegisterAccountInput extends IdentityVerificationRequest {
  termsVersion: string;
  termsAgreed: boolean;
  username: string;
  password: string;
  email: string;
}

@Injectable()
export class AccountSignupService {
  constructor(
    private readonly verifier: IdentityVerificationPort,
    private readonly authAccounts: AuthAccountProvisioningPort,
    private readonly signups: AccountSignupRepositoryPort,
    @Inject(REGISTRATION_OPTIONS) private readonly options: RegistrationOptions,
  ) {}

  async register(
    input: RegisterAccountInput,
  ): Promise<{ authSubject: string }> {
    if (!input.termsAgreed || !input.termsVersion.trim()) {
      throw new UnprocessableEntityException("Terms agreement is required");
    }
    const username = input.username.trim();
    if (
      !/^[A-Za-z0-9_.-]{3,64}$/.test(username) ||
      input.password.length < 8 ||
      input.password.length > 128
    ) {
      throw new UnprocessableEntityException("Invalid login credentials");
    }
    if (!this.options.authIssuer)
      throw new Error("AUTH_ISSUER is required for signup");
    const request = normalizeIdentityVerificationRequest(input);
    const verified = await this.verifier.request(request);
    if (verified.adult !== true)
      throw new UnprocessableEntityException("Adult verification is required");
    if (
      !verified.di?.trim() ||
      !verified.provider?.trim() ||
      verified.provider.length > 32 ||
      !verified.providerTransactionId?.trim() ||
      verified.providerTransactionId.length > 128 ||
      !(verified.verifiedAt instanceof Date) ||
      Number.isNaN(verified.verifiedAt.getTime())
    ) {
      throw new UnprocessableEntityException(
        "Identity verification result is incomplete",
      );
    }
    const verifiedIdentity = normalizeIdentityVerificationRequest(
      verified.identity,
    );
    if (
      !isAdultIdentity(
        verifiedIdentity.birthDate,
        this.options.now?.() ?? new Date(),
      )
    ) {
      throw new UnprocessableEntityException("Adult verification is required");
    }
    const diDigest = createHmac("sha256", this.options.diHmacSecret)
      .update(`signup-di\0${verified.di}`)
      .digest("hex");
    const idempotencyKey = createHmac("sha256", this.options.diHmacSecret)
      .update(`signup-provision\0${verified.di}`)
      .digest("base64url");
    const identity: SignupIdentity = {
      ...verifiedIdentity,
      birthDate: new Date(`${verifiedIdentity.birthDate}T00:00:00.000Z`),
    };
    const reserved = await this.signups.reserve({
      diDigest,
      username,
      issuer: this.options.authIssuer,
      termsVersion: input.termsVersion.trim(),
      identity,
      verification: {
        provider: verified.provider,
        providerTransactionId: verified.providerTransactionId,
        verifiedAt: verified.verifiedAt,
      },
    });
    if (reserved.authSubject) return { authSubject: reserved.authSubject };
    try {
      const result = await this.authAccounts.provision({
        username,
        password: input.password,
        idempotencyKey,
      });
      await this.signups.complete({ diDigest, subject: result.authSubject });
      return result;
    } catch (error) {
      if ((error as Error).message === "AUTH_ACCOUNT_ALREADY_EXISTS") {
        throw new ConflictException("Account already exists");
      }
      throw error;
    }
  }
}
