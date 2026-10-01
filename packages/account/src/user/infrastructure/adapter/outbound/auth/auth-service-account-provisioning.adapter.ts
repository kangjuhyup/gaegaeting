import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  AuthAccountProvisioningPort,
  type ProvisionAuthAccountInput,
} from "../../../../application/port/auth-account-provisioning.port.js";

@Injectable()
export class AuthServiceAccountProvisioningAdapter extends AuthAccountProvisioningPort {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async provision(input: ProvisionAuthAccountInput): Promise<{ authSubject: string }> {
    const baseUrl = this.config.getOrThrow<string>("AUTH_BASE_URL").replace(/\/+$/, "");
    const tenantCode = encodeURIComponent(this.config.getOrThrow<string>("AUTH_TENANT_CODE"));
    const clientId = this.config.getOrThrow<string>("AUTH_PROVISIONING_CLIENT_ID");
    const secret = this.config.getOrThrow<string>("AUTH_PROVISIONING_CLIENT_SECRET");
    const tokenResponse = await fetch(`${baseUrl}/t/${tenantCode}/oidc/token`, {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ grant_type: "client_credentials", scope: "auth.user.provision" }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!tokenResponse.ok) throw new Error("AUTH_PROVISIONING_UNAVAILABLE");
    const token = (await tokenResponse.json()) as { access_token?: unknown };
    if (typeof token.access_token !== "string" || !token.access_token) {
      throw new Error("AUTH_PROVISIONING_RESPONSE_INVALID");
    }

    const response = await fetch(`${baseUrl}/t/${tenantCode}/provisioning/users`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token.access_token}`,
        "content-type": "application/json",
        "idempotency-key": input.idempotencyKey,
      },
      body: JSON.stringify({ username: input.username, password: input.password }),
      signal: AbortSignal.timeout(5_000),
    });
    if (response.status === 409) throw new Error("AUTH_ACCOUNT_ALREADY_EXISTS");
    if (!response.ok) throw new Error("AUTH_PROVISIONING_UNAVAILABLE");
    const body = (await response.json()) as { subject?: unknown };
    if (typeof body.subject !== "string" || !body.subject) {
      throw new Error("AUTH_PROVISIONING_RESPONSE_INVALID");
    }
    return { authSubject: body.subject };
  }
}
