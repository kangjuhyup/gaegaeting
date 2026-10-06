# 카카오 인증 티켓 기반 회원가입

카카오 인증은 Auth가 처리하고 서비스 회원가입 자격은 Account가 판단한다.
Auth 사용자는 Account의 본인인증 및 DI 중복 확인 후 생성한다. CI는 요청하거나
저장하지 않는다. Account의 임시 본인인증은 개발·테스트 환경에서만 사용한다.

## 서비스 간 계약

- 앱 로그인은 기존 Authorization Code + PKCE를 유지한다.
- Auth의 고정 callback은 OAuth state를 서버에 저장하고 원자적으로 소비하며
  HttpOnly 쿠키의 브라우저 바인딩을 검증한다.
- 미연결 외부 사용자는 Auth 사용자 생성 없이 가입 티켓을 받는다.
- 보호된 `GET /t/:tenantCode/interaction/:uid/api/details`의 선택 필드
  `externalSignup`은 `{ ticket, provider, expiresAt, attemptId }`이다.
- `POST /t/:tenantCode/provisioning/external-signups/claim`: 서비스 토큰
  `auth.user.provision`과 `{ ticket, clientId, attemptId }`를 검증하고
  `{ ticketId, provider, providerSub, clientId, issuer, expiresAt }`를 반환한다.
  `providerSub`는 서버 간 검증 결과이며 브라우저에 반환하거나 로그에 남기지 않는다.
- `POST /t/:tenantCode/provisioning/external-signups/complete`: 같은 서비스 인증과
  `{ ticket, clientId, attemptId }`, `Idempotency-Key`로 비밀번호 없는 사용자 및
  외부 identity를 생성한다. 응답은 `{ issuer, subject }`이다. 같은 요청의
  재시도는 같은 subject를 반환하고 서로 다른 identity를 같은 키로 생성하지 않는다.
- Account의 `registerSocialAccount(input: RegisterSocialAccountInput!)`은
  `{ ticket, attemptId, termsVersion, termsAgreed, name, birthDate, gender, phone }`를
  받는다. issuer, provider subject, CI, DI, 성인 확인 결과를 클라이언트에서 받지 않는다.
- Account가 claim을 확인한 후 본인인증 → 일반 가입과 같은 DI HMAC unique 예약 →
  Auth complete → issuer/sub 연결을 수행하고 `{ authSubject }`만 반환한다.
- `POST /t/:tenantCode/interaction/:uid/api/external-signup/resume`은 보호된
  interaction 및 `{ ticket, attemptId }`를 검증하고 기존 ACTIVE/MFA/세션 정책으로
  로그인을 이어 간다. 만료된 interaction은 새로운 PKCE 로그인으로 시작한다.

## 중복 및 실패 처리

- 기존 DI의 다른 가입 수단 또는 다른 외부 identity는 신규 Auth 생성 전에 거절한다.
  UI는 기존 계정 로그인 후 명시적인 identity-link를 안내한다. 이메일 자동 병합은 없다.
- 같은 외부 identity의 재가입 요청은 서버에서 검증한 provider subject의 HMAC으로
  기존 가입 예약과 결합한다. CI/DI/provider subject 원문은 Account에 저장하지 않는다.
- 카카오 가입은 username/password 없는 별도 가입 수단이며 일반 가입 DI 테이블을
  공유한다. 데이터베이스 제약이 병렬 요청을 보호한다.
- Auth complete와 Account 저장 사이의 실패는 같은 요청으로 복구한다. 새로운
  인증 티켓으로 기존 외부 사용자의 미완료 Account 가입을 재개하는 경로도 제공한다.
- 가입 티켓·OAuth state는 tenant/client/interaction/provider에 묶고 TTL과 원자적
  소비를 적용한다. 티켓·토큰은 URL query, 장기 브라우저 저장소, 로그에 남기지 않는다.
- Account 회원 연결이 없으면 기존 Gateway의 일반 서비스 API 차단을 유지한다.

## 구현과 검증

1. Auth: callback/state, 최소 프로필, 티켓, passwordless provisioning, 로그인 재개.
2. Account: 공유 DI 예약, 소셜 가입용 서비스 어댑터·mutation·마이그레이션.
3. UI: 카카오 선택, 비밀번호 없는 가입 폼, 재시도와 기존 계정 연결 안내.
4. 검증: state 변조/만료/재생, tenant/client/attempt 불일치, DI 및 provider 중복,
   재시도, 부분 실패, MFA, CI 저장 방지, 기존 비밀번호 가입 회귀, 타입·빌드.

실제 카카오 앱의 키·허용 scope·Redirect URI 설정은 코드 구현 이후 별도로 적용한다.
2026-10-05 사용자 요청으로 아래 개발 앱의 콘솔 설정과 Auth 배포·활성화를 적용했다.
Account·UI 변경 배포는 별도 단계다.

## 적용 설정

