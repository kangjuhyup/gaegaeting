import { publicConfig } from "@gaegaeting/ui-common";

export function validateKakaoAuthorizationUrl(value: string): string {
  const target = new URL(value);
  if (target.protocol !== "https:" || target.hostname !== "kauth.kakao.com" || target.port ||
    target.username || target.password || target.pathname !== "/oauth/authorize" || target.hash ||
    target.searchParams.get("response_type") !== "code" || !target.searchParams.get("state") ||
    !target.searchParams.get("client_id") || !target.searchParams.get("redirect_uri")) {
    throw new Error("안전한 카카오 연결 주소를 확인할 수 없어요.");
  }
  const callback = new URL(target.searchParams.get("redirect_uri")!);
  if (callback.origin !== new URL(publicConfig.authOrigin).origin || callback.pathname !== "/auth/identity-links/kakao/callback") {
    throw new Error("카카오 연결 콜백 주소를 확인할 수 없어요.");
  }
  return target.href;
}

export async function startKakaoLink(accessToken: string): Promise<void> {
  const url = new URL("/auth/identity-links/kakao/start", publicConfig.authOrigin);
  url.searchParams.set("tenantCode", publicConfig.tenantCode);
  const response = await fetch(url.href, {
    method: "POST", mode: "cors", credentials: "include",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ returnTo: `${window.location.origin}/login` }),
  });
  if (!response.ok) throw new Error("카카오 연결을 시작하지 못했어요. 기존 계정으로 다시 로그인해 주세요.");
  const result = await response.json();
  if (typeof result.authorizationUrl !== "string") throw new Error("카카오 연결 주소를 확인할 수 없어요.");
  window.location.assign(validateKakaoAuthorizationUrl(result.authorizationUrl));
}

export async function continueKakaoLink(intendedSubject: string, verifiedSubject: string, accessToken: string): Promise<void> {
  if (!intendedSubject || intendedSubject !== verifiedSubject) {
    throw new Error("연결을 시작한 계정과 다른 계정으로 로그인했어요. 기존 계정으로 다시 시작해 주세요.");
  }
  await startKakaoLink(accessToken);
}
