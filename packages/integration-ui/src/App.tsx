import { ImageReviewPage } from './pages/ImageReviewPage.js';
import { publicConfig } from './runtime-config.js';
import { useEffect, useMemo, useRef, useState } from "react";
import { Shell, type RouteKey } from "./components/Shell.js";
import { completeLogin } from "./lib/oidc.js";
import { graphql, errorMessage } from "./lib/api.js";
import { SignupPage } from "./pages/SignupPage.js";
import { LoginPage } from "./pages/LoginPage.js";
import { ProfilePage } from "./pages/ProfilePage.js";
import { PetPage } from "./pages/PetPage.js";
import { RecommendationsPage } from "./pages/RecommendationsPage.js";
import type { AppConfig } from "./types.js";

const defaultConfig: AppConfig = {
  issuer: publicConfig.issuer,
  clientId: publicConfig.clientId,
  gatewayUrl: publicConfig.gatewayUrl,
  accountUrl: publicConfig.accountUrl,
  redirectUri: `${window.location.origin}/login`,
};

function readRoute(): RouteKey {
  const value = window.location.pathname.replace(/^\//, "") as RouteKey;
  return ["signup", "login", "profile", "pet", "recommendations", "image-review"].includes(
    value,
  )
    ? value
    : "login";
}

export default function App() {
  const [route, setRoute] = useState<RouteKey>(readRoute);
  const config = defaultConfig;
  const [canReviewImages, setCanReviewImages] = useState(false);
  const [token, setToken] = useState<string>();
  const [callbackError, setCallbackError] = useState("");
  const callbackStarted = useRef(false);
  const callbackPending = useMemo(
    () =>
      new URLSearchParams(window.location.search).has("code") ||
      new URLSearchParams(window.location.search).has("error"),
    [],
  );
  function navigate(next: RouteKey) {
    window.history.pushState({}, "", `/${next}`);
    setRoute(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  useEffect(() => {
    const listener = () => setRoute(readRoute());
    window.addEventListener("popstate", listener);
    return () => window.removeEventListener("popstate", listener);
  }, []);
  useEffect(() => {
    if (!callbackPending || callbackStarted.current) return;
    callbackStarted.current = true;
    void completeLogin(config)
      .then(({ accessToken }) => {
        setToken(accessToken);
        window.history.replaceState({}, "", "/login");
        setRoute("login");
      })
      .catch((cause) => setCallbackError(errorMessage(cause)));
  }, [callbackPending, config]);
  useEffect(() => {
    let cancelled = false;
    setCanReviewImages(false);
    if (token) void graphql<{ canReviewProfileImages: boolean }>(config.gatewayUrl,
      'query CanReviewProfileImages { canReviewProfileImages }', {}, token)
      .then(data => { if (!cancelled) setCanReviewImages(data.canReviewProfileImages); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [config.gatewayUrl, token]);
  const page = {
    "image-review": <ImageReviewPage config={config} token={token} allowed={canReviewImages} />,
    signup: (
      <SignupPage
        config={config}
        onLogin={() => navigate("login")}
      />
    ),
    login: (
      <LoginPage
        config={config}
        connected={Boolean(token)}
        onNext={() => navigate("profile")}
      />
    ),
    profile: (
      <ProfilePage
        config={config}
        token={token}
        onNext={() => navigate("pet")}
      />
    ),
    pet: (
      <PetPage
        config={config}
        token={token}
        onNext={() => navigate("recommendations")}
      />
    ),
    recommendations: <RecommendationsPage config={config} token={token} />,
  }[route];
  return (
    <Shell route={route} onNavigate={navigate} connected={Boolean(token)} canReviewImages={canReviewImages}>
      {callbackError && (
        <div className="global-error" role="alert">
          로그인 처리 실패: {callbackError}
        </div>
      )}
      {page}
    </Shell>
  );
}
