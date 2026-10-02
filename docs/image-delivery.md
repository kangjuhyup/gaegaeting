# 서비스 이미지 게시와 k3s 배포

## 이미지 자동화

`Service images` GitHub Actions는 PR에서 전체 workspace 빌드, Node 계약 테스트, Jest 테스트와 Docker 이미지 빌드를 수행합니다. 검증을 통과한 main push와 main의 수동 실행은 아래 이미지를 GHCR에 게시합니다. PR 코드는 이미지를 게시하지 않습니다.

| 이미지 | 포트 | 준비 상태 확인 | 실행 |
| --- | --- | --- | --- |
| `ghcr.io/kangjuhyup/gaegaeting/account` | 2800 | `/account/health` | `node dist/src/main.js` |
| `ghcr.io/kangjuhyup/gaegaeting/match` | 2801 | `/match/health` | `node dist/src/main.js` |
| `ghcr.io/kangjuhyup/gaegaeting/gateway` | 4000 | `/gateway/health` | `node dist/src/main.js` |
| `ghcr.io/kangjuhyup/gaegaeting/edge-authz` | 4010 | `/health` | `node dist/src/edge-authz/main.js` |
| `ghcr.io/kangjuhyup/gaegaeting/integration-ui` | 8080 | `/health` | `node server.mjs` |

태그는 `sha-<main의 전체 커밋 SHA>`입니다. amd64/arm64 멀티 플랫폼 manifest digest를 Actions artifact `image-<서비스>-<SHA>`와 작업 요약에서 확인합니다. k3s에서는 `이미지:sha-<SHA>@sha256:<digest>`로 고정합니다. `latest`를 배포 기준으로 사용하지 않습니다. 이미지 게시와 클러스터 배포는 각각 검증하며, 이미지 게시만으로 클러스터가 변경되지는 않습니다.

Node 24.13.1과 pnpm 10.34.5를 사용합니다. 빌드 stage에서 `pnpm deploy --legacy --prod`로 workspace 의존성까지 포함한 서비스별 독립 실행 디렉터리를 만들고, runtime에서는 UID 1000으로 실행합니다. UI에는 정적 파일과 Node HTTP 서버만 포함합니다. 환경 파일과 인증 키는 Docker context에서 제외합니다. 현재 서비스의 runtime 의존성은 JavaScript입니다. native addon을 추가하면 TARGETPLATFORM별 의존성 설치·실행 검증을 함께 추가해야 합니다.

```bash
# 로컬 빌드 예시. 다른 서비스도 --target과 태그를 변경하여 빌드합니다.
docker buildx build --load --target account \
  -f deploy/docker/Dockerfile -t gaegaeting-account:local .
```

## 배포 순서

1. [브랜치 규칙](branch-policy.md)에 따라 작업을 dev에 통합하고 release 브랜치를 생성합니다. release → main은 squash합니다. 공통 자동화와 최초 통합 릴리즈는 `feat/core/image-delivery → dev/core → release/core/1.0.0 → main`을 사용합니다.
2. 해당 main 커밋의 모든 이미지와 검증 작업 성공을 확인합니다. GHCR가 private이면 k3s에 최소 read:packages 권한의 pull secret을 별도로 공급합니다.
3. k3s 저장소에서 환경별 ConfigMap·Doppler Secret·Service·NetworkPolicy·Ingress와 digest를 준비합니다. 비밀 값은 이 저장소에 기록하지 않습니다.
4. 대상 Account/Match DB 연결 환경변수로 각 이미지의 `/app`에서 `node dist/src/migrations/migrate.js`를 별도 Job으로 실행합니다. 성공 전에 API를 rollout하지 않습니다. 마이그레이션은 Pod 시작에서 자동 실행하지 않습니다.
5. account/match를 먼저 준비한 후 gateway를 rollout합니다. Gateway는 두 subgraph의 schema composition이 성공해야 포트를 엽니다. Edge 모드에서는 ext_authz가 정상 작동한 다음 외부 ingress를 연결합니다.
6. 상태 검사, 인증 실패의 401/403, 인증 의존성 장애의 503, 등록 사용자 토큰의 GraphQL 호출, 본인인증·가입·로그인과 redirect/CORS/cookie를 실제 환경에서 검증합니다. 실패 시 이전 digest를 복구하며, DB의 역마이그레이션은 별도 판단합니다.

## 서비스 간 계약

