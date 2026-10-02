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

## UI 런타임 연결 설정

UI 컨테이너는 다음 **공개 설정만** `/config.js`로 제공합니다. 비밀은 UI에 주입하지 않습니다.

| 환경변수 | 내용 |
| --- | --- |
| `UI_OIDC_ISSUER` | 정확한 HTTPS tenant issuer |
| `UI_API_AUDIENCE` | 환경별 API resource audience, Gateway/Edge OIDC_API_AUDIENCE와 일치 |
| `UI_OIDC_CLIENT_ID` | public PKCE client. 기본 `gaegaeting-web` |
| `UI_ACCOUNT_GRAPHQL_URL` | HTTPS Account 가입 GraphQL endpoint |
| `UI_GATEWAY_GRAPHQL_URL` | HTTPS Gateway GraphQL endpoint |

이미지 재빌드 없이 dev/prod 주소를 설정할 수 있습니다. Auth origin은 issuer에서 구합니다. `/login`, `/interaction`과 기타 UI 경로는 SPA fallback을 제공합니다. 개발 Vite의 `/local-auth` proxy는 배포 UI에서 사용하지 않습니다. Auth에 exact redirect `${UI_ORIGIN}/login`, external interaction `${UI_ORIGIN}/interaction`, credentialed CORS 및 cookie 정책을 등록합니다. CSP는 UI와 지정한 API/Auth origin으로 연결을 제한하고 `Referrer-Policy: no-referrer`를 제공합니다.

개발 `pnpm dev:ui`의 VITE_* 설정은 기존대로 사용합니다. 로컬 preview에서는 runtime config가 필요하므로 배포 검증은 컨테이너 HTTP 서버로 수행합니다.

## 최초 dev 배포 계약

사용자가 선택한 주소는 UI `https://test-ggt-ui.rvkang.app`, API `https://test-ggt-api.rvkang.app`입니다. 최초 배포는 edge 인증 모드, 별도 fresh Account/Match DB 및 role, 독립 `gaegaeting-dev` Auth tenant를 사용합니다. issuer는 `https://auth.rvkang.app/t/gaegaeting-dev/oidc`, API audience는 `https://test-ggt-api.rvkang.app`입니다. bootstrap의 `AUTH_TENANT_CODE=gaegaeting-dev`, `OIDC_API_AUDIENCE`와 runtime의 `UI_API_AUDIENCE`까지 일치시킵니다.

실제 dev 가입 검증에는 dev namespace에만 `NODE_ENV=development`, `REGISTRATION_MOCK_ENABLED=true`를 주입합니다. 운영 승격 시 mock을 금지하고 실제 본인인증 공급자를 준비합니다. 현재 k3s는 ARM64 한 노드이며, 신규 DB/pg_hba/CA 접근, Kafka, Secret, namespace, DNS/TLS/Ingress 및 Auth 클라이언트가 준비돼야 최초 rollout을 시작할 수 있습니다. PostgreSQL `verify-full` 사용 시 CNPG CA를 파일로 mount하고 `NODE_EXTRA_CA_CERTS`로 신뢰를 공급합니다. 스토리지·외부 API 자격증명의 실효성도 별도 확인합니다.

공용 Kafka를 사용할 때 Match에 `KAFKA_TOPIC_PREFIX=dev.gaegaeting`을 설정합니다. Feed/Like/Pair의 모든 Kafka 발행은 `${KAFKA_TOPIC_PREFIX}.${topic}`으로 전송하므로 `dev.gaegaeting.notification.fcm.send.v1`, `dev.gaegaeting.chat.room.created.v1`, `dev.gaegaeting.match.pair.reported.v1` 등을 별도로 준비합니다. Nest 로컬 EventEmitter 이벤트 이름과 페이로드는 변경하지 않습니다. 다른 환경에는 별도 prefix를 설정합니다. prefix 생략/빈 값은 기존 토픽을 유지하는 호환 모드이며, 공유 broker의 환경 격리에는 사용하지 않습니다. prefix는 영숫자로 시작하는 영숫자·점·밑줄·하이픈 최대 200자이며 잘못된 설정은 앱 부팅 시 거부합니다. 토픽 prefix는 이름 격리이며 보안 접근 제어를 대신하지 않습니다.
