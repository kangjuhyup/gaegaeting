import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Spinner,
  beginLogin,
  completeLogin,
  errorMessage,
  graphql,
  publicConfig,
  type AppConfig,
} from "@gaegaeting/ui-common";
import { ImageReviewPage } from "./pages/ImageReviewPage.js";

const config: AppConfig = {
  issuer: publicConfig.issuer,
  clientId: publicConfig.clientId,
  gatewayUrl: publicConfig.gatewayUrl,
  accountUrl: publicConfig.accountUrl,
  redirectUri: `${window.location.origin}/admin/login`,
};

export default function App() {
  const [token, setToken] = useState<string>();
  const [access, setAccess] = useState<"checking" | "allowed" | "denied">(
    "denied",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [expiresIn, setExpiresIn] = useState<number>();
  const callbackStarted = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (
      callbackStarted.current ||
      (!params.has("code") && !params.has("error"))
    )
      return;
    callbackStarted.current = true;
    setBusy(true);
    void completeLogin(config)
      .then((result) => {
        setAccess("checking");
        setToken(result.accessToken);
        setExpiresIn(result.expiresIn);
        window.history.replaceState({}, "", "/admin");
      })
      .catch((cause) => setError(errorMessage(cause)))
      .finally(() => setBusy(false));
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void graphql<{ canReviewProfileImages: boolean }>(
      config.gatewayUrl,
      "query CanReviewProfileImages { canReviewProfileImages }",
      {},
      token,
    )
      .then((result) => {
        if (!cancelled)
          setAccess(result.canReviewProfileImages ? "allowed" : "denied");
      })
      .catch((cause) => {
        if (!cancelled) {
          setAccess("denied");
          setError(errorMessage(cause));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token || !expiresIn) return;
    const timer = window.setTimeout(() => {
      setToken(undefined);
      setAccess("denied");
      setError("로그인이 만료되었습니다. 다시 로그인해 주세요.");
    }, expiresIn * 1000);
    return () => window.clearTimeout(timer);
  }, [token, expiresIn]);

  async function login() {
    setToken(undefined);
    setAccess("denied");
    setError("");
    setBusy(true);
    try {
      await beginLogin(config, {
        scopes: "openid profile email tenant_roles account:read account:write",
        prompt: "login",
      });
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <a className="admin-brand" href="/admin">
          개개팅 <span>관리자</span>
        </a>
        <div className="admin-header-actions">
          <a href="/">사용자 화면</a>
          {token && (
            <Button
              variant="ghost"
              onClick={() => void login()}
              disabled={busy}
            >
              계정 전환
            </Button>
          )}
        </div>
      </header>
      <main>
        {error && <Alert type="error">{error}</Alert>}
        {access === "checking" ? (
          <p role="status">
            <Spinner /> 관리자 권한을 확인하고 있습니다.
          </p>
        ) : token && access === "allowed" ? (
          <ImageReviewPage config={config} token={token} allowed />
        ) : (
          <section className="admin-login card">
            <span className="eyebrow">관리자</span>
            <h1>사진 검토</h1>
            <p>사용자와 반려견 사진을 확인하고 공개 여부를 결정합니다.</p>
            {token && (
              <Alert type="info">
                이 계정에는 관리자 권한이 없습니다. 관리자 계정으로 다시
                로그인해 주세요.
              </Alert>
            )}
            <Button onClick={() => void login()} disabled={busy}>
              {busy && <Spinner />}관리자 로그인
            </Button>
          </section>
        )}
      </main>
    </div>
  );
}
