# Chat 개발 배포 준비

이 디렉터리는 Gaegaeting Chat을 원격 개발 환경에 연결하기 위한 검토용 K3s 변경안이다. 준비 작업에서는 원격 배포, Doppler 값 변경, main 병합을 실행하지 않는다.

2026-10-06 개발 배포에서는 이 과거 패치를 현재 인프라에 통째로 적용하지 않는다. 현재 GitOps main의 Payment·Challenge 이미지, migration, Gateway URL 및 보안 경계를 먼저 보존하고 Chat 파일만 이관한다. 기존 8개 앱과 4개 migration 참조는 유지하며, Chat을 실제 등록할 때에만 9개 앱과 5개 migration 참조를 검증한다. Chat 기본 포트는 `2804`이며 Payment `2802`, Challenge `2803`과 구분한다. 기존 안전한 저장소의 Chat 전용 DB 자격 증명이 확인되기 전에는 Secret projection, CNPG 참조, migration/server 또는 Gateway Chat 연결을 활성화하지 않는다.

## 적용 대상과 원본

- 앱 이미지 교체: **Chat, Match, Gateway, integration-ui**.
- Account, edge-authz, admin-ui 이미지와 기존 Account·Match migration Job의 이름·digest는 유지한다. Match의 변경은 `chatPairs` GraphQL 계약이며 새 Match migration은 필요하지 않다.
- 인프라 변경: Chat Service/Deployment/migration, Doppler 참조·RBAC, Chat 전용 DB 생성 Job, CNPG 접근 규칙, Match/Kafka NetworkPolicy, Envoy WebSocket 경로. Envoy 이미지는 유지하고 설정 checksum으로 Pod를 다시 생성한다.
- K3s 패치 기준: `b04027fb2f7ebed10b170b515a36621032e07e31`. 현재 반영된 `gaegaeting/stg` Doppler 전환과 기존 migration 이미지 분리 검증을 보존한다.
- Gaegaeting 후보는 `feat/core/chat-messaging`이며 main `6743d8e6b77642be3e6d96353251445f68061e60`의 trace, Account 알림 및 Match 수정 릴리즈를 보존한다. Chat의 새 배포 범위에 Account는 포함하지 않는다.

`k3s-preparation.patch`는 K3s 원본을 직접 수정하지 않고 별도 임시 checkout에서 생성했다. K3s 작업 브랜치에서 먼저 `git apply --check`로 확인한 뒤 리뷰한다. GitOps 변경 적용과 Argo CD sync는 실제 배포 단계에서 진행한다.

## 아직 채워야 하는 이미지 식별자

패치에는 다음 **미발행 placeholder**가 남아 있다. 이 상태로 릴리즈 검증이나 실제 sync를 실행하지 않는다.

| 항목 | 대체할 값 |
| --- | --- |
| `CHAT_RELEASE_SHA` | main squash 이후 실제 게시한 40자리 커밋 SHA |
| `CHAT_RELEASE_SHORT_SHA` | 위 SHA의 앞 12자리 |
| `CHAT_IMAGE_DIGEST` | CI와 GHCR에서 확인한 Chat 이미지 index digest의 64자리 hex |

현재 이미지 게시 workflow는 main의 release squash 커밋에서 게시한다. 준비용 로컬 이미지 `gaegaeting-chat:prep-20261003`은 ARM64 검증용이며 GHCR 릴리즈 이미지가 아니다. CI에서 `linux/amd64`와 `linux/arm64` 게시 결과를 확인한다.

K3s `gitops/clusters/oci-a1/gaegaeting-dev/release-images.json`에서 Chat을 추가하고 Match/Gateway/integration-ui의 검증된 식별자만 갱신한다. 기존 3개 앱의 항목은 유지한다. `migrationImages`에는 기존 Account/Match 항목을 보존하고 신규 Chat 항목을 추가한다. 이번 패치는 validator가 7개 앱과 3개 migration 참조를 검증하도록 확장한다. 발행되지 않은 digest를 만들어 적거나 `registryVerified` 등 검증 플래그를 미리 설정하지 않는다.

공통 lockfile·Dockerfile 변경으로 CI가 다른 이미지까지 빌드/게시할 수 있어도, 이번 GitOps 앱 rollout 대상은 위 4개로 제한한다.

Dockerfile의 production 패키징 stage는 서비스별로 분리했다. CI BuildKit은 선택한 target의 production 패키지만 생성하며, UI는 공통 빌드의 UI dist를 사용한다. 전체 workspace 빌드는 공통 단계에서 한 번 수행한다.

## Doppler 준비

실제 값은 `gaegaeting/stg`에서만 관리한다. Git과 로그에는 키 이름·Secret 참조만 기록한다. 기존 shared DB host/CA, Kafka, Match 및 Auth 설정과 일치하는지 확인한다.

| 소비자 | 필요한 Doppler 키 |
| --- | --- |
| Chat | `NODE_ENV`, `INTERNAL_AUTH_ASSERTION_SECRET`, `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_SSL_MODE`, `CHAT_DATABASE_NAME`, `CHAT_DATABASE_USERNAME`, `CHAT_DATABASE_PASSWORD`, `CHAT_SERVICE_API_PORT`, `MATCH_SERVICE_HOST`, `CHAT_KAFKA_ENABLED`, `CHAT_KAFKA_GROUP_ID`, `KAFKA_BROKERS`, `KAFKA_TOPIC_PREFIX` |
| Gateway 추가 | `CHAT_SERVICE_URL`, `CHAT_WS_ALLOWED_ORIGINS`, `OIDC_ISSUER`, `OIDC_INTROSPECTION_CLIENT_ID`, `OIDC_INTROSPECTION_CLIENT_SECRET` |
| Chat DB 생성/identity | `CHAT_DATABASE_NAME`, `CHAT_DATABASE_USERNAME`, `CHAT_DATABASE_PASSWORD` |

