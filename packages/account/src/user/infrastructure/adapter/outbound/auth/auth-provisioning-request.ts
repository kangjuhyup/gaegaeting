import type { ConfigService } from "@nestjs/config";

export async function authProvisioningRequest(
  config: ConfigService,
  path: string,
  body: object,
  idempotencyKey?: string,
): Promise<Response> {
  const baseUrl = config
    .getOrThrow<string>("AUTH_BASE_URL")
    .replace(/\/+$/, "");
  const tenant = encodeURIComponent(
    config.getOrThrow<string>("AUTH_TENANT_CODE"),
  );
  const clientId = config.getOrThrow<string>("AUTH_PROVISIONING_CLIENT_ID");
  const secret = config.getOrThrow<string>("AUTH_PROVISIONING_CLIENT_SECRET");
  const tokenResponse = await fetch(`${baseUrl}/t/${tenant}/oidc/token`, {
    method: "POST",
    redirect: "error",
    headers: {
      authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "auth.user.provision",
    }),
    signal: AbortSignal.timeout(5_000),
  });
  if (!tokenResponse.ok) throw new Error("AUTH_PROVISIONING_UNAVAILABLE");
  const token = (await tokenResponse.json()) as { access_token?: unknown };
  if (typeof token.access_token !== "string" || !token.access_token)
    throw new Error("AUTH_PROVISIONING_RESPONSE_INVALID");
  return fetch(`${baseUrl}/t/${tenant}/provisioning/${path}`, {
    method: "POST",
    redirect: "error",
    headers: {
      authorization: `Bearer ${token.access_token}`,
      "content-type": "application/json",
      ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5_000),
  });
}