- Account의 `AUTH_SIGNUP_CLIENT_ID`(기본 `gaegaeting-web`)와 UI client를 맞춘다.
  `AUTH_ISSUER`는 해당 tenant의 discovery issuer와 정확히 일치시킨다.
- Account의 `AccountSocialSignup1791158400000`과 Auth의
  `Migration20261005000000`, `Migration20261005010000`을 각 프로젝트의
  마이그레이션으로 적용한다. 두 번째 Auth 마이그레이션은 IdP secret 암호문을
  수용하도록 컬럼을 확장하며, Auth migration CLI가 기존 평문 secret을 보호한다.
- 카카오 로그인 앱에는 Auth origin의 고정 가입·로그인 콜백
  `/t/:tenantCode/interaction/idp/kakao/callback`을 등록한다. 기존 계정 연결용
  `/auth/identity-links/kakao/callback?tenantCode=:tenantCode`도 별도로 등록한다.
- 기존 계정 연결은 별도의 resource 없는 Authorization Code + PKCE 재인증으로
  Auth의 opaque access token을 받는다. 검증한 ID token subject가 연결을 시작한
  계정과 같을 때만 link-start를 호출한다. 앱 API 토큰과 가입 티켓은 재사용하지 않는다.
- link-start는 `credentials: include`로 요청한다. UI origin을 Auth의
  `HTTP_CORS_ORIGINS` 정적 allowlist에 정확히 등록하고 credentialed CORS,
  OPTIONS/POST 및 Authorization/Content-Type 헤더를 허용한다.
  `externalInteractionUiUrl` 등록만으로 연결 API CORS가 허용되지는 않는다.
- UI와 Auth는 동일 사이트로 배포한다. 브라우저 바인딩 쿠키는 HttpOnly,
  SameSite=Lax이며 HTTPS에서는 Secure를 사용한다. 프록시는 Set-Cookie를
  보존해야 한다. 서로 다른 사이트의 fetch에서 쿠키 설정이 차단되는 구성은
  현재 연결 흐름으로 지원하지 않는다.
- client redirect URI는 UI의 정확한 `/login` 주소, external interaction UI는
  `/interaction` 주소를 등록한다. 카카오 프로필을 본인인증 결과로 사용하지 않는다.

### 개발 앱 콘솔 적용 기록 (2026-10-05)

