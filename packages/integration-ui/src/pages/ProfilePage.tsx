import { useEffect, useState, type FormEvent } from "react";
import { Alert, Button, Field, PageTitle, Spinner } from "../components/Ui.js";
import { errorMessage, graphql } from "../lib/api.js";
import type { AppConfig, SignupDraft, UserProfile } from "../types.js";

const regions = [
  ["SEOUL", "서울"],
  ["GYEONGGI", "경기"],
  ["INCHEON", "인천"],
  ["GANGWON", "강원"],
  ["CHUNGCHEONG", "충청"],
  ["JEOLLA", "전라"],
  ["GYEONGSANG", "경상"],
  ["JEJU", "제주"],
];

export function ProfilePage({
  config,
  token,
  signupDraft,
  onNext,
}: {
  config: AppConfig;
  token?: string;
  signupDraft?: SignupDraft;
  onNext: () => void;
}) {
  const [form, setForm] = useState({
    name: signupDraft?.name ?? "김개팅",
    nickname: "산책러",
    gender: signupDraft?.gender ?? "FEMALE",
    birthDate: signupDraft?.birthDate ?? "1996-05-14",
    region: "SEOUL",
    bio: "저녁 산책과 새로운 카페를 좋아해요.",
  });
  const [existing, setExisting] = useState<UserProfile | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;
    graphql<{ myProfile: UserProfile }>(
      config.gatewayUrl,
      `
        query MyProfile {
          myProfile {
            id
            name
            nickname
            gender
            birthDate
            region
            bio
            profileImages
          }
        }
      `,
      {},
      token,
    )
      .then((data) => {
        setExisting(data.myProfile);
        setForm({
          name: data.myProfile.name,
          nickname: data.myProfile.nickname,
          gender: data.myProfile.gender,
          birthDate: data.myProfile.birthDate.slice(0, 10),
          region: data.myProfile.region,
          bio: data.myProfile.bio || "",
        });
      })
      .catch(() => undefined);
  }, [config.gatewayUrl, token]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!token) {
      setState("error");
      setMessage("로그인 후 이용해 주세요.");
      return;
    }
    setState("loading");
    setMessage("");
    try {
      const input = {
        ...form,
        birthDate: new Date(`${form.birthDate}T00:00:00.000Z`).toISOString(),
      };
      const data = await graphql<{ createProfile: UserProfile }>(
        config.gatewayUrl,
        `
          mutation CreateProfile($input: CreateUserProfileInput!) {
            createProfile(input: $input) {
              id
              name
              nickname
              gender
              birthDate
              region
              bio
              profileImages
            }
          }
        `,
        { input },
        token,
      );
      setExisting(data.createProfile);
      setState("success");
      setMessage(`${data.createProfile.nickname}님의 프로필이 등록됐어요.`);
    } catch (cause) {
      setState("error");
      setMessage(errorMessage(cause));
    }
  }

  return (
    <section className="page profile-layout">
      <div className="profile-preview">
        <span className="eyebrow">미리보기</span>
        <div className="avatar">
          <span>{form.nickname.slice(0, 1) || "?"}</span>
          <i>✦</i>
        </div>
        <h2>{form.nickname || "닉네임"}</h2>
        <p>
          {regions.find(([key]) => key === form.region)?.[1]} ·{" "}
          {form.birthDate
            ? new Date().getFullYear() - Number(form.birthDate.slice(0, 4))
            : "--"}
          세
        </p>
        <blockquote>
          “{form.bio || "나를 소개하는 한 줄을 적어주세요."}”
        </blockquote>
        {existing && (
          <span className="verified-chip">✓ 서버 프로필 연결됨</span>
        )}
      </div>
      <form className="card form-card wide-card" onSubmit={submit}>
        <PageTitle
          eyebrow="내 프로필"
          title={
            <>
              나를 보여줄
              <br />
              <em>프로필</em>을 완성해요.
            </>
          }
          description="나를 소개할 정보를 입력해 주세요."
        />
        <div className="form-row">
          <Field label="이름">
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="닉네임">
            <input
              required
              value={form.nickname}
              onChange={(e) => setForm({ ...form, nickname: e.target.value })}
            />
          </Field>
        </div>
        <div className="form-row">
          <Field label="성별">
            <select
              value={form.gender}
              onChange={(e) =>
                setForm({
                  ...form,
                  gender: e.target.value as SignupDraft["gender"],
                })
              }
            >
              <option value="FEMALE">여성</option>
              <option value="MALE">남성</option>
            </select>
          </Field>
          <Field label="생년월일">
            <input
              required
              type="date"
              value={form.birthDate}
              onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
            />
          </Field>
        </div>
        <Field label="활동 지역">
          <select
            value={form.region}
            onChange={(e) => setForm({ ...form, region: e.target.value })}
          >
            {regions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="한 줄 소개">
          <textarea
            rows={3}
            maxLength={120}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
          />
          <span className="counter">{form.bio.length}/120</span>
        </Field>
        {state === "error" && <Alert type="error">{message}</Alert>}
        {state === "success" && <Alert type="success">{message}</Alert>}
        <div className="button-row">
          <Button disabled={state === "loading" || Boolean(existing)}>
            {state === "loading" && <Spinner />}
            {existing ? "등록 완료" : "프로필 등록하기"}
          </Button>
          {existing && (
            <Button type="button" variant="secondary" onClick={onNext}>
              내 펫 등록하기 →
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}
