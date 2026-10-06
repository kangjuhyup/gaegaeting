import {
  Inject,
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { createHmac } from "node:crypto";
import { AuthExternalSignupPort } from "../port/auth-external-signup.port.js";
import { AccountSignupRepositoryPort } from "../port/account-signup-repository.port.js";
import {
  IdentityVerificationPort,
  type IdentityVerificationRequest,
} from "../port/identity-verification.port.js";
import {
  REGISTRATION_OPTIONS,
  type RegistrationOptions,
} from "./registration.service.js";
import { normalizeIdentityVerificationRequest } from "./identity-verification-request.js";
import {
  validateSignupConsent,
  verifySignupIdentity,
} from "./signup-verification.js";

export interface RegisterSocialAccountInput extends IdentityVerificationRequest {
  clientId?: string;
  ticket: string;
  attemptId: string;
  termsVersion: string;
  termsAgreed: boolean;
}

@Injectable()
export class SocialAccountSignupService {
  constructor(
    private readonly verifier: IdentityVerificationPort,
    private readonly auth: AuthExternalSignupPort,
    private readonly signups: AccountSignupRepositoryPort,
    @Inject(REGISTRATION_OPTIONS) private readonly options: RegistrationOptions,
  ) {}

  async register(
    input: RegisterSocialAccountInput,
  ): Promise<{ authSubject: string }> {
    const termsVersion = validateSignupConsent(input);
    const request = normalizeIdentityVerificationRequest(input);
    if (
      !/^[A-Za-z0-9_-]{32,256}$/.test(input.ticket ?? "") ||
      !/^[A-Za-z0-9_-]{16,128}$/.test(input.attemptId ?? "")
    ) {
      throw new UnprocessableEntityException("SOCIAL_SIGNUP_INVALID");
    }
    if (!this.options.authIssuer || !this.options.signupClientId)
      throw new Error("Auth social signup configuration is required");
    const clientId = input.clientId ?? this.options.signupClientId;
    if (!(this.options.signupClientIds ?? [this.options.signupClientId]).includes(clientId)) {
      throw new UnauthorizedException('SOCIAL_SIGNUP_INVALID');
    }
    const attempt = {
      ticket: input.ticket,
      attemptId: input.attemptId,
      clientId,
    };
    const external = await this.auth.claim(attempt);
    if (
      external.issuer !== this.options.authIssuer ||
      external.clientId !== attempt.clientId ||
      external.provider !== "kakao" ||
      typeof external.ticketId !== "string" ||
      !external.ticketId ||
      external.ticketId.length > 128 ||
      typeof external.providerSub !== "string" ||
      !external.providerSub ||
      external.providerSub.length > 255 ||
      external.providerSub.trim() !== external.providerSub ||
      ["undefined", "null"].includes(external.providerSub) ||
      !(external.expiresAt instanceof Date) ||
      Number.isNaN(external.expiresAt.getTime())
    )
      throw new UnauthorizedException("SOCIAL_SIGNUP_INVALID");
    if (
      external.expiresAt.getTime() <=
      (this.options.now?.() ?? new Date()).getTime()
    )
      throw new UnauthorizedException("SOCIAL_SIGNUP_EXPIRED");
    const externalIdentityDigest = createHmac(
      "sha256",
      this.options.diHmacSecret,
    )
      .update(
        `signup-external-identity\0${external.issuer}\0${external.provider}\0${external.providerSub}`,
      )
      .digest("hex");
    const { diDigest, identity, verification } = await verifySignupIdentity(
      this.verifier,
      request,
      this.options,
    );
    const reserved = await this.signups.reserve({
      method: "SOCIAL",
      externalIdentityDigest,
      diDigest,
      issuer: this.options.authIssuer,
      termsVersion,
      identity,
      verification,
    });
    const idempotencyKey = createHmac("sha256", this.options.diHmacSecret)
      .update(`signup-social-provision\0${diDigest}\0${externalIdentityDigest}`)
      .digest("base64url");
    // Completing a fresh ticket also binds it for browser resume when the
    // service membership already exists. It never creates a second Auth user.
    const result = await this.auth.complete({ ...attempt, idempotencyKey });
    if (
      result.issuer !== this.options.authIssuer ||
      typeof result.authSubject !== "string" ||
      !result.authSubject.trim() ||
      result.authSubject.length > 255 ||
      (reserved.authSubject && reserved.authSubject !== result.authSubject)
    )
      throw new UnauthorizedException("SOCIAL_SIGNUP_INVALID");
    await this.signups.complete({ diDigest, subject: result.authSubject });
    return { authSubject: result.authSubject };
  }
}
