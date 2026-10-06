import { graphql } from "@gaegaeting/ui-common";
import type { ExternalSignup } from "@gaegaeting/ui-common/interaction";

export type VerifiedSignupInput = {
  termsVersion: string; termsAgreed: boolean; name: string;
  birthDate: string; gender: "MALE" | "FEMALE"; phone: string;
};

export async function registerSocialSignup(endpoint: string, signup: ExternalSignup, input: VerifiedSignupInput) {
  if (Date.parse(signup.expiresAt) <= Date.now()) throw new Error("SOCIAL_SIGNUP_EXPIRED");
  const data = await graphql<{ registerSocialAccount: { authSubject: string } }>(endpoint,
    `mutation RegisterSocialAccount($input: RegisterSocialAccountInput!) {
      registerSocialAccount(input: $input) { authSubject }
    }`, { input: { ...input, ticket: signup.ticket, attemptId: signup.attemptId,
      ...(signup.clientId ? { clientId: signup.clientId } : {}) } });
  if (!data.registerSocialAccount?.authSubject) throw new Error("가입 결과를 확인하지 못했어요. 다시 시도해 주세요.");
  return data.registerSocialAccount;
}

export function socialSignupError(error: unknown): { message: string; recovery: "login" | "restart" | "retry" } {
  const message = error instanceof Error ? error.message : "가입 처리에 실패했어요. 다시 시도해 주세요.";
  if (/IDENTITY_ALREADY_REGISTERED|IDENTITY_CONFLICT|already registered|이미 가입|이미 등록/i.test(message)) {
    return { message: "이미 가입한 정보예요. 기존 계정으로 로그인한 뒤 내 정보에서 카카오 계정을 연결해 주세요.", recovery: "login" };
  }
  if (/SOCIAL_SIGNUP_EXPIRED|SOCIAL_SIGNUP_INVALID|만료|다시 시작/i.test(message)) {
    return { message: "카카오 인증이 만료됐거나 유효하지 않아요. 카카오 회원가입을 다시 시작해 주세요.", recovery: "restart" };
  }
  if (/SOCIAL_SIGNUP_UNAVAILABLE/.test(message)) {
    return { message: "지금은 카카오 가입을 완료할 수 없어요. 잠시 후 다시 시도해 주세요.", recovery: "retry" };
  }
  return { message, recovery: "retry" };
}
