import { publicConfig } from "../runtime-config.js";
import type { AppConfig } from "../types.js";

type Discovery = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  end_session_endpoint?: string;
  revocation_endpoint?: string;
};

type TokenResponse = {
  access_token?: string;
  id_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

const encoder = new TextEncoder();
const localAuthOrigin = new URL(publicConfig.authOrigin).origin;
const localAuthProxyPrefix = "/local-auth";
const toBase64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");

const randomValue = (size = 32) => {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
};

const storageKey = (config: AppConfig, part: string) =>
  `gaegaeting.oidc.${config.clientId}.${part}`;

async function discover(issuer: string): Promise<Discovery> {
  const url = `${issuer.replace(/\/$/, "")}/.well-known/openid-configuration`;
  const response = await fetch(browserApiUrl(url));
  if (!response.ok)
    throw new Error(`OIDC discovery 실패 (HTTP ${response.status})`);
  const metadata = (await response.json()) as Discovery;
  if (metadata.issuer !== issuer.replace(/\/$/, ""))
    throw new Error("OIDC issuer가 일치하지 않습니다.");
  return metadata;
}

function decodeJsonPart(part: string): Record<string, unknown> {
  const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Uint8Array.from(
    atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")),
    (char) => char.charCodeAt(0),
  );
  return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
}

async function verifyIdToken(
  token: string,
  discovery: Discovery,
  clientId: string,
  nonce: string,
): Promise<string> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("ID token 형식이 올바르지 않습니다.");
  const header = decodeJsonPart(parts[0]);
  const claims = decodeJsonPart(parts[1]);
  if (header.alg !== "RS256" || typeof header.kid !== "string")
    throw new Error("지원하지 않는 ID token 서명입니다.");
  const jwksUrl = new URL(discovery.jwks_uri);
  if (jwksUrl.origin !== new URL(discovery.issuer).origin)
    throw new Error("OIDC 키 주소가 올바르지 않습니다.");
  const keyResponse = await fetch(browserApiUrl(jwksUrl.href));
  if (!keyResponse.ok) throw new Error("OIDC 서명 키를 확인할 수 없습니다.");
  const jwks = (await keyResponse.json()) as {
    keys?: Array<JsonWebKey & { kid?: string }>;
  };
  const jwk = jwks.keys?.find(
    (key) => key.kid === header.kid && key.kty === "RSA",
  );
  if (!jwk) throw new Error("ID token 서명 키가 없습니다.");
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const signature = Uint8Array.from(
    atob(
      parts[2]
        .replace(/-/g, "+")
        .replace(/_/g, "/")
        .padEnd(Math.ceil(parts[2].length / 4) * 4, "="),
    ),
    (char) => char.charCodeAt(0),
  );
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    signature,
    encoder.encode(`${parts[0]}.${parts[1]}`),
  );
  const now = Math.floor(Date.now() / 1000);
  const audience = claims.aud;
  const audMatches =
    audience === clientId ||
    (Array.isArray(audience) && audience.includes(clientId));
  if (
    !valid ||
    claims.iss !== discovery.issuer ||
    !audMatches ||
    (Array.isArray(audience) &&
      audience.length > 1 &&
      claims.azp !== clientId) ||
    claims.nonce !== nonce ||
    typeof claims.sub !== "string" ||
    !claims.sub ||
    typeof claims.exp !== "number" ||
    claims.exp <= now ||
    typeof claims.iat !== "number" ||
    claims.iat > now + 60
  ) {
    throw new Error("ID token 검증에 실패했습니다. 다시 로그인해 주세요.");
  }
  return claims.sub;
}

function browserApiUrl(url: string): string {
  const parsed = new URL(url);
  return import.meta.env.DEV && parsed.origin === localAuthOrigin
    ? `${localAuthProxyPrefix}${parsed.pathname}${parsed.search}`
    : url;
}

export async function beginLogin(
  config: AppConfig,
  options: { scopes?: string; prompt?: "login"; provider?: "kakao"; intent?: "signup"; action?: "link-kakao"; intendedSubject?: string } = {},
) {
  if (options.action === "link-kakao" && !options.intendedSubject) throw new Error("연결할 기존 계정을 확인할 수 없어요. 다시 로그인해 주세요.");
  const discovery = await discover(config.issuer);
  const verifier = randomValue(48);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(verifier),
  );
  const state = randomValue();
  const nonce = randomValue();

  sessionStorage.setItem(storageKey(config, "verifier"), verifier);
  sessionStorage.setItem(storageKey(config, "state"), state);
  sessionStorage.setItem(storageKey(config, "nonce"), nonce);
  sessionStorage.removeItem(storageKey(config, "providerIntent"));
  sessionStorage.removeItem(storageKey(config, "linkAction"));
  if (options.action === "link-kakao") sessionStorage.setItem(storageKey(config, "linkAction"), JSON.stringify({ subject: options.intendedSubject, createdAt: Date.now() }));
  if (options.provider) {
    sessionStorage.setItem(storageKey(config, "providerIntent"), JSON.stringify({
      provider: options.provider, intent: options.intent ?? "login", createdAt: Date.now(),
    }));
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope:
      options.scopes ??
      "openid profile email account:read account:write match:read match:write",
    code_challenge: toBase64Url(new Uint8Array(digest)),
    code_challenge_method: "S256",
    state,
    nonce,
  });
  // Auth's own account APIs accept its opaque, resource-less access token.
  if (options.action !== "link-kakao") params.set("resource", publicConfig.apiAudience);
  if (options.prompt) params.set("prompt", options.prompt);
  window.location.assign(`${discovery.authorization_endpoint}?${params}`);
}

