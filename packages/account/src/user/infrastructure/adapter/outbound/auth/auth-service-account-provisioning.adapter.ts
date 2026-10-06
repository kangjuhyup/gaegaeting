import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  AuthAccountProvisioningPort,
  type ProvisionAuthAccountInput,
} from "../../../../application/port/auth-account-provisioning.port.js";
import { authProvisioningRequest } from "./auth-provisioning-request.js";

@Injectable()
export class AuthServiceAccountProvisioningAdapter extends AuthAccountProvisioningPort {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async provision(
    input: ProvisionAuthAccountInput,
  ): Promise<{ authSubject: string }> {
    const response = await authProvisioningRequest(
      this.config,
      "users",
      { username: input.username, password: input.password },
      input.idempotencyKey,
    );
    if (response.status === 409) throw new Error("AUTH_ACCOUNT_ALREADY_EXISTS");
    if (!response.ok) throw new Error("AUTH_PROVISIONING_UNAVAILABLE");
    const body = (await response.json()) as { subject?: unknown };
    if (typeof body.subject !== "string" || !body.subject) {
      throw new Error("AUTH_PROVISIONING_RESPONSE_INVALID");
    }
    return { authSubject: body.subject };
  }
}
