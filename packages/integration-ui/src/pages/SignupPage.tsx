import { useState, type FormEvent } from "react";
import { graphql, errorMessage } from "@gaegaeting/ui-common";
import type { AppConfig, SignupDraft } from "../types.js";
import {
  Alert,
  Button,
  Field,
  PageTitle,
  Spinner,
} from "@gaegaeting/ui-common";

export function SignupPage({
  config,
  onLogin,
}: {
  config: AppConfig;
  onLogin: () => void;
}) {
  const [form, setForm] = useState<SignupDraft & { password: string }>({
    username: "",
    password: "",
    email: "",
    name: "",
    birthDate: "",
    gender: "FEMALE",
    phoneNumber: "",
  });
  const [terms, setTerms] = useState({
    termsVersion: "2026-09-01",
    termsAgreed: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    authSubject: string;
  } | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const adult = isAdult(form.birthDate);
    if (!adult) {
      setError("만 18세 이상만 가입할 수 있습니다.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await graphql<{
        registerAccount: {
          authSubject: string;
        };
      }>(
        config.accountUrl,
        `
          mutation RegisterAccount($input: RegisterAccountInput!) {
            registerAccount(input: $input) {
              authSubject
            }
          }
        `,
        {
          input: {
            ...terms,
            username: form.username,
            password: form.password,
            email: form.email,
            phone: form.phoneNumber,
            name: form.name,
            birthDate: form.birthDate,
            gender: form.gender,
          },
        },
      );
      setResult(data.registerAccount);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page two-column">
      <div className="page-copy">
        <PageTitle
          eyebrow="회원가입"
          title={
            <>
              반가워요!
              <br />
              <em>먼저 본인 확인</em>을 해볼까요?
            </>
          }
          description="기본 정보를 입력해 주세요."
        />
      </div>
      <form className="card form-card" onSubmit={submit}>
        <div className="card__title">
          <span className="round-icon">✦</span>
          <div>
            <h2>회원 정보 입력</h2>
            <p>모든 항목을 입력해 주세요.</p>
          </div>
        </div>
        <Field label="아이디">
          <input
            required
            autoComplete="username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
        </Field>
        <Field label="비밀번호" hint="8자 이상">
          <input
            required
            minLength={8}
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </Field>
        <Field label="이메일">
          <input
            required
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Field>
        <Field label="이름">
          <input
            required
            autoComplete="name"
            maxLength={50}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="홍길동"
          />
        </Field>
        <div className="form-row">
          <Field label="생년월일">
            <input
              required
              type="date"
              value={form.birthDate}
              onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
            />
          </Field>
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
        </div>
        <Field label="휴대전화 번호">
          <input
            required
            type="tel"
            autoComplete="tel"
            maxLength={32}
            inputMode="tel"
            value={form.phoneNumber}
            onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
            placeholder="010-1234-5678"
          />
        </Field>
        {form.birthDate && !isAdult(form.birthDate) && (
          <Alert type="error">만 18세 이상만 가입할 수 있습니다.</Alert>
        )}
        <label className="check">
          <input
            type="checkbox"
            required
            checked={terms.termsAgreed}
            onChange={(e) =>
              setTerms({ ...terms, termsAgreed: e.target.checked })
            }
          />
          <span>서비스 이용약관에 동의합니다</span>
        </label>
        {error && <Alert type="error">{error}</Alert>}
        {result && (
          <Alert type="success">
            <strong>회원가입이 완료됐어요.</strong>
            <br />
            <small>이제 로그인해 주세요.</small>
          </Alert>
        )}
        {result ? (
          <Button type="button" onClick={onLogin}>
            로그인하기 →
          </Button>
        ) : (
          <Button disabled={loading}>
            {loading && <Spinner />} 회원가입 완료
          </Button>
        )}
      </form>
    </section>
  );
}

function isAdult(birthDate: string): boolean {
  if (!birthDate) return false;
  const birthday = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birthday.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - birthday.getFullYear();
  const birthdayPassed =
    today.getMonth() > birthday.getMonth() ||
    (today.getMonth() === birthday.getMonth() &&
      today.getDate() >= birthday.getDate());
  if (!birthdayPassed) age -= 1;
  return age >= 18;
}
