import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  AuthExternalSignupPort,
  type ExternalSignupAttempt,
  type VerifiedExternalSignup,
} from "../../../../application/port/auth-external-signup.port.js";
import { authProvisioningRequest } from "./auth-provisioning-request.js";

@Injectable()
export class AuthServiceExternalSignupAdapter extends AuthExternalSignupPort {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async claim(input: ExternalSignupAttempt): Promise<VerifiedExternalSignup> {
    const body = await this.request("claim", input);
    const keys = [
      "ticketId",
      "provider",
      "providerSub",
      "clientId",
      "issuer",
      "expiresAt",
    ] as const;
    if (
      !keys.every(
        (key) =>
          typeof body[key] === "string" &&
          body[key] &&
          (body[key] as string).length <= 512,
      )
    )
      throw invalid();
    const expiresAt = new Date(body.expiresAt as string);
    if (Number.isNaN(expiresAt.getTime())) throw invalid();
    // Project only the server-verified identity binding; never retain a raw
    // provider profile or CI if a future Auth response happens to include it.
    return {
      ticketId: body.ticketId as string,
      provider: body.provider as string,
      providerSub: body.providerSub as string,
      clientId: body.clientId as string,
      issuer: body.issuer as string,
      expiresAt,
    };
  }

  async complete(
    input: ExternalSignupAttempt & { idempotencyKey: string },
  ): Promise<{ issuer: string; authSubject: string }> {
    const { idempotencyKey, ...attempt } = input;
    const body = await this.request("complete", attempt, idempotencyKey);
    if (
      typeof body.issuer !== "string" ||
      !body.issuer ||
      body.issuer.length > 255 ||
      typeof body.subject !== "string" ||
      !body.subject ||
      body.subject.length > 255
    )
      throw invalid();
    return { issuer: body.issuer, authSubject: body.subject };
  }

  private async request(
    operation: "claim" | "complete",
    input: ExternalSignupAttempt,
    key?: string,
  ): Promise<Record<string, unknown>> {
    let response: Response;
    try {
      response = await authProvisioningRequest(
        this.config,
        `external-signups/${operation}`,
        input,
        key,
      );
    } catch {
      throw unavailable();
    }
    if (response.status === 404 || response.status === 410)
      throw new UnauthorizedException("SOCIAL_SIGNUP_EXPIRED");
    if (!response.ok) {
      if (
        response.status >= 400 &&
        response.status < 500 &&
        response.status !== 429
      )
        throw invalid();
      throw unavailable();
    }
    try {
      const body: unknown = await response.json();
      if (!body || typeof body !== "object" || Array.isArray(body))
        throw invalid();
      return body as Record<string, unknown>;
    } catch {
      throw invalid();
    }
  }
}

function invalid(): UnauthorizedException {
  return new UnauthorizedException("SOCIAL_SIGNUP_INVALID");
}
function unavailable(): ServiceUnavailableException {
  return new ServiceUnavailableException("SOCIAL_SIGNUP_UNAVAILABLE");
}
