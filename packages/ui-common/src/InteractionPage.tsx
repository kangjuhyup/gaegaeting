import { useEffect, useState, type FormEvent } from "react";
import { Alert, Button, Field, Spinner } from "./components/Ui.js";
import {
  goToAuth,
  goToIdp,
  interactionAvailable,
  InteractionExpiredError,
  interactionRequest,
  validateInteractionDetails,
  submitWebAuthn,
  type InteractionDetails,
  type InteractionResult,
} from "./lib/interaction.js";

import { publicConfig } from "./runtime-config.js";

type Step =
  | "loading"
  | "login"
  | "password-change"
  | "mfa"
  | "enroll"
  | "recovery"
  | "consent"
  | "error";

export function InteractionPage({ admin = false }: { admin?: boolean }) {
  const [step, setStep] = useState<Step>("loading");
  const [details, setDetails] = useState<InteractionDetails>();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [code, setCode] = useState("");
  const [methods, setMethods] = useState<string[]>([]);
  const [method, setMethod] = useState("totp");
  const [enrollment, setEnrollment] = useState<InteractionResult>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!interactionAvailable()) {
      setError(
        "로그인 세션이 없어요. 개개팅 로그인 화면에서 다시 시작해 주세요.",
      );
      setStep("error");
      return;
    }
    void interactionRequest<InteractionDetails>("details")
      .then((raw) => {
        const value = validateInteractionDetails(raw);
        setDetails(value);
        if (value.prompt === "login" || value.prompt === "consent")
          setStep(value.prompt);
        else throw new Error("지원하지 않는 인증 단계입니다.");
      })
      .catch((cause) => {
        setError(
          cause instanceof Error
            ? cause.message
            : "인증 정보를 불러올 수 없어요.",
        );
        setStep("error");
      });
  }, []);

  function advance(result: InteractionResult) {
    if (result.passwordChangeRequired) setStep("password-change");
    else if (result.mfaEnrollmentRequired) {
      setPassword("");
      setStep("enroll");
    } else if (result.mfaRequired) {
      setPassword("");
      const available = result.methods ?? [];
      if (!available.length)
        throw new Error(
          "사용 가능한 추가 인증 방법이 없어요. 다시 시작해 주세요.",
        );
      setMethods(available);
      setMethod(available.includes("totp") ? "totp" : (available[0] ?? "totp"));
      setStep("mfa");
    } else if (result.redirectTo) {
      setPassword("");
      goToAuth(result.redirectTo);
    } else throw new Error("인증 단계를 계속할 수 없어요.");
  }

  async function submit(
    event: FormEvent,
    path: string,
    body: object,
    onDone: (result: InteractionResult) => void,
  ) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      onDone(await interactionRequest<InteractionResult>(path, body));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "인증 처리에 실패했어요.",
      );
      if (cause instanceof InteractionExpiredError) setStep("error");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    try {
      const result = await interactionRequest<InteractionResult>("abort", {});
      if (result.redirectTo) goToAuth(result.redirectTo);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "취소할 수 없어요.");
      if (cause instanceof InteractionExpiredError) setStep("error");
      setBusy(false);
    }
  }

  async function beginEnrollment() {
    setBusy(true);
    try {
      setEnrollment(
        await interactionRequest<InteractionResult>("mfa/totp/enroll", {}),
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "인증 앱 등록에 실패했어요.",
      );
      if (cause instanceof InteractionExpiredError) setStep("error");
    } finally {
      setBusy(false);
    }
  }

  async function authenticateWebAuthn() {
    setBusy(true);
    setError("");
    try {
      const result = await submitWebAuthn();
      if (result.redirectTo) goToAuth(result.redirectTo);
      else throw new Error("인증 단계를 계속할 수 없어요.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "보안 키 인증에 실패했어요.",
      );
      if (cause instanceof InteractionExpiredError) setStep("error");
    } finally {
      setBusy(false);
    }
  }

  async function consent() {
    setBusy(true);
    setError("");
    try {
      const result = await interactionRequest<InteractionResult>("consent", {});
      if (result.redirectTo) goToAuth(result.redirectTo);
      else throw new Error("인증 단계를 계속할 수 없어요.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "동의에 실패했어요.");
      if (cause instanceof InteractionExpiredError) setStep("error");
      setBusy(false);
    }
  }

  return (
    <main className="interaction-screen">
      <div className="interaction-brand">
        <span className="brand__mark">♥</span>
        <strong>{admin ? "개개팅 관리자" : "개개팅"}</strong>
      </div>
      <section className="card form-card interaction-card" aria-busy={busy}>
        {step === "loading" && (
          <p role="status">
            <Spinner /> 로그인 정보를 불러오는 중이에요.
          </p>
        )}
        {step === "error" && (
          <>
            <h1>다시 시작해 주세요</h1>
            <Alert type="error">{error}</Alert>
            <a href={`${publicConfig.basePath}/login`}>로그인으로 돌아가기</a>
          </>
        )}
        {step === "login" && (
          <>
            <h1>{admin ? "관리자 로그인" : "다시 만나 반가워요"}</h1>
            <p>
              {admin
                ? "관리자 계정으로 로그인해 주세요."
                : "가입한 아이디로 로그인해 주세요."}
            </p>
            <form
              onSubmit={(event) =>
                void submit(event, "login", { username, password }, advance)
              }
            >
              <Field label="아이디">
                <input
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </Field>
              <Field label="비밀번호">
                <input
                  required
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </Field>
              {error && <Alert type="error">{error}</Alert>}
              <Button type="submit" disabled={busy}>
                {busy && <Spinner />} 로그인
              </Button>
            </form>
            {details?.idpList.map((idp) => (
              <Button
                key={idp.provider}
                variant="secondary"
                onClick={() => goToIdp(idp.provider)}
              >
                {idp.name}로 로그인
              </Button>
            ))}
            {!admin && <a href="/signup">처음 오셨나요? 회원가입</a>}
          </>
        )}
        {step === "password-change" && (
          <>
            <h1>비밀번호 변경</h1>
            <p>계속하려면 비밀번호를 변경해 주세요.</p>
            <form
              onSubmit={(event) =>
                void submit(
                  event,
                  "password-change",
                  { currentPassword: password, newPassword },
                  advance,
                )
              }
            >
              <Field label="새 비밀번호">
                <input
                  required
                  minLength={8}
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </Field>
              {error && <Alert type="error">{error}</Alert>}
              <Button type="submit" disabled={busy}>
                변경하고 계속
              </Button>
            </form>
          </>
        )}
        {step === "mfa" && (
          <>
            <h1>추가 인증</h1>
            <p>인증 앱 또는 복구 코드를 입력해 주세요.</p>
            <form
              onSubmit={(event) => {
                if (method !== "webauthn")
                  void submit(event, "mfa", { method, code }, (result) => {
                    if (result.redirectTo) goToAuth(result.redirectTo);
                  });
                else event.preventDefault();
              }}
            >
              <Field label="인증 방법">
                <select
                  value={method}
                  onChange={(event) => setMethod(event.target.value)}
                >
                  {methods.map((item) => (
                    <option key={item} value={item}>
                      {item === "totp"
                        ? "인증 앱"
                        : item === "webauthn"
                          ? "보안 키·생체인증"
                          : "복구 코드"}
                    </option>
                  ))}
                </select>
              </Field>
              {method !== "webauthn" && (
                <Field label="인증 코드">
                  <input
                    required
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                  />
                </Field>
              )}
              {error && <Alert type="error">{error}</Alert>}
              {method === "webauthn" ? (
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => void authenticateWebAuthn()}
                >
                  보안 키로 인증
                </Button>
              ) : (
                <Button type="submit" disabled={busy}>
                  인증하기
                </Button>
              )}
            </form>
          </>
        )}
        {step === "enroll" && (
          <>
            <h1>인증 앱 등록</h1>
            {!enrollment ? (
              <Button disabled={busy} onClick={() => void beginEnrollment()}>
                등록 시작
              </Button>
            ) : (
              <>
                <p>인증 앱에 아래 설정 키를 입력해 주세요.</p>
                <code className="interaction-secret">{enrollment.secret}</code>
                {enrollment.otpauthUrl && (
                  <p>
                    인증 앱에서 직접 등록할 수 있다면{" "}
                    <a href={enrollment.otpauthUrl}>인증 앱 열기</a>를
                    선택하세요.
                  </p>
                )}
                <form
                  onSubmit={(event) =>
                    void submit(
                      event,
                      "mfa/totp/confirm",
                      { code },
                      (result) => {
                        setEnrollment(undefined);
                        if (result.recoveryCodes?.length) {
                          setEnrollment(result);
                          setStep("recovery");
                        } else if (result.redirectTo)
                          goToAuth(result.redirectTo);
                      },
                    )
                  }
                >
                  <Field label="인증 코드">
                    <input
                      required
                      autoComplete="one-time-code"
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                    />
                  </Field>
                  {error && <Alert type="error">{error}</Alert>}
                  <Button type="submit" disabled={busy}>
                    등록 완료
                  </Button>
                </form>
              </>
            )}
          </>
        )}
        {step === "recovery" && (
          <>
            <h1>복구 코드 보관</h1>
            <p>한 번만 표시됩니다. 안전한 곳에 보관해 주세요.</p>
            <div className="interaction-secret">
              {enrollment?.recoveryCodes?.join(" · ")}
            </div>
            <Button
              onClick={() => {
                if (enrollment?.redirectTo) goToAuth(enrollment.redirectTo);
                else {
                  setError("인증을 계속할 수 없어요. 다시 시작해 주세요.");
                  setStep("error");
                }
              }}
            >
              보관했어요
            </Button>
          </>
        )}
        {step === "consent" && (
          <>
            <h1>권한 동의</h1>
            <p>개개팅 이용에 필요한 권한을 확인해 주세요.</p>
            <ul>
              {details?.missingScopes.map((scope) => (
                <li key={scope}>{scope}</li>
              ))}
            </ul>
            {error && <Alert type="error">{error}</Alert>}
            <Button disabled={busy} onClick={() => void consent()}>
              동의하고 계속
            </Button>
          </>
        )}
        {step !== "loading" && step !== "error" && (
          <button
            className="interaction-cancel"
            disabled={busy}
            onClick={() => void cancel()}
          >
            취소
          </button>
        )}
      </section>
    </main>
  );
}
