import { ProfileImages } from "../components/ProfileImages.js";
import { useEffect, useState, type FormEvent } from "react";
import {
  Alert,
  Button,
  Field,
  PageTitle,
  Spinner,
} from "@gaegaeting/ui-common";
import { errorMessage, graphql } from "@gaegaeting/ui-common";
import type { AppConfig, Pet } from "../types.js";

import { breeds, traits } from "../lib/pet-options.js";

export function PetPage({
  config,
  token,
  onNext,
}: {
  config: AppConfig;
  token?: string;
  onNext: () => void;
}) {
  const [form, setForm] = useState({
    name: "몽이",
    age: 3,
    gender: "MALE",
    breed: "POODLE",
    size: "SMALL",
    personalities: ["FRIENDLY", "PLAYFUL"],
    description: "공놀이와 친구 만나기를 제일 좋아해요!",
  });
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  useEffect(() => {
    if (token)
      graphql<{ pets: Pet[] }>(
        config.gatewayUrl,
        `
          query Pets {
            pets {
              id
              name
              age
              gender
              breed
              size
              personalities
              description
              isCertificated
              profileImages
            }
          }
        `,
        {},
        token,
      )
        .then((d) => setPets(d.pets))
        .catch(() => undefined);
  }, [config.gatewayUrl, token]);
  function toggleTrait(value: string) {
    setForm({
      ...form,
      personalities: form.personalities.includes(value)
        ? form.personalities.filter((item) => item !== value)
        : [...form.personalities, value],
    });
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!token) {
      setError("로그인 후 이용해 주세요.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const data = await graphql<{ createPet: Pet }>(
        config.gatewayUrl,
        `
          mutation CreatePet($input: CreatePetInput!) {
            createPet(input: $input) {
              id
              name
              age
              gender
              breed
              size
              personalities
              description
              isCertificated
              profileImages
            }
          }
        `,
        { input: form },
        token,
      );
      setPets((current) => [...current, data.createPet]);
      setSuccess(`${data.createPet.name} 등록이 완료됐어요.`);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }
  return (
    <section className="page two-column pet-page">
      <div className="page-copy">
        <PageTitle
          eyebrow="내 펫"
          title={
            <>
              산책 메이트를
              <br />
              <em>소개해 주세요.</em>
            </>
          }
          description="반려견의 성격을 고르면 더 잘 맞는 산책 친구를 추천할 수 있어요."
        />
        <div className="pet-ticket">
          <div className="pet-avatar">🐶</div>
          <div>
            <span>내 산책 메이트</span>
            <h2>{form.name || "이름"}</h2>
            <p>
              {breeds.find(([v]) => v === form.breed)?.[1]} · {form.age}살
            </p>
          </div>
          {pets.length > 0 && <b>✓</b>}
        </div>
        {pets.length > 0 && (
          <p className="saved-list">
            등록된 펫 {pets.length}마리 ·{" "}
            {pets.map((pet) => pet.name).join(", ")}
          </p>
        )}
      </div>
      <form className="card form-card wide-card" onSubmit={submit}>
        <div className="card__title">
          <span className="round-icon">🐾</span>
          <div>
            <h2>반려견 프로필</h2>
            <p>반려견의 기본 정보를 입력해 주세요.</p>
          </div>
        </div>
        <div className="form-row">
          <Field label="이름">
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="나이">
            <input
              required
              min="0"
              max="30"
              type="number"
              value={form.age}
              onChange={(e) =>
                setForm({ ...form, age: Number(e.target.value) })
              }
            />
          </Field>
        </div>
        <div className="form-row">
          <Field label="견종">
            <select
              value={form.breed}
              onChange={(e) => setForm({ ...form, breed: e.target.value })}
            >
              {breeds.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="크기">
            <select
              value={form.size}
              onChange={(e) => setForm({ ...form, size: e.target.value })}
            >
              <option value="SMALL">소형</option>
              <option value="MEDIUM">중형</option>
              <option value="LARGE">대형</option>
            </select>
          </Field>
        </div>
        <Field label="성별">
          <div className="segmented">
            <button
              type="button"
              className={form.gender === "MALE" ? "selected" : ""}
              onClick={() => setForm({ ...form, gender: "MALE" })}
            >
              ♂ 남아
            </button>
            <button
              type="button"
              className={form.gender === "FEMALE" ? "selected" : ""}
              onClick={() => setForm({ ...form, gender: "FEMALE" })}
            >
              ♀ 여아
            </button>
          </div>
        </Field>
        <Field label="성격 (복수 선택)">
          <div className="chips">
            {traits.map(([v, l]) => (
              <button
                type="button"
                key={v}
                className={form.personalities.includes(v) ? "selected" : ""}
                onClick={() => toggleTrait(v)}
              >
                {l}
              </button>
            ))}
          </div>
        </Field>
        <Field label="소개">
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
        {error && <Alert type="error">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}
        <div className="button-row">
          <Button disabled={loading || form.personalities.length === 0}>
            {loading && <Spinner />}펫 등록하기
          </Button>
          {pets.length > 0 && (
            <Button type="button" variant="secondary" onClick={onNext}>
              추천받기 →
            </Button>
          )}
        </div>
      </form>
      {pets.map((pet) => (
        <div className="card pet-photos" key={pet.id}>
          <ProfileImages
            config={config}
            token={token}
            petId={pet.id}
            title={`${pet.name}의 프로필 사진`}
          />
        </div>
      ))}
    </section>
  );
}
