import { publicConfig } from "../runtime-config.js";
type Bootstrap = {
  tenantCode: string;
  uid: string;
  token: string;
  csrf: string;
};
export class InteractionExpiredError extends Error {}

export type ExternalSignup = { ticket: string; provider: "kakao"; expiresAt: string; attemptId: string; clientId?: string };

export type InteractionDetails = {
  prompt: string;
  clientId: string;
  missingScopes: string[];
  idpList: { provider: string; name: string }[];
  externalSignup?: ExternalSignup;
  externalLoginResult?: Pick<InteractionResult, "mfaRequired" | "mfaEnrollmentRequired" | "methods" | "redirectTo">;
};

export type InteractionResult = {
  success?: boolean;
  passwordChangeRequired?: boolean;
  mfaEnrollmentRequired?: boolean;
  mfaRequired?: boolean;
  methods?: string[];
  redirectTo?: string;
  secret?: string;
  otpauthUrl?: string;
  recoveryCodes?: string[];
};

const authOrigin = new URL(publicConfig.authOrigin).origin;
const expectedClientIds = new Set(publicConfig.interactionClientIds ?? [publicConfig.clientId]);

function readBootstrap(): Bootstrap | null {
  if (window.location.pathname !== `${publicConfig.basePath}/interaction`)
    return null;
  const url = new URL(window.location.href);
  const fragment = new URLSearchParams(url.hash.slice(1));
  const result = {
    tenantCode: url.searchParams.get("tenantCode") ?? "",
    uid: url.searchParams.get("uid") ?? "",
    token: fragment.get("interaction_token") ?? "",
    csrf: fragment.get("csrf_token") ?? "",
  };
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  if (
    result.tenantCode !== publicConfig.tenantCode ||
    !/^[A-Za-z0-9_-]+$/.test(result.uid) ||
    !result.token ||
    !result.csrf
  )
    return null;
  return result;
}

// Keep fragment credentials in memory only, and remove them before React mounts.
const bootstrap = readBootstrap();

export function interactionAvailable(): boolean {
  return bootstrap !== null;
}

export function validateInteractionDetails(
  details: InteractionDetails,
): InteractionDetails {
  if (
    !details || !expectedClientIds.has(details.clientId) ||
    !["login", "consent"].includes(details.prompt) ||
    !Array.isArray(details.idpList) ||
    !details.idpList.every((idp) => idp && typeof idp.provider === "string" && /^[A-Za-z0-9_-]+$/.test(idp.provider) && typeof idp.name === "string") ||
    !Array.isArray(details.missingScopes) || !details.missingScopes.every((scope) => typeof scope === "string")
  ) {
    throw new Error(
      "인증 요청이 개개팅 로그인 설정과 일치하지 않아요. 다시 시작해 주세요.",
    );
  }
  if (details.externalSignup !== undefined) {
    const signup = details.externalSignup;
    if (!signup || details.prompt !== "login" || signup.provider !== "kakao" ||
      !details.idpList.some((idp) => idp.provider === signup.provider) ||
      typeof signup.ticket !== "string" || !/^[A-Za-z0-9_-]{32,256}$/.test(signup.ticket) ||
      typeof signup.attemptId !== "string" || !/^[A-Za-z0-9_-]{16,128}$/.test(signup.attemptId) ||
      typeof signup.expiresAt !== "string" || !Number.isFinite(Date.parse(signup.expiresAt))) {
      throw new Error("카카오 가입 정보를 확인할 수 없어요. 다시 시작해 주세요.");
    }
    if (Date.parse(signup.expiresAt) <= Date.now()) {
      throw new InteractionExpiredError("카카오 인증이 만료됐어요. 다시 시작해 주세요.");
    }
  }
  if (details.externalLoginResult !== undefined) {
    const result = details.externalLoginResult;
    if (!result || details.externalSignup ||
      (result.mfaRequired !== undefined && typeof result.mfaRequired !== "boolean") ||
      (result.mfaEnrollmentRequired !== undefined && typeof result.mfaEnrollmentRequired !== "boolean") ||
      (result.methods !== undefined && (!Array.isArray(result.methods) || !result.methods.every((method) => ["totp", "webauthn", "recovery_code"].includes(method)))) ||
      (result.redirectTo !== undefined && typeof result.redirectTo !== "string") ||
      (!result.mfaRequired && !result.mfaEnrollmentRequired && !result.redirectTo)) {
      throw new Error("추가 인증 정보를 확인할 수 없어요. 다시 시작해 주세요.");
    }
  }
  // Bind the selector to Auth's verified interaction details, never URL input
  // or an untrusted nested clientId. Account also rechecks the opaque ticket.
  return details.externalSignup ? { ...details, externalSignup: {
    provider: details.externalSignup.provider, ticket: details.externalSignup.ticket,
    attemptId: details.externalSignup.attemptId, expiresAt: details.externalSignup.expiresAt,
    clientId: details.clientId,
  } } : details;
}

