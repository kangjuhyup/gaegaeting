import { useEffect, useState, type FormEvent } from "react";
import { Button, Field } from "@gaegaeting/ui-common";
import { Shell, type RouteKey } from "../components/Shell.js";
import { RecommendationCard } from "../components/RecommendationCard.js";
import { SocialPreview } from "./SocialPreview.js";
import { onboardingRoute } from "../lib/onboarding.js";

type Scenario = "new" | "returning" | "pet";

const stages: Array<{ route: RouteKey; title: string }> = [
  { route: "signup", title: "회원가입" },
  { route: "login", title: "로그인" },
  { route: "profile", title: "내 정보 입력" },
  { route: "pet", title: "내 펫 등록" },
  { route: "recommendations", title: "메인 · 추천" },
  { route: "likes", title: "보낸 관심" },
  { route: "chats", title: "채팅 목록·채팅창" },
];

export function StoryboardPage() {
  useEffect(() => {
    const previous = document.title;
    document.title = "전체 스토리보드 · 개개팅";
    return () => {
      document.title = previous;
    };
  }, []);
  const [route, setRoute] = useState<RouteKey>("signup");
  const [scenario, setScenario] = useState<Scenario>("new");
  const [main, setMain] = useState(false);
  const [roomId, setRoomId] = useState<string>();
  const [reaction, setReaction] = useState<"LIKE" | "PASS">();
  const [nickname, setNickname] = useState("산책친구");
  const [petName, setPetName] = useState("몽이");
  const [profilePhoto, setProfilePhoto] = useState(false);
  const [petPhoto, setPetPhoto] = useState(false);
  const [location, setLocation] = useState(false);
  const loginDestination = onboardingRoute(
    "login",
    true,
    scenario === "returning" ? "ready" : scenario === "pet" ? "pet" : "profile",
  );
  function selectScenario(next: Scenario) {
    setScenario(next);
    setMain(false);
    open(next === "new" ? "signup" : "login");
  }
  function open(next: RouteKey, room?: string) {
    setRoute(next);
    setRoomId(room);
  }
  function selectStage(next: RouteKey) {
    if (next === "signup") setScenario("new");
    setMain(
      ["recommendations", "likes", "chats"].includes(next) ||
        (scenario === "returning" && (next === "profile" || next === "pet")),
    );
    open(next);
  }
  function submit(event: FormEvent, next: RouteKey) {
    event.preventDefault();
    if (next === "recommendations") {
      setMain(true);
      setScenario("returning");
    }
    open(next);
  }
  const social = (
    <SocialPreview
      route={route === "likes" ? "likes" : "chats"}
      roomId={roomId}
      onOpenChat={(id) => open("chats", id)}
      onChats={() => open("chats")}
      onLikes={() => open("likes")}
      onRecommendations={() => open("recommendations")}
    />
  );
  return (
    <div className="storyboard">
      <header className="storyboard-header">
        <span className="eyebrow">전체 스토리보드</span>
        <h1>가입부터 첫 산책 친구까지</h1>
        <p>
          샘플 화면입니다. 입력·사진·관심·대화는 실제 계정이나 서버에 저장되지
          않아요.
        </p>
        <nav className="storyboard-stages" aria-label="가입 상태별 흐름 선택">
          {(
            [
              ["new", "첫 가입·등록"],
              ["returning", "등록 완료·재로그인"],
              ["pet", "펫만 미등록"],
            ] as const
          ).map(([value, label]) => (
            <button
              type="button"
              key={value}
              aria-pressed={scenario === value}
              onClick={() => selectScenario(value)}
            >
              {label}
            </button>
          ))}
        </nav>
        <p aria-live="polite">
          {scenario === "returning"
            ? "프로필·펫 등록 완료: 로그인 → 메인"
            : scenario === "pet"
              ? "프로필 등록 완료, 펫 없음: 로그인 → 내 펫 등록 → 메인"
              : "최초 등록: 회원가입 → 로그인 → 내 정보 입력 → 내 펫 등록 → 메인"}
        </p>
        <nav className="storyboard-stages" aria-label="스토리보드 장면 선택">
          {stages.map((stage, index) => (
            <button
              type="button"
              key={stage.route}
              aria-pressed={route === stage.route}
              onClick={() => selectStage(stage.route)}
            >
              <span>{index + 1}</span>
              {stage.title}
            </button>
          ))}
        </nav>
      </header>
      <div className="storyboard-device">
        <Shell
          route={route}
          connected={!["signup", "login"].includes(route)}
          onboardingComplete={main}
          onNavigate={(next) =>
            open(next === "login" && main ? "recommendations" : next)
          }
        >
          {route === "signup" && (
            <form
              className="page card form-card"
              onSubmit={(event) => submit(event, "login")}
            >
              <span className="eyebrow">회원가입</span>
              <h2>반가워요! 기본 정보를 알려주세요.</h2>
              <Field label="아이디">
                <input placeholder="사용할 아이디" autoComplete="off" />
              </Field>
              <Field label="비밀번호">
                <input
                  type="password"
                  placeholder="8자 이상"
                  autoComplete="off"
                />
              </Field>
              <Field label="이메일">
                <input type="email" placeholder="이메일" autoComplete="off" />
              </Field>
              <Field label="이름">
                <input placeholder="이름" autoComplete="off" />
              </Field>
              <Field label="휴대전화 번호">
                <input
                  type="tel"
                  placeholder="010-0000-0000"
                  autoComplete="off"
                />
              </Field>
              <Field label="생년월일">
                <input type="date" />
              </Field>
              <Field label="성별">
                <select>
                  <option>여성</option>
                  <option>남성</option>
                </select>
              </Field>
              <label className="check">
                <input type="checkbox" defaultChecked /> 서비스 이용약관 동의
              </label>
              <Button>회원가입 완료 → 로그인</Button>
            </form>
          )}
          {route === "login" && (
            <form
              className="page card form-card"
              onSubmit={(event) => submit(event, loginDestination)}
            >
              <span className="eyebrow">로그인</span>
              <h2>오늘의 산책, 좋은 인연이 기다려요.</h2>
              <p>가입한 아이디로 로그인해 주세요.</p>
              <Field label="아이디">
                <input placeholder="아이디" autoComplete="off" />
              </Field>
              <Field label="비밀번호">
                <input
                  type="password"
                  placeholder="비밀번호"
                  autoComplete="off"
                />
              </Field>
              <Button>
                로그인 →{" "}
                {loginDestination === "recommendations"
                  ? "메인"
                  : loginDestination === "pet"
                    ? "내 펫 등록"
                    : "내 정보 입력"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => selectStage("signup")}
              >
                처음 오셨나요? 회원가입
              </Button>
            </form>
          )}
          {route === "profile" && (
            <form
              className="page card form-card"
              onSubmit={(event) => submit(event, "pet")}
            >
              <span className="eyebrow">내 정보 입력</span>
              <h2>
                {main
                  ? "내 정보를 확인해요."
                  : "나를 보여줄 프로필을 완성해요."}
              </h2>
              <Field label="닉네임">
                <input
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  maxLength={50}
                />
              </Field>
              <Field label="활동 지역">
                <select>
                  <option>서울</option>
                  <option>경기</option>
                  <option>인천</option>
                </select>
              </Field>
              <Field label="한 줄 소개">
                <textarea
                  defaultValue="강아지와 함께 걷는 시간을 좋아해요."
                  rows={3}
                  maxLength={120}
                />
              </Field>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setProfilePhoto(!profilePhoto)}
              >
                {profilePhoto
                  ? "사진 선택됨 · 검수 대기"
                  : "프로필 사진 추가 (선택)"}
              </Button>
              <p className="storyboard-note">
                가입 때 받은 이름·휴대전화·생년월일은 다시 입력하지 않아요.
                사진은 관리자 승인 후 공개돼요.
              </p>
              <Button>내 정보 저장 → 내 펫 등록</Button>
            </form>
          )}
          {route === "pet" && (
            <form
              className="page card form-card"
              onSubmit={(event) => submit(event, "recommendations")}
            >
              <span className="eyebrow">내 펫 등록</span>
              <h2>산책 메이트를 소개해 주세요.</h2>
              <Field label="이름">
                <input
                  value={petName}
                  onChange={(event) => setPetName(event.target.value)}
                />
              </Field>
              <Field label="나이">
                <input type="number" min={0} max={30} defaultValue={3} />
              </Field>
              <Field label="견종">
                <select>
                  <option>푸들</option>
                  <option>말티즈</option>
                  <option>믹스</option>
                </select>
              </Field>
              <Field label="크기">
                <select>
                  <option>소형</option>
                  <option>중형</option>
                  <option>대형</option>
                </select>
              </Field>
              <Field label="성별">
                <select>
                  <option>남아</option>
                  <option>여아</option>
                </select>
              </Field>
              <Field label="성격">
                <select>
                  <option>사교적 · 활발함</option>
                  <option>차분함</option>
                </select>
              </Field>
              <Field label="소개">
                <textarea
                  defaultValue="공놀이와 친구 만나기를 좋아해요!"
                  rows={2}
                />
              </Field>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPetPhoto(!petPhoto)}
              >
                {petPhoto
                  ? "사진 선택됨 · 검수 대기"
                  : "반려견 사진 추가 (선택)"}
              </Button>
              <Button>펫 등록 완료 → 메인으로</Button>
            </form>
          )}
          {route === "recommendations" && (
            <section className="page">
              <span className="eyebrow">오늘의 추천</span>
              <h2>{nickname}님, 함께 걸어볼까요?</h2>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setLocation(true)}
              >
                {location
                  ? "샘플 위치 확인 완료 · 서울"
                  : "내 위치 확인하고 추천받기"}
              </Button>
              <p className="storyboard-note">
                실제 추천은 위치 허용 후 표시돼요. 아래는 예시 카드예요.
              </p>
              <RecommendationCard
                item={{
                  id: "story",
                  targetUserId: "sample",
                  state: "DELIVERY",
                  showAt: "2026-10-02T00:00:00Z",
                  actionAt: "",
                }}
                index={0}
                detailsLoading={false}
                detailsFailed={false}
                acted={reaction}
                onAction={setReaction}
                details={{
                  nickname: "종로산책친구",
                  pets: [
                    {
                      id: 1,
                      name: "초코",
                      age: 3,
                      breed: "POODLE",
                      gender: "FEMALE",
                      size: "SMALL",
                      personalities: ["FRIENDLY"],
                      description: "새로운 산책 친구를 기다려요.",
                      isCertificated: false,
                      profileImages: [],
                    },
                  ],
                }}
              />
            </section>
          )}
          {(route === "likes" || route === "chats") && social}
        </Shell>
      </div>
    </div>
  );
}
