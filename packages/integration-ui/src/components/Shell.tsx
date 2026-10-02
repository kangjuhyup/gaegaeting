import type { ReactNode } from "react";

export type RouteKey =
  | "signup"
  | "login"
  | "profile"
  | "pet"
  | "recommendations"
  | "image-review";

const routes: Array<{ key: RouteKey; label: string; short: string }> = [
  { key: "signup", label: "회원가입", short: "01" },
  { key: "login", label: "로그인", short: "02" },
  { key: "profile", label: "내 프로필", short: "03" },
  { key: "pet", label: "내 펫", short: "04" },
  { key: "recommendations", label: "추천받기", short: "05" },
];

type Props = {
  route: RouteKey;
  onNavigate: (route: RouteKey) => void;
  connected: boolean;
  canReviewImages?: boolean;
  children: ReactNode;
};

export function Shell({ route, onNavigate, connected, canReviewImages, children }: Props) {
  const routeIndex = routes.findIndex((item) => item.key === route);
  return (
    <div className="app-shell">
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
        {canReviewImages && <button className="button button--ghost" onClick={() => onNavigate("image-review")}>사진 검토</button>}
        {connected && (
          <span className="connection connection--on">로그인됨</span>
        )}
      </header>

      <nav className="stepper" aria-label="가입 및 프로필 설정 단계">
        {routes.map((item, index) => (
          <button
            key={item.key}
            className={`${route === item.key ? "is-active" : ""} ${index < routeIndex ? "is-past" : ""}`}
            onClick={() => onNavigate(item.key)}
          >
            <span>{index < routeIndex ? "✓" : item.short}</span>
            <strong>{item.label}</strong>
          </button>
        ))}
      </nav>

      <main>{children}</main>
    </div>
  );
}