function apiBase(): string {
  if (!bootstrap)
    throw new Error("로그인 세션이 만료됐어요. 다시 시작해 주세요.");
  return `${authOrigin}/t/${bootstrap.tenantCode}/interaction/${bootstrap.uid}`;
}

export async function interactionRequest<T>(
  path: string,
  body?: object,
): Promise<T> {
  if (!bootstrap)
    throw new Error("로그인 세션이 만료됐어요. 다시 시작해 주세요.");
  const response = await fetch(`${apiBase()}/api/${path}`, {
    method: body === undefined ? "GET" : "POST",
    mode: "cors",
    credentials: "include",
    headers: {
      authorization: `Bearer ${bootstrap.token}`,
      "x-interaction-csrf": bootstrap.csrf,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    if ([401, 404, 410].includes(response.status) && ["details", "external-signup/resume"].includes(path)) {
      throw new InteractionExpiredError("로그인 세션이 만료됐어요. 다시 시작해 주세요.");
    }
    if (response.status === 401)
      throw new Error("아이디 또는 비밀번호를 확인해 주세요.");
    if (response.status === 403)
      throw new InteractionExpiredError(
        "로그인 세션이 만료됐어요. 다시 시작해 주세요.",
      );
    throw new Error(`인증 처리에 실패했어요. (HTTP ${response.status})`);
  }
  return response.json() as Promise<T>;
}

type WebAuthnOptions = Omit<
  PublicKeyCredentialRequestOptions,
  "challenge" | "allowCredentials"
> & {
  challenge: string;
  allowCredentials?: Array<
    Omit<PublicKeyCredentialDescriptor, "id"> & { id: string }
  >;
};

function fromBase64Url(value: string): ArrayBuffer {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(decoded, (char) => char.charCodeAt(0)).buffer;
}

function toBase64Url(value: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(value)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export async function submitWebAuthn(): Promise<InteractionResult> {
  if (!window.PublicKeyCredential)
    throw new Error("이 브라우저는 보안 키 인증을 지원하지 않아요.");
  const options = await interactionRequest<WebAuthnOptions>(
    "mfa/webauthn-options",
  );
  const credential = (await navigator.credentials.get({
    publicKey: {
      ...options,
      challenge: fromBase64Url(options.challenge),
      allowCredentials: options.allowCredentials?.map((item) => ({
        ...item,
        id: fromBase64Url(item.id),
      })),
    },
  })) as PublicKeyCredential | null;
  if (!credential) throw new Error("보안 키 인증이 취소됐어요.");
  const response = credential.response as AuthenticatorAssertionResponse;
  return interactionRequest<InteractionResult>("mfa", {
    method: "webauthn",
    webauthnResponse: {
      id: credential.id,
      rawId: toBase64Url(credential.rawId),
      type: credential.type,
      response: {
        authenticatorData: toBase64Url(response.authenticatorData),
        clientDataJSON: toBase64Url(response.clientDataJSON),
        signature: toBase64Url(response.signature),
        userHandle: response.userHandle
          ? toBase64Url(response.userHandle)
          : undefined,
      },
      challenge: options.challenge,
    },
  });
}

export function goToAuth(redirectTo: string): void {
  const target = new URL(redirectTo, authOrigin);
  if (
    target.origin !== authOrigin ||
    !target.pathname.startsWith(`/t/${publicConfig.tenantCode}/`)
  ) {
    throw new Error("안전하지 않은 인증 이동 주소입니다.");
  }
  window.location.assign(target.href);
}

export function goToIdp(provider: string, intent: "login" | "signup" = "login"): void {
  if (!/^[A-Za-z0-9_-]+$/.test(provider))
    throw new Error("잘못된 로그인 제공자입니다.");
  window.location.assign(`${apiBase()}/idp/${encodeURIComponent(provider)}${intent === "signup" ? "?intent=signup" : ""}`);
}

/** Abort the current guarded interaction; Auth resumes the original RP callback. */
export async function abortInteraction(): Promise<void> {
  const result = await interactionRequest<InteractionResult>("abort", {});
  if (!result.redirectTo) throw new Error("로그인을 시작했던 화면에서 다시 시도해 주세요.");
  goToAuth(result.redirectTo);
}
