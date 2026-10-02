import { Alert, Button, Spinner, publicConfig } from "@gaegaeting/ui-common";
import { useEffect, useMemo, useRef, useState } from "react";
import { Shell, type RouteKey } from "./components/Shell.js";
import { beginLogout, completeLogin } from "@gaegaeting/ui-common";
import { errorMessage } from "@gaegaeting/ui-common";
import { SignupPage } from "./pages/SignupPage.js";
import { LoginPage } from "./pages/LoginPage.js";
import { ProfilePage } from "./pages/ProfilePage.js";
import { PetPage } from "./pages/PetPage.js";
import { RecommendationsPage } from "./pages/RecommendationsPage.js";
import { SocialPreview } from "./pages/SocialPreview.js";
import { StoryboardPage } from "./pages/StoryboardPage.js";
import {
  loadOnboarding,
  onboardingRoute,
  type OnboardingStep,
} from "./lib/onboarding.js";
import type { AppConfig } from "./types.js";

const defaultConfig: AppConfig = {
  issuer: publicConfig.issuer,
  clientId: publicConfig.clientId,
  gatewayUrl: publicConfig.gatewayUrl,
  accountUrl: publicConfig.accountUrl,
  redirectUri: `${window.location.origin}/login`,
  postLogoutRedirectUri: `${window.location.origin}/`,
};

function readRoute(): RouteKey {
  const value = window.location.pathname.split("/")[1] as RouteKey;
  return [
    "signup",
    "login",
    "profile",
    "pet",
    "recommendations",
    "likes",
    "chats",
    "storyboard",
  ].includes(value)
    ? value
    : "login";
}