- account/match는 같은 `INTERNAL_AUTH_ASSERTION_SECRET`을 gateway와 공유합니다. 서비스 audience는 각각 `account`, `match`, issuer는 `gaegaeting-gateway`입니다. subgraph와 내부 subject-resolution endpoint는 외부에 공개하지 않습니다.
- Gateway에 `ACCOUNT_SERVICE_URL`, `MATCH_SERVICE_URL`, `ACCOUNT_SUBJECT_RESOLUTION_URL`을 namespace에 맞는 DNS로 명시합니다. `GATEWAY_AUTH_MODE=direct`면 OIDC introspection을 Gateway가 수행하고, `edge`면 검증된 `EDGE_AUTH_ASSERTION_SECRET` assertion을 요구합니다. Edge 모드의 public GraphQL은 반드시 ext_authz를 통과해야 합니다.
- Edge-authz의 OIDC issuer/client secret, Gateway/Edge의 API audience `OIDC_API_AUDIENCE` (기본 `https://api.gaegaeting.app`), 실제 Auth tenant/client/scope/resource 등록을 일치시킵니다. 운영은 명시적 HTTPS issuer가 필요합니다.
- account에는 `AUTH_BASE_URL`, `AUTH_ISSUER`, `AUTH_TENANT_CODE`, 전용 provisioning client/secret, 등록 DI HMAC/service token 및 envSpec에 정의된 DB·Redis·스토리지·외부 API 값을 주입합니다. `AUTH_ISSUER`는 Gateway의 OIDC issuer와 동일해야 합니다. Match에는 DB·Account 주소·Kafka broker를 주입합니다.
- Account의 기존 subject-resolution은 등록된 사용자만 허용합니다. 임의 Auth 사용자 로그인만으로 Account 사용자가 자동 생성되지 않습니다.
- 운영에서 `REGISTRATION_MOCK_ENABLED=false`를 유지합니다. 현재 본인인증 adapter는 mock만 있으므로 실제 공급자 구현 전에는 운영 신규 회원가입이 완료되지 않습니다. dev에서만 mock 경로를 검증할 수 있습니다.

## 가입 정보와 프로필 등록

UI는 가입 시 이름·생년월일·성별·휴대폰번호를 Account에 전달하며, Account는 가입 레코드에 저장합니다. 로그인 후 프로필 등록은 닉네임·활동지역·소개글만 전송합니다. Account는 인증된 `userId`의 완료된 가입 정보에서 이름·생년월일·성별을 가져오며, 클라이언트의 프로필 입력으로 이를 덮어쓰지 않습니다. 휴대폰번호는 가입 레코드에 보관하고 공개 프로필로 복사하지 않습니다. 프로필을 아직 등록하지 않은 계정의 `myProfile`은 `null`을 반환합니다.

이 변경 배포에는 `AccountSignupIdentity1790859600000` 마이그레이션을 먼저 적용하고 Account → Gateway → UI 순서로 전환해야 합니다. 기존 가입 레코드는 보존하며 신규 개인정보 열은 비어 있습니다. 이전 코드가 저장하지 않은 정보를 추정해서 채우지 않습니다. 이미 등록된 프로필은 계속 조회할 수 있지만, 가입 정보도 프로필도 없는 기존 계정은 별도의 본인 정보 복구 절차가 필요합니다. 이전 API 클라이언트의 전체 프로필 입력은 가입 정보가 없는 계정에 한해 호환됩니다. 신규 가입의 실제 본인 확인 신뢰도는 공급자 구현에 따르며 dev mock 입력은 운영 본인인증을 대신하지 않습니다.

## UI 런타임 연결 설정

UI 컨테이너는 다음 **공개 설정만** `/config.js`로 제공합니다. 비밀은 UI에 주입하지 않습니다.

| 환경변수 | 내용 |
| --- | --- |
| `UI_OIDC_ISSUER` | 정확한 HTTPS tenant issuer |
| `UI_API_AUDIENCE` | 환경별 API resource audience, Gateway/Edge OIDC_API_AUDIENCE와 일치 |
| `UI_OIDC_CLIENT_ID` | public PKCE client. 기본 `gaegaeting-web` |
| `UI_ACCOUNT_GRAPHQL_URL` | HTTPS Account 가입 GraphQL endpoint |
| `UI_GATEWAY_GRAPHQL_URL` | HTTPS Gateway GraphQL endpoint |
| `UI_IMAGE_STORAGE_ORIGIN` | 사진 업로드·표시에 허용할 S3 endpoint의 정확한 HTTPS origin. 사진 기능 배포 시 필수 |

