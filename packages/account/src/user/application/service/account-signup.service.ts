import {
  ConflictException,
  Inject,
  Injectable,
  UnprocessableEntityException,
} from "@nestjs/common";
import { AuthAccountProvisioningPort } from "../port/auth-account-provisioning.port.js";
import { AccountSignupRepositoryPort } from "../port/account-signup-repository.port.js";
import {
  IdentityVerificationPort,
  type IdentityVerificationRequest,
} from "../port/identity-verification.port.js";
import {
  REGISTRATION_OPTIONS,
  type RegistrationOptions,
} from "./registration.service.js";
import {
  validateSignupConsent,
  verifySignupIdentity,
} from "./signup-verification.js";

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
    const termsVersion = validateSignupConsent(input);
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
    const {
      diDigest,
      provisioningKey: idempotencyKey,
      identity,
      verification,
    } = await verifySignupIdentity(this.verifier, input, this.options);
    const reserved = await this.signups.reserve({
      diDigest,
      username,
      issuer: this.options.authIssuer,
      termsVersion,
      identity,
      verification,
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