export default function App() {
  const [route, setRoute] = useState<RouteKey>(readRoute);
  const [roomId, setRoomId] = useState<string | undefined>(
    () => window.location.pathname.split("/")[2],
  );
  const config = defaultConfig;
  const [session, setSession] = useState<{
    accessToken: string;
    idToken: string;
  }>();
  const token = session?.accessToken;
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [onboarding, setOnboarding] = useState<OnboardingStep>();
  const [onboardingError, setOnboardingError] = useState("");
  const [onboardingAttempt, setOnboardingAttempt] = useState(0);
  const [callbackError, setCallbackError] = useState("");
  const callbackStarted = useRef(false);
  const callbackPending = useMemo(
    () =>
      new URLSearchParams(window.location.search).has("code") ||
      new URLSearchParams(window.location.search).has("error"),
    [],
  );
  function navigate(next: RouteKey, nextRoomId?: string, step = onboarding) {
    next = onboardingRoute(next, Boolean(token), step);
    window.history.pushState(
      {},
      "",
      `/${next}${nextRoomId ? `/${encodeURIComponent(nextRoomId)}` : ""}`,
    );
    setRoute(next);
    setRoomId(nextRoomId);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  async function logout() {
    if (!session || loggingOut) return;
    setLoggingOut(true);
    setSession(undefined);
    setOnboarding(undefined);
    setOnboardingError("");
    setCallbackError("");
    setLogoutError("");
    setRoomId(undefined);
    window.history.replaceState({}, "", "/login");
    setRoute("login");
    window.scrollTo({ top: 0 });
    try {
      await beginLogout(config, session);
    } catch (cause) {
      setLogoutError(errorMessage(cause));
      setLoggingOut(false);
    }
  }
  useEffect(() => {
    const listener = () => {
      setRoute(readRoute());
      setRoomId(window.location.pathname.split("/")[2]);
    };
    window.addEventListener("popstate", listener);
    return () => window.removeEventListener("popstate", listener);
  }, []);
  useEffect(() => {
    document
      .querySelector<HTMLElement>("main h1")
      ?.focus({ preventScroll: true });
  }, [route, roomId]);
  useEffect(() => {
    if (!callbackPending || callbackStarted.current) return;
    callbackStarted.current = true;
    void completeLogin(config)
      .then(({ accessToken, idToken }) => {
        setSession({ accessToken, idToken });
        window.history.replaceState({}, "", "/login");
        setRoute("login");
      })
      .catch((cause) => setCallbackError(errorMessage(cause)));
  }, [callbackPending, config]);
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setOnboarding(undefined);
    setOnboardingError("");
    void loadOnboarding(config.gatewayUrl, token)
      .then((step) => {
        if (cancelled) return;
        setOnboarding(step);
      })
      .catch((cause) => {
        if (!cancelled) setOnboardingError(errorMessage(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [token, config.gatewayUrl, onboardingAttempt]);
  const currentRoute = onboardingRoute(route, Boolean(token), onboarding);
  useEffect(() => {
    if (currentRoute === route || (token && !onboarding)) return;
    window.history.replaceState({}, "", `/${currentRoute}`);
    setRoute(currentRoute);
    setRoomId(undefined);
  }, [currentRoute, route, token, onboarding]);
  const socialPage = (
    <SocialPreview
      route={currentRoute === "likes" ? "likes" : "chats"}
      roomId={roomId}
      onOpenChat={(id) => navigate("chats", id)}
      onChats={() => navigate("chats")}
      onLikes={() => navigate("likes")}
      onRecommendations={() => navigate("recommendations")}
    />
  );
  const page = {
    signup: <SignupPage config={config} onLogin={() => navigate("login")} />,
    login: (
      <LoginPage
        config={config}
        connected={Boolean(token)}
        loggingOut={loggingOut}
        onNext={() => navigate("profile")}
        onSignup={() => navigate("signup")}
      />
    ),
    profile: (
      <ProfilePage
        config={config}
        token={token}
        onNext={() => {
          if (onboarding === "ready") {
            navigate("pet");
            return;
          }
          // Recheck saved registrations so an existing pet is never registered again.
          setOnboarding(undefined);
          setOnboardingError("");
          setOnboardingAttempt((value) => value + 1);
          window.history.replaceState({}, "", "/login");
          setRoute("login");
          setRoomId(undefined);
        }}
      />
    ),
    pet: (
      <PetPage
        config={config}
        token={token}
        onNext={() => {
          setOnboarding("ready");
          navigate("recommendations", undefined, "ready");
        }}
      />
    ),
    recommendations: <RecommendationsPage config={config} token={token} />,
    likes: socialPage,
    chats: socialPage,
    storyboard: <StoryboardPage />,
  }[currentRoute];
  if (currentRoute === "storyboard") return <StoryboardPage />;
  return (
    <Shell
      route={currentRoute}
      onNavigate={navigate}
      connected={Boolean(token)}
      onboardingComplete={onboarding === "ready"}
      loggingOut={loggingOut}
      onLogout={() => void logout()}
    >
      {callbackError && (
        <div className="global-error" role="alert">
          로그인 처리 실패: {callbackError}
        </div>
      )}
      {loggingOut && (
        <div className="global-status" role="status">
          로그아웃 처리 중입니다.
        </div>
      )}
      {logoutError && (
        <div className="global-error" role="alert">
          이 기기에서는 로그아웃했지만 인증 서버 로그아웃에 실패했습니다:{" "}
          {logoutError}
        </div>
      )}
      {token && !onboarding ? (
        <section className="page card onboarding-status" aria-live="polite">
          {onboardingError ? (
            <>
              <Alert type="error">
                등록 상태를 확인하지 못했어요. {onboardingError}
              </Alert>
              <Button
                onClick={() => setOnboardingAttempt((value) => value + 1)}
              >
                다시 확인하기
              </Button>
            </>
          ) : (
            <p>
              <Spinner /> 내 정보와 반려견 등록 상태를 확인하고 있어요.
            </p>
          )}
        </section>
      ) : (
        page
      )}
    </Shell>
  );
}