Chat DB 키는 `gaegaeting-chat-runtime`의 `DATABASE_NAME`/`DATABASE_USERNAME`/`DATABASE_PASSWORD`로 매핑된다. DB identity Secret은 `databases` namespace의 `gaegaeting-chat-db-identity`에 database/username만 제공한다. migration과 Chat 서버는 기존 `gaegaeting-db-ca`를 사용하며 DB TLS는 `verify-full`을 확인한다. Gateway Chat URL은 HTTP Federation endpoint를 가리키며 같은 URL에서 WS upstream을 유도한다. 허용 origin은 실제 사용자 UI의 정확한 origin으로 제한한다.

Gateway는 브라우저의 `connection_init` opaque bearer를 Auth에서 검증하므로 기존에 허용된 introspection client 계약을 확인한다. 신규 Auth scope나 Auth 저장소 변경은 요구하지 않는다.

## 단계별 GitOps 적용

**이 패치를 한 번에 sync하지 않는다.** Chat replica 0과 suspend 상태는 앱 시작을 막지만, CNPG의 새 Secret volume 참조는 즉시 공유 PostgreSQL에 영향을 준다. 다음 단계별 Git commit과 Argo sync로 준비한다.

1. **Secret/RBAC**: 이미지 식별자를 먼저 확정한다. Chat의 두 DopplerSecret, 필요한 Role resourceNames와 Gateway/DB 생성용 키 참조를 반영한다. Operator reconcile 성공과 필요한 Secret의 key 존재를 확인한다. 값은 출력하지 않는다.
2. **DB 접근 및 생성**: `gaegaeting-chat-db-identity`가 준비된 뒤에만 CNPG `cluster-patch.yaml`의 projected volume/HBA를 적용한다. 기존 reject 규칙과 다른 DB 규칙을 유지한다. Chat 전용 `gaegaeting-chat-db-provision-v1`만 Git에서 suspend를 해제하고 성공을 확인한다. 기존 Account/Match DB 생성 Job은 재실행하지 않는다.
3. **Chat migration 및 서버**: 확정한 Chat 이미지로 신규 migration Job을 실행하고 두 migration의 완료를 확인한다. Kafka에 설정된 prefix의 `chat.room.created.v1` 토픽이 준비됐는지 확인한다. 자동 토픽 생성이 제한된 broker라면 Kafka 관리 절차의 선언된 Job으로 먼저 준비하고 완료를 확인한다. 이후 Chat replica를 1로 설정한다. `/chat/health/ready`가 DB query를 통과하는지 확인한다. Match/Kafka ingress를 이 단계까지 준비한다.
4. **연동 rollout**: Match의 새 GraphQL 계약을 먼저 배포한다. 준비된 Chat을 Gateway의 `CHAT_SERVICE_URL`로 연결하고 Gateway 이미지를 갱신한다. Envoy WebSocket 경로와 checksum annotation을 함께 반영해 설정이 실제 로드되도록 한다. 마지막으로 사용자 UI 이미지를 갱신한다.
5. **릴리즈 검증**: 확정된 `release-images.json`과 실제 운영 상태에 대해 K3s의 `scripts/gaegaeting_validate.py --release` 및 저장소 release 검증 절차를 실행한다. placeholder가 남은 준비본은 release gate 통과 상태가 아니다.

Envoy는 `/gateway/graphql`과 `Upgrade: websocket`이 모두 맞는 경로에서만 HTTP ext_authz를 생략한다. WS 인증은 Gateway가 bearer를 받는 초기 메시지와 구독/주기 검증에서 수행한다. 기존 HTTP GraphQL의 ext_authz, fail-closed 정책과 클라이언트 assertion 헤더 제거는 유지한다. 이는 Envoy의 [per-route WebSocket 설정](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/http/upgrades)과 [ext_authz per-route 설정](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/ext_authz_filter)에 따라 준비했다.

## 배포 후 확인과 되돌리기

- 기존 로그인·매칭 조회, 두 매칭 사용자의 방 생성·송수신·읽음, 새로고침 후 메시지 보존, WS 재연결 후 누락 복구를 확인한다.
- 제3자의 방 접근, 잘못된 origin, 인증 누락과 철회된 토큰을 거절하는지 확인한다. 활성 매칭이 취소되면 새 전송을 차단해야 한다.
- DB/migration 실패 시 연동 rollout을 시작하지 않는다. 앱 문제는 Git에서 사용자 UI와 Gateway를 이전 digest/설정으로 돌리고 Chat replica를 0으로 낮춰 Argo가 반영하게 한다. 새 WS 프록시 설정을 되돌릴 때도 checksum을 갱신한다.
- Chat DB·계정·테이블은 보존하며 역 migration이나 데이터 삭제는 수행하지 않는다. Kubernetes 직접 apply/patch/scale 또는 rollout undo/restart로 GitOps를 우회하지 않는다.

검증 결과는 [배포 준비 기록](../../docs/plans/2026-10-03-chat-dev-deployment.md)을 따른다.
