# 본인인증 기반 회원가입

## 책임 경계

- Account는 본인인증, CI 폐기, DI HMAC, 중복 가입, 약관, 가입 자격과 서비스 회원 식별자를 소유한다.
- Auth는 credential, 로그인·MFA, OIDC interaction, 세션·토큰과 `issuer + sub`를 소유한다.
- Auth에는 CI, DI, DI HMAC 또는 본인인증 원문을 전달하지 않는다.

## Account 계약

1. Account GraphQL의 `completeMockIdentityVerification` mutation은 모킹 어댑터의 인증 결과를 받아 CI를 저장하지 않고 DI HMAC과 짧은 수명의 `handoffId`를 생성한다.
2. `POST /account/internal/v1/registration-eligibilities/claim`은 `handoffId`를 tenant/client/attempt에 원자적으로 귀속한다.
3. `POST /account/internal/v1/registration-eligibilities/complete`는 registration/attempt와 `issuer + sub`에 대해 멱등하게 가입을 확정한다.
4. eligibility 상태는 `ISSUED -> CLAIMED -> USED`로만 진행한다. 만료·바인딩 불일치·다른 attempt의 재사용은 거부한다.

## Account 직접 가입 계약

- `registerAccount`는 클라이언트에서 로그인 정보·약관·인적 정보만 받고 Account가 `IdentityVerificationPort.request`로 본인인증을 요청한다.
- 임시 어댑터는 개발·테스트에서 동일하게 정규화한 테스트 신원에 안정적인 DI를 반환하며, 운영에서는 차단한다.
- 가입 정보는 확인된 인적 정보·DI HMAC·공급자·거래 ID·인증 시각만 저장하고 CI와 DI 원문은 폐기한다.
- 가입 예약 → Auth provisioning → 가입 완료 순으로 처리하고, DI unique 제약·안정적인 Auth 멱등 키·완료 처리의 행 잠금으로 중복 및 재시도를 처리한다.
- 기존 handoff 경로의 계약은 유지하며 직접 가입 경로와는 별도 테이블 및 HMAC 용도를 사용한다.
- 상세 입력 계약과 실행 절차는 [Account README](../../packages/account/README.md#회원가입-본인인증)에 둔다.

## 보안과 실패 처리

- CI와 DI 원문은 repository 경계로 전달하지 않는다.
- DI는 버전이 있는 서버 HMAC으로만 저장하며 DB unique 제약으로 중복 가입 경쟁을 차단한다.
- 브라우저에는 무의미한 `handoffId`만 반환하고 Account에는 그 SHA-256 digest만 저장한다.
- Auth는 claim 성공 후 사용자를 `PENDING_REGISTRATION`으로 만들고 complete 성공 후에만 `ACTIVE`와 OIDC interaction 완료를 허용한다.
- claim과 complete는 attempt ID를 멱등 키로 사용한다.
- CLAIMED lease가 만료되면 claim과 complete 모두 `410 Gone`으로 종료하며 ISSUED로 되돌리지 않는다. 사용자는 본인인증부터 다시 수행해 새 handoff를 발급받는다.
- 내부 API는 Account 전용 service credential 또는 mTLS로 보호하며 DI HMAC secret과 키를 공유하지 않는다.

## 검증

- Account 서비스 단위 테스트로 CI 비저장, HMAC, 중복, 바인딩, 상태 전이와 멱등성을 검증한다.
- Auth 서비스 단위 테스트로 pending 사용자의 로그인 차단과 complete 실패 시 interaction/token 미발급을 검증한다.
- 양 저장소의 고정 Node/package-manager 버전으로 집중 테스트와 빌드를 실행한다.