- 앱: [개개팅-dev (1289760)](https://developers.kakao.com/console/app/1289760).
- 카카오 로그인과 OpenID Connect는 기존 ON 상태를 확인했다.
- `profile_nickname`은 기존 필수 동의이며 프로필 사진·친구·메시지 scope는
  사용하지 않는다. 이메일·CI 등 추가 개인정보 scope도 신청하지 않는다.
- 대표 REST API 키의 로그인 리다이렉트 URI에 아래 두 주소를 추가하고,
  저장 후 다시 열어 서버에 반영된 값을 확인했다. 기존 URI 세 개는 유지했다.
  - `https://auth.rvkang.app/t/gaegaeting-dev/interaction/idp/kakao/callback`
  - `https://auth.rvkang.app/auth/identity-links/kakao/callback?tenantCode=gaegaeting-dev`
- 기존 Client Secret ON 상태를 유지했다. 키·secret 원문은 문서와 Git에 기록하지 않는다.
- chat-messaging 담당의 기존 설정 조사에서 Doppler `gaegaeting/dev/KAKAO_API_KEY`가
  콘솔 REST API 키 비교값과 일치하고 `KAKAO_CLIENT_ID`는 불일치했다. Auth의
  `clientId`에는 `KAKAO_API_KEY`를 사용한다. 이후 기존 `KAKAO_CLIENT_SECRET`도
  콘솔 비교값과 일치함을 확인했다.
- 사용자 승인 후 원격 `gaegaeting-dev`에 Kakao provider ID `2`를 등록했다.
  등록 직전 모든 Auth service pod가 기존 0.2.1 이미지임을 확인하고, Doppler의
  기존 암호화 키가 실행 pod의 키와 같음을 확인했다. `enc:v1:` AES-GCM 암호문을
  기존 관리 API로 한 번 저장하고 `enabled=false`, `clientSecretSet=true`를 재조회했다.
- 실제 DB의 해당 provider secret이 암호문이며, 서버의 기존 키로 복호화한 값이
  Doppler의 기존 secret과 일치함도 원문을 출력하지 않고 읽기 전용으로 검증했다.
  등록 시점에는 비활성 상태로 유지했으며, 아래 Auth 0.3.1 배포 검증 후 활성화했다.
- 원격 `gaegaeting-web`의 `/login` redirect와 `/interaction` 외부 UI 주소를 확인했다.
- Doppler `auth/prd/HTTP_CORS_ORIGINS`에 `https://auth.rvkang.app`과
  `https://test-ggt-ui.rvkang.app`을 준비했다. 기존 관리자 UI origin을 보존했다.
  이후 K3s runtime-sync 목록과 service env에 이 키를 추가해 Auth 0.3.1 런타임에
  반영했다. 아래 기록의 credentialed CORS 검증을 통과했다.

## Auth 배포 및 활성화 기록 (2026-10-05)

- [Auth 0.3.1 릴리스](https://github.com/kangjuhyup/auth/releases/tag/auth-v0.3.1)의
  소스는 `c1484a190d67d57fc155719a5b7f605215569a95`다.
  [Auth PR #37](https://github.com/kangjuhyup/auth/pull/37)과
  [GitOps PR #21](https://github.com/kangjuhyup/k3s/pull/21)을 squash 병합했다.
- Auth 0.3.0은 스키마 적용 후 IdP secret 보호에 global EntityManager를 사용해
  migration Job이 실패했다. 0.3.1에서 `orm.em.fork()`로 수정했다.
  실제 PostgreSQL 기본 경로의 암호화·복호화·멱등성 회귀 테스트와,
  스키마가 이미 적용된 DB의 compiled CLI 2회 재실행이 모두 통과했다.
- [최종 릴리스 CI](https://github.com/kangjuhyup/auth/actions/runs/37314856255)는
  Auth 178개 suite·1,775개 테스트와 UI 11개 파일·122개 테스트를 통과했다.
  opt-in 테스트 24개는 기본 CI에서 제외한다. 타입·아키텍처·빌드와
  두 이미지의 ARM64·AMD64 및 소스 revision도 검증했다.
- GitOps revision `1980c942981cb5a37e4fcc1ab7240f0a3777c4ed`에서
  `auth-migrate-609d4ca6a06f`의 `succeeded=1`, `failed=0`을 확인했다.
  API·worker·UI가 모두 0.3.1 이미지로 Ready이며 재시작은 0회다.
- 실행 서버의 암호화 키와 저장된 Kakao secret의 복호화 일치를 검증했다.
  웹 origin의 credentialed CORS preflight도 통과했다. secret 원문은 출력하지 않았다.
- `gaegaeting-dev`의 Kakao provider ID `2`에 `{ enabled: true }`만 갱신하고
  `enabled=true`, `clientSecretSet=true`를 재조회했다. 저장된 secret은 재전송하지 않았다.
- 공개 Auth API에서 PKCE interaction을 시작해 Kakao 선택 목록 노출과
  `kauth.kakao.com/oauth/authorize`로의 redirect 및 고정 callback을 확인했다.
  카카오 계정 로그인·동의·회원가입 완료까지 실행한 검증은 아니다.
- Argo operation은 `Succeeded`이고 현재 선언 리소스는 `Synced`다.
  prune을 끈 정책으로 이전 완료·실패 migration Job 두 개가 남아 전체 표시는
  `OutOfSync`·`Degraded`다. 기존 Job 삭제나 직접 Kubernetes 변경은 수행하지 않았다.
- Account·UI의 이번 구현 변경은 아직 커밋·푸시·배포 전이다.
  서비스 회원가입 전체 흐름 검증은 이 변경의 배포 후 수행한다.

## 확인 범위

Account 전체 26개 suite의 228개 테스트와 공유 의존성 빌드를 통과했다.
전용 PostgreSQL의 임시 스키마에서 11개 테스트로 가입 수단 간 DI 중복,
동시 가입, 외부 identity 중복, Account 저장 실패 후 복구를 확인했다.
공통 logger 테스트와 PostgreSQL 정적 계약 검사도 통과했다.
UI·Auth 연동 관련 35개 테스트와 배포 UI 7개 테스트, UI 타입검사 및 빌드를 통과했다.
초기 Auth 작업 브랜치의 단위 테스트는 178개 suite, 1,786개 테스트를 통과했다.
최종 릴리스의 독립된 검증 수치는 위 Auth 배포 기록을 따른다.
secret 보호 집중 테스트 5개 suite, 60개 테스트와 멀티바이트 secret 암복호화도 확인했다.
환경 변수로 활성화하는
23개 테스트는 기본 실행에서 제외되며, 신규 PostgreSQL·Redis 통합 테스트 10개는
별도 테스트 자원에서 모두 실행했다. 전체 사용자 로그인 E2E 15개를 통과했고,
최종 코드의 외부 로그인·계정 연결·opaque 토큰·비밀번호 없는 가입 E2E 4개를
별도 환경에서 독립적으로 재검증했다. Auth 타입·빌드·아키텍처 검사와 Gateway
회원 연결 인증 회귀 테스트 18개도 통과했다.
배포 환경의 카카오 인증 redirect까지 위 기록에서 확인했다. 실제 카카오 로그인·동의
및 서비스 회원가입 완료와 배포 환경 브라우저 검증은 아직 수행하지 않았다.

비밀번호 없는 Auth 계정은 기존 비밀번호 재확인을 요구하는 탈퇴 API를 사용할
수 없다. 외부 로그인 재인증을 탈퇴 증명으로 사용하는 기능은 별도 구현이 필요하다.
