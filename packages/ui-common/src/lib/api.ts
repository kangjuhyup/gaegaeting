import type { ApiResult } from "../types.js";

export async function graphql<T>(
  endpoint: string,
  query: string,
  variables: Record<string, unknown>,
  accessToken?: string,
): Promise<T> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });

  const text = await response.text();
  let body: ApiResult<T>;
  try {
    body = JSON.parse(text) as ApiResult<T>;
  } catch {
    throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
  }

  if (!response.ok || body.errors?.length) {
    throw new Error(
      body.errors?.map((error) => error.message).join("\n") ||
        `HTTP ${response.status}`,
    );
  }
  if (!body.data) throw new Error("응답에 data가 없습니다.");
  return body.data;
}

export function errorMessage(error: unknown): string {
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    return "서버에 연결할 수 없습니다. 주소, 서버 실행 여부, CORS 설정을 확인해 주세요.";
  }
  if (
    error instanceof Error &&
    (error.message.includes("유효한 내부 인증 정보가 없습니다") ||
      error.message.includes("HTTP 401"))
  ) {
    return "로그인이 만료되었습니다. 다시 로그인해 주세요.";
  }
  return error instanceof Error
    ? error.message
    : "알 수 없는 오류가 발생했습니다.";
}
