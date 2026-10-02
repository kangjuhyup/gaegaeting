import { useState } from "react";
import type { AppConfig } from "../types.js";
import { beginLogin } from "../lib/oidc.js";
import { errorMessage } from "../lib/api.js";
import { Alert, Button, PageTitle, Spinner } from "../components/Ui.js";

export function LoginPage({
  config,
  connected,
  onNext,
}: {
  config: AppConfig;
  connected: boolean;
  onNext: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function login(admin = false) {
    setLoading(true);
    setError("");
    try {
      await beginLogin(config, admin);
    } catch (cause) {
      setError(errorMessage(cause));
      setLoading(false);
    }
  }
  return (
    <section className="page two-column login-page">
      <div className="page-copy">
        <PageTitle
          eyebrow="로그인"
          title={
            <>
              오늘의 산책,
              <br />
              <em>좋은 인연</em>이 기다려요.
            </>
          }
          description="가입한 아이디로 로그인하고 산책 친구를 만나보세요."
        />
        <div className="dog-scene" aria-hidden="true">
          <span className="sun">✦</span>
          <span className="dog">🐕</span>
          <span className="person">🚶</span>
          <i />
          <i />
          <i />
        </div>
      </div>
      <div className="card form-card login-card">
        <div className="card__title">
          <span className="round-icon">♥</span>
          <div>
            <h2>{connected ? "연결되었어요!" : "다시 만나 반가워요"}</h2>
            <p>
              {connected
                ? "프로필을 등록할 준비가 됐어요."
                : "로그인 화면으로 이동합니다."}
            </p>
          </div>
        </div>
        {error && <Alert type="error">{error}</Alert>}
        {connected ? (
          <Button onClick={onNext}>내 프로필 등록하기 →</Button>
        ) : (
          <>
            <Button onClick={() => login()} disabled={loading}>
              {loading && <Spinner />} 로그인
            </Button>
            <Button variant="secondary" onClick={() => login(true)} disabled={loading}>관리자로 로그인</Button>
          </>
        )}
      </div>
    </section>
  );
}