이미지 재빌드 없이 dev/prod 주소를 설정할 수 있습니다. Auth origin은 issuer에서 구합니다. `/login`, `/interaction`과 기타 UI 경로는 SPA fallback을 제공합니다. 개발 Vite의 `/local-auth` proxy는 배포 UI에서 사용하지 않습니다. Auth에 exact redirect `${UI_ORIGIN}/login`, external interaction `${UI_ORIGIN}/interaction`, credentialed CORS 및 cookie 정책을 등록합니다. CSP는 UI와 지정한 API/Auth origin으로 연결을 제한하고 `Referrer-Policy: no-referrer`를 제공합니다.

개발 `pnpm dev:ui`의 VITE_* 설정은 기존대로 사용합니다. 로컬 preview에서는 runtime config가 필요하므로 배포 검증은 컨테이너 HTTP 서버로 수행합니다.

## 프로필 사진과 관리자 검토

사용자와 각 반려견은 사진을 최대 6장 등록합니다. UI는 PNG/JPG/WebP 5MiB 이하 파일을 읽어 최대 1600px PNG로 다시 인코딩하며 원본 EXIF 등의 메타데이터를 제외합니다. 파일 선택과 미리보기만으로 제출되지 않으며 **사진 업로드**를 눌러야 합니다. 본인 사진·본인 소유 반려견만 업로드, 제출, 삭제할 수 있습니다.

`UPLOADING → PENDING → APPROVED / REJECTED` 순서로 처리합니다. 업로드 완료 후 서버가 크기·PNG 헤더·치수를 확인하고 ETag 조건부 복사로 검토용 파일을 고정합니다. 검토용 경로에는 PUT URL을 발급하지 않으므로 기존 업로드 URL을 재사용해도 승인된 사진을 바꿀 수 없습니다. `PENDING` 사진은 소유자와 관리자 검토 목록에만 나타나며 공개 프로필에는 `APPROVED`이면서 활성인 사진만 포함합니다. 사진 조회 URL은 300초 후 만료됩니다. 이미 발급된 GET URL이나 다운로드된 파일은 승인 취소·삭제 시 즉시 회수되지 않을 수 있습니다.

관리자는 **관리자로 로그인** 후 **사진 검토**(`/image-review`)에서 사용자·반려견 사진을 승인 또는 거절합니다. 사진을 실제로 불러오기 전에는 UI 승인 버튼이 비활성입니다. API는 Auth가 `tenant_roles` scope와 함께 제공한 `tenant_roles: [{id, code}]`의 `ADMIN` 역할 및 `account:read`/`account:write` scope를 검사합니다. Gateway와 Edge는 검증된 역할만 서명하여 Account로 전달합니다. 일반 로그인은 `tenant_roles`를 요청하지 않습니다. 관리자 로그인 버튼이나 scope 요청 자체는 관리자 역할을 부여하지 않습니다.

배포 전 다음 계약을 적용합니다.

1. Account `ProfileImageReview1790899200000` 마이그레이션을 적용합니다. 기존 활성 사진은 `APPROVED`로 보존하고 비활성 사진은 자동 승인하지 않습니다.
2. 기존 `gaegaeting-web` Auth client의 허용 scope에 `tenant_roles`를 추가하고 지정된 검토자에게 해당 tenant의 `ADMIN` 역할을 별도로 부여합니다. bootstrap 스크립트는 기존 client와 설정이 다르면 충돌로 중단하며 자동 수정하거나 관리자 역할을 부여하지 않습니다.
3. USER/PET 버킷을 비공개로 유지합니다. Account storage credential에 해당 버킷·prefix의 PUT/GET/HEAD/DELETE 및 동일 버킷 조건부 CopyObject 권한을 확인합니다. 정확한 UI origin의 CORS에 PUT·GET·HEAD와 Content-Type을 허용합니다. UI의 `UI_IMAGE_STORAGE_ORIGIN`과 Account `STORAGE_HOST` origin을 맞춥니다. 로컬 Vite는 `VITE_IMAGE_STORAGE_ORIGIN`을 사용합니다.
4. Account → Edge-authz → Gateway → UI 순서로 새 이미지를 전환하고 실제 관리자 토큰과 브라우저에서 양쪽 업로드·검토·승인 후 프로필 조회를 확인합니다.