export function takeLoginAction(clientId: string): { action: "link-kakao"; subject: string } | null {
  const key = `gaegaeting.oidc.${clientId}.linkAction`;
  const value = sessionStorage.getItem(key);
  sessionStorage.removeItem(key);
  if (!value) return null;
  try {
    const { createdAt, subject } = JSON.parse(value);
    if (typeof subject === "string" && subject && typeof createdAt === "number" && createdAt <= Date.now() && Date.now() - createdAt < 300_000) return { action: "link-kakao", subject };
  } catch { /* Invalid intent must never treat an Auth-only token as an API token. */ }
  throw new Error("카카오 연결 요청이 만료됐어요. 기존 계정에서 다시 시작해 주세요.");
}

// A local UI preference, never an authorization-server policy or credential.
export function takeLoginProvider(clientId: string): { provider: "kakao"; intent: "signup" | "login" } | null {
  const key = `gaegaeting.oidc.${clientId}.providerIntent`;
  const stored = sessionStorage.getItem(key);
  sessionStorage.removeItem(key);
  if (!stored) return null;
  try {
    const value = JSON.parse(stored);
    if (value.provider !== "kakao" || !["signup", "login"].includes(value.intent) ||
      typeof value.createdAt !== "number" || value.createdAt > Date.now() || Date.now() - value.createdAt > 300_000) return null;
    return { provider: value.provider, intent: value.intent };
  } catch { return null; }
}

export async function completeLogin(
  config: AppConfig,
): Promise<{ accessToken: string; idToken: string; subject: string; expiresIn?: number }> {
  const params = new URLSearchParams(window.location.search);
  const oauthError = params.get("error");
  if (oauthError)
    throw new Error(params.get("error_description") || oauthError);
  const code = params.get("code");
  if (!code) throw new Error("인증 코드가 없습니다.");
  if (
    params.get("state") !== sessionStorage.getItem(storageKey(config, "state"))
  ) {
    throw new Error("OIDC state가 일치하지 않습니다. 새로 로그인해 주세요.");
  }
  const verifier = sessionStorage.getItem(storageKey(config, "verifier"));
  if (!verifier)
    throw new Error("PKCE verifier가 없습니다. 새로 로그인해 주세요.");

  const discovery = await discover(config.issuer);
  const response = await fetch(browserApiUrl(discovery.token_endpoint), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      code_verifier: verifier,
    }),
  });
  const body = (await response.json()) as TokenResponse;
  if (!response.ok || !body.access_token || !body.id_token) {
    throw new Error(
      body.error_description ||
        body.error ||
        `토큰 교환 실패 (HTTP ${response.status})`,
    );
  }
  const nonce = sessionStorage.getItem(storageKey(config, "nonce"));
  if (!nonce) throw new Error("OIDC nonce가 없습니다. 새로 로그인해 주세요.");
  const subject = await verifyIdToken(body.id_token, discovery, config.clientId, nonce);
  ["verifier", "state", "nonce", "providerIntent"].forEach((part) =>
    sessionStorage.removeItem(storageKey(config, part)),
  );
  return { accessToken: body.access_token, idToken: body.id_token, subject, expiresIn: body.expires_in };
}

export async function beginLogout(
  config: AppConfig,
  session: { accessToken: string; idToken: string },
) {
  ["verifier", "state", "nonce", "providerIntent", "linkAction"].forEach((part) =>
    sessionStorage.removeItem(storageKey(config, part)),
  );

  const discovery = await discover(config.issuer);
  if (!discovery.end_session_endpoint) {
    throw new Error("인증 서버가 로그아웃 주소를 제공하지 않습니다.");
  }
  const endpoint = new URL(discovery.end_session_endpoint);
  if (endpoint.origin !== new URL(discovery.issuer).origin) {
    throw new Error("인증 서버 로그아웃 주소가 올바르지 않습니다.");
  }
  if (discovery.revocation_endpoint) {
    const revocation = new URL(discovery.revocation_endpoint);
    if (revocation.origin !== endpoint.origin) {
      throw new Error("인증 서버 토큰 폐기 주소가 올바르지 않습니다.");
    }
    const response = await fetch(browserApiUrl(revocation.href), {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        token: session.accessToken,
        token_type_hint: "access_token",
        client_id: config.clientId,
      }),
    });
    if (!response.ok) {
      throw new Error(`토큰 폐기 실패 (HTTP ${response.status})`);
    }
  }
  endpoint.searchParams.set("id_token_hint", session.idToken);
  endpoint.searchParams.set("client_id", config.clientId);
  endpoint.searchParams.set("post_logout_redirect_uri", config.postLogoutRedirectUri ?? config.redirectUri);
  window.location.assign(endpoint.href);
}
