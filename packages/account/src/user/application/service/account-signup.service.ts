import {
  ConflictException,
  Inject,
  Injectable,
  UnprocessableEntityException,
} from "@nestjs/common";
import { createHmac } from "node:crypto";
import { AuthAccountProvisioningPort } from "../port/auth-account-provisioning.port.js";
import { AccountSignupRepositoryPort } from "../port/account-signup-repository.port.js";
import { IdentityVerificationPort } from "../port/identity-verification.port.js";
import { REGISTRATION_OPTIONS, type RegistrationOptions } from "./registration.service.js";

export interface RegisterAccountInput {
  providerTransactionId: string;
  ci: string;
  di: string;
  adult: boolean;
  termsVersion: string;
  termsAgreed: boolean;
  username: string;
  password: string;
  email: string;
  phone: string;
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
    const verified = await this.verifier.verify(input);
    if (!verified.adult)
      throw new UnprocessableEntityException("Adult verification is required");
    if (!input.termsAgreed || !input.termsVersion.trim()) {
      throw new UnprocessableEntityException("Terms agreement is required");
    }
    const username = input.username.trim();
    if (!/^[A-Za-z0-9_.-]{3,64}$/.test(username) || input.password.length < 8 || input.password.length > 128) {
      throw new UnprocessableEntityException('Invalid login credentials');
    }
    if (!this.options.authIssuer) throw new Error('AUTH_ISSUER is required for signup');
    const diDigest = createHmac('sha256', this.options.diHmacSecret)
      .update(`signup-di\0${verified.di}`).digest('hex');
    const idempotencyKey = createHmac('sha256', this.options.diHmacSecret)
      .update(`signup-provision\0${verified.di}`).digest('base64url');
    const reserved = await this.signups.reserve({ diDigest, username, issuer: this.options.authIssuer, termsVersion: input.termsVersion.trim() });
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
