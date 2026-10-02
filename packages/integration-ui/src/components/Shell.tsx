import type { ReactNode } from "react";
import { Button, Spinner } from "@gaegaeting/ui-common";

export type RouteKey =
  | "signup"
  | "login"
  | "profile"
  | "pet"
  | "recommendations"
  | "likes"
  | "chats"
  | "storyboard";

const routes: Array<{ key: RouteKey; label: string; short: string }> = [
  { key: "signup", label: "회원가입", short: "01" },
  { key: "login", label: "로그인", short: "02" },
  { key: "profile", label: "내 정보 입력", short: "03" },
  { key: "pet", label: "내 펫 등록", short: "04" },
];

const mainRoutes: Array<{ key: RouteKey; label: string; icon: string }> = [
  { key: "recommendations", label: "추천", icon: "🐾" },
  { key: "likes", label: "보낸 관심", icon: "♡" },
  { key: "chats", label: "채팅", icon: "💬" },
  { key: "profile", label: "내 정보", icon: "○" },
];

type Props = {
  route: RouteKey;
  onNavigate: (route: RouteKey) => void;
  connected: boolean;
  onboardingComplete?: boolean;
  loggingOut?: boolean;
  onLogout?: () => void;
  children: ReactNode;
};

export function Shell({
  route,
  onNavigate,
  connected,
  onboardingComplete = false,
  loggingOut = false,
  onLogout,
  children,
}: Props) {
  const routeIndex = routes.findIndex((item) => item.key === route);
  const showMainNav = connected && onboardingComplete && route !== "storyboard";
  return (
    <div className={`app-shell ${showMainNav ? "app-shell--main" : ""}`}>
      <header className="topbar">
        <button
          className="brand"
          onClick={() => onNavigate("login")}
          aria-label="개개팅 홈"
        >
          <span className="brand__mark">
            <span>♥</span>
          </span>
          <span>
            <strong>개개팅</strong>
            <small>산책으로 시작하는 만남</small>
          </span>
        </button>
        {(connected || loggingOut) && (
          <div className="topbar__actions">
            {connected && (
              <span className="connection connection--on">로그인됨</span>
            )}
            {onLogout && (
              <Button
                type="button"
                variant="ghost"
                onClick={onLogout}
                disabled={loggingOut}
              >
                {loggingOut && <Spinner />}
                {loggingOut ? "로그아웃 중…" : "로그아웃"}
              </Button>
            )}
          </div>
        )}
      </header>

      {showMainNav ? (
        <nav className="main-nav" aria-label="주요 메뉴">
          {mainRoutes.map((item) => (
            <button
              type="button"
              key={item.key}
              aria-current={
                route === item.key ||
                (route === "pet" && item.key === "profile")
                  ? "page"
                  : undefined
              }
              onClick={() => onNavigate(item.key)}
            >
              <span aria-hidden="true">{item.icon}</span>
              <strong>{item.label}</strong>
            </button>
          ))}
        </nav>
      ) : (
        route !== "storyboard" &&
        (route !== "login" || connected) && (
          <nav className="stepper" aria-label="가입 및 프로필 설정 단계">
            {routes.map((item, index) => (
              <button
                key={item.key}
                className={`${route === item.key ? "is-active" : ""} ${index < routeIndex ? "is-past" : ""}`}
                disabled={index > routeIndex || (connected && index < 2)}
                aria-current={route === item.key ? "step" : undefined}
                onClick={() => onNavigate(item.key)}
              >
                <span>{index < routeIndex ? "✓" : item.short}</span>
                <strong>{item.label}</strong>
              </button>
            ))}
          </nav>
        )
      )}

      <main>{children}</main>
      {showMainNav && (route === "profile" || route === "pet") && (
        <nav className="profile-subnav" aria-label="프로필 설정">
          <button onClick={() => onNavigate("pet")}>내 강아지 관리</button>
        </nav>
      )}
    </div>
  );
}