거절·삭제 시 DB에서 먼저 노출을 차단한 뒤 스토리지 삭제를 시도합니다. 스토리지 장애나 이전 PUT URL 재사용으로 비참조 파일이 남을 수 있으므로 `profile-images/uploads/`에는 만료 lifecycle을 설정하고 고아 객체를 운영 점검합니다. 검토·승인 파일 prefix에는 일괄 만료를 적용하지 않습니다. 서버는 헤더 검증을 수행하며 이미지 전체 디코딩이나 악성 파일 분석기는 포함하지 않습니다.

후속 구현은 로컬에서 Account 104개, Gateway 67개, 공통 DB/Auth/Assertion 75개 및 Node 계약 60개 테스트가 통과했습니다. 임시 PostgreSQL 18.4 ARM64와 S3 호환 테스트 서버에서 마이그레이션 재실행·기존 상태 보존, 실제 Nest GraphQL 기동, 사용자·반려견 PUT/HEAD/Range/조건부 Copy/GET/DELETE, 승인 전 비공개·승인 후 노출, 이전 PUT 재사용 및 오래된 요청의 교체 사진 변경 차단을 확인했습니다. Orca 브라우저에서 실제 업로드·미리보기·승인 대기, 관리자 사용자/반려견 승인·거절·목록 갱신, 일반 사용자 검토 화면 차단과 승인된 사진 삭제도 확인했습니다. S3 테스트 서버는 서명·버킷 권한을 검증하지 않으므로 실제 배포 버킷의 익명 접근 차단과 서명 만료는 별도로 검증합니다. 이 검증은 배포된 dev 환경의 신규 사진 E2E 결과를 의미하지 않습니다.

## 최초 dev 배포 계약

사용자가 선택한 주소는 UI `https://test-ggt-ui.rvkang.app`, API `https://test-ggt-api.rvkang.app`입니다. 최초 배포는 edge 인증 모드, 별도 fresh Account/Match DB 및 role, 독립 `gaegaeting-dev` Auth tenant를 사용합니다. issuer는 `https://auth.rvkang.app/t/gaegaeting-dev/oidc`, API audience는 `https://test-ggt-api.rvkang.app`입니다. bootstrap의 `AUTH_TENANT_CODE=gaegaeting-dev`, `OIDC_API_AUDIENCE`와 runtime의 `UI_API_AUDIENCE`까지 일치시킵니다.

실제 dev 가입 검증에는 dev namespace에만 `NODE_ENV=development`, `REGISTRATION_MOCK_ENABLED=true`를 주입합니다. 운영 승격 시 mock을 금지하고 실제 본인인증 공급자를 준비합니다. 현재 k3s는 ARM64 한 노드이며, 신규 DB/pg_hba/CA 접근, Kafka, Secret, namespace, DNS/TLS/Ingress 및 Auth 클라이언트가 준비돼야 최초 rollout을 시작할 수 있습니다. PostgreSQL `verify-full` 사용 시 CNPG CA를 파일로 mount하고 `NODE_EXTRA_CA_CERTS`로 신뢰를 공급합니다. 스토리지·외부 API 자격증명의 실효성도 별도 확인합니다.

공용 Kafka를 사용할 때 Match에 `KAFKA_TOPIC_PREFIX=dev.gaegaeting`을 설정합니다. Feed/Like/Pair의 모든 Kafka 발행은 `${KAFKA_TOPIC_PREFIX}.${topic}`으로 전송하므로 `dev.gaegaeting.notification.fcm.send.v1`, `dev.gaegaeting.chat.room.created.v1`, `dev.gaegaeting.match.pair.reported.v1` 등을 별도로 준비합니다. Nest 로컬 EventEmitter 이벤트 이름과 페이로드는 변경하지 않습니다. 다른 환경에는 별도 prefix를 설정합니다. prefix 생략/빈 값은 기존 토픽을 유지하는 호환 모드이며, 공유 broker의 환경 격리에는 사용하지 않습니다. prefix는 영숫자로 시작하는 영숫자·점·밑줄·하이픈 최대 200자이며 잘못된 설정은 앱 부팅 시 거부합니다. 토픽 prefix는 이름 격리이며 보안 접근 제어를 대신하지 않습니다.
