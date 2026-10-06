# Chat 원격 개발 배포 준비 — 2026-10-03

사용자 요청은 Chat 기능의 배포 준비다. Chat 기능 후보와 원격 개발 환경의 연결 변경을 검토 가능한 상태로 만들며, 실제 원격 rollout과 main 병합은 이 작업에서 실행하지 않는다.

## 준비 결과

- 브랜치: `feat/core/chat-messaging → dev/core`. main `6743d8e6b77642be3e6d96353251445f68061e60`에 출시된 HTTP trace, Account 사진 요청 알림과 Match 수정까지 병합해 보존했다. Account는 이번 Chat 앱 rollout 대상에 추가하지 않는다.
- 신규 Chat 서버·DB migration 및 Match/Gateway/사용자 UI 연결은 [기능 기록](2026-10-03-chat.md)과 [Chat 계약](../../packages/chat/README.md)을 따른다.
- 사용자 UI 서버 CSP에 설정된 API origin의 `wss:` 연결을 추가했다. 관리자 UI에는 해당 연결을 추가하지 않는다.
- Chat에 DB 연결을 확인하는 `/chat/health/ready`를 추가하고, DB 장애 시 readiness 503 및 liveness 유지 동작을 검증한다.
- Docker build context에서 로컬 DB 데이터 디렉터리와 `.yarn`을 제외했다. `BUILDPLATFORM`을 명시적으로 선언했다. 서비스별 production 패키징 stage를 분리해 BuildKit이 선택한 이미지의 production 패키지만 생성하도록 했다. 공통 workspace 빌드는 유지한다.
- [K3s 준비 패치](../../deploy/chat-dev/k3s-preparation.patch)와 [환경 키·적용 순서·복구 절차](../../deploy/chat-dev/README.md)를 작성했다. K3s 원본과 Auth 저장소는 수정하지 않는다.

## 배포 범위

새 앱 이미지는 Chat/Match/Gateway/integration-ui 4개만 선택한다. Account/edge-authz/admin-ui 이미지 및 기존 Account/Match migration 참조는 보존한다. Envoy는 이미지 변경 없이 WS 설정과 Pod template checksum을 변경한다. Chat DB 생성, Secret/RBAC, CNPG HBA와 Match/Kafka ingress는 Chat 연결에 필요한 범위다.

K3s 패치 기준은 `b04027fb2f7ebed10b170b515a36621032e07e31`이다. 작업 중 완료된 Doppler `stg` 전환을 반영했으며, 원본의 다른 미커밋 파일은 건드리지 않는다. Chat replica는 0, 신규 DB 생성/migration Job은 suspend 상태다. CNPG projected identity Secret은 반드시 Secret 준비 뒤 별도 단계로 적용한다.

## 발행 및 원격 적용 전 남은 항목

1. 기능 PR 검증과 dev/core 통합 후 릴리즈 후보의 전체 diff에서 다른 미출시 기능이 섞이지 않았는지 확인한다. main release는 기존 규칙대로 squash한다.
2. main 커밋의 CI/GHCR 이미지 발행을 확인하고 패치의 Chat SHA/digest placeholder를 대체한다. 로컬 검증 이미지를 원격 발행 완료로 간주하지 않는다.
3. Doppler Chat DB·연동 키를 실제 값으로 공급하고 Operator reconcile을 확인한다. Git에는 값을 기록하지 않는다.
4. K3s release manifest에 Chat과 해당 migration을 추가하고, 기존 migration 식별자를 유지한다. 단계별 GitOps 적용과 원격 두 사용자 smoke 검증을 수행한다.

빌드와 테스트 통과는 위 원격 적용 확인을 대신하지 않는다. 이번 준비 작업의 완료 기준은 로컬 후보 검증 및 적용 가능한 인프라 변경안과 배포 순서 제공이다.

## 로컬 검증 결과

- Node 24.13.1 / pnpm 10.34.5 frozen lockfile 설치와 최신 main을 포함한 전체 workspace 빌드 성공.
- 전체 workspace 테스트 420개 통과. Chat 21개는 배포 환경과 같은 PostgreSQL 18.4 이미지의 UTF-8 QA DB, 실제 Kafka, Gateway HTTP Federation/WS 및 readiness 장애 검증을 포함한다. Match 94개 통과; 별도 Match 테스트 DB가 필요한 11개는 건너뜀.
- UI 테스트 20개와 Node 계약 테스트 84개 통과.
- 서비스별 패키징을 적용한 ARM64 Chat 이미지를 BuildKit으로 빌드하고 production runtime 및 서버/migration entrypoint smoke를 확인했다. 로컬 검증 태그는 `gaegaeting-chat:prep-20261003`이며 원격 게시 이미지가 아니다.
- K3s dev Kustomize 렌더링과 구조 검증, 현재 원본에 대한 patch 적용 가능성 확인. Chat 비활성/Job suspend, stg Secret 참조, HTTP 인증 유지, WS 전용 필터 설정과 프록시 checksum 일치 확인.
- 현재 K3s에 고정된 Envoy 1.37.5 이미지에서 실제 config validate 성공. 비공개 upstream 주소는 테스트용 주소로 대체해 검증했다.
- `scripts/gaegaeting_validate.py`의 구문을 확인했다. GHCR 식별자와 Doppler 실제 값이 아직 준비본에 확정되지 않아 원격 release gate는 실행하지 않는다.
- 테스트용 PostgreSQL 컨테이너 두 개를 종료했다. 기존 다른 서비스 컨테이너와 데이터는 유지한다.
- PR 검증에서 지적된 CI의 테스트용 고정 비밀번호를 제거하고 임시 DB의 trust 인증을 사용한다. Chat sync와 WS 초기 연결 처리를 분리한 뒤 대상 서비스/UI 빌드와 비밀번호 없는 PG18.4/Kafka/WS 테스트 21개, UI20개, Node84개를 다시 확인했다.
- 사용자 요청으로 UI와 Account/Match/Chat/Gateway를 로컬 실행했다. 개발용 Doppler를 프로세스에 주입하고 기존 로컬 Account/Match DB를 유지하며 새 Chat DB와 필요한 Kafka 토픽만 준비했다. 모든 health/readiness와 UI는 200, 인증 없는 GraphQL은 401, 인증 없는 WS는 4401을 확인했다. 로컬 실행 설정·로그는 ignored `.tmp/local-runtime-20261003`에 두며 secret 값은 설정 파일에 기록하지 않는다.
