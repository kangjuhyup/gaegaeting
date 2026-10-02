import { ProfileImages } from '../components/ProfileImages.js';
import { useEffect, useState, type FormEvent } from "react";
import { Alert, Button, Field, PageTitle, Spinner } from "../components/Ui.js";
import { errorMessage, graphql } from "../lib/api.js";
import type { AppConfig, UserProfile } from "../types.js";

type ProfileSummary = Pick<UserProfile, "id" | "nickname" | "region" | "bio">;

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
  onNext,
}: {
  config: AppConfig;
  token?: string;
  onNext: () => void;
}) {
  const [form, setForm] = useState({
    nickname: "",
    region: "",
    bio: "",
  });
  const [profilePhoto, setProfilePhoto] = useState<string>();
  const [existing, setExisting] = useState<ProfileSummary | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;
    graphql<{ myProfile: ProfileSummary | null }>(
      config.gatewayUrl,
      `
        query MyProfile {
          myProfile {
            id
            nickname
            region
            bio
          }
        }
      `,
      {},
      token,
    )
      .then((data) => {
        if (!data.myProfile) return;
        setExisting(data.myProfile);
        setForm({
          nickname: data.myProfile.nickname,
          region: data.myProfile.region,
          bio: data.myProfile.bio || "",
        });
      })
      .catch((cause) => {
        setState("error");
        setMessage(errorMessage(cause));
      });
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
      const input = { ...form };
      const data = await graphql<{ createProfile: ProfileSummary }>(
        config.gatewayUrl,
        `
          mutation CreateProfile($input: CreateUserProfileInput!) {
            createProfile(input: $input) {
              id
              nickname
              region
              bio
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
          {profilePhoto ? <img src={profilePhoto} alt="승인된 프로필 사진" referrerPolicy="no-referrer" /> : <span>{form.nickname.slice(0, 1) || "?"}</span>}
          <i>✦</i>
        </div>
        <h2>{form.nickname || "닉네임"}</h2>
        <p>
          {regions.find(([key]) => key === form.region)?.[1] || "활동 지역"}
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
          description="닉네임, 활동 지역, 소개글을 입력해 주세요."
        />
        <Field label="닉네임">
          <input
            required
            maxLength={50}
            value={form.nickname}
            onChange={(e) => setForm({ ...form, nickname: e.target.value })}
          />
        </Field>
        <Field label="활동 지역">
          <select
            required
            value={form.region}
            onChange={(e) => setForm({ ...form, region: e.target.value })}
          >
            <option value="" disabled>활동 지역을 선택해 주세요.</option>
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
      {existing && <div className="profile-photos card"><ProfileImages config={config} token={token} onApprovedPhoto={setProfilePhoto} /></div>}
    </section>
  );
}
