# Chat

매칭된 두 사용자의 텍스트 채팅을 PostgreSQL에 저장하는 NestJS Apollo Federation 2 서비스다. 소비자 UI는 Gateway GraphQL query/mutation으로 대화를 조회·전송하고, WebSocket subscription으로 변경 신호를 받아 저장된 메시지를 다시 조회한다.

## 도메인 구조

```text
src/
  room/         # 매칭별 방 생성, 방 목록, 참여 가능한 방 조회
  participant/  # 참여자 권한, 읽음 위치
  message/      # 메시지 전송, 멱등 재시도, 커서 조회
  common/       # 인증 연결, PostgreSQL 연결, 실시간 변경 전파
  migrations/   # Chat 서비스의 SQL migration
```

room, participant, message에는 각각 domain/application/infrastructure가 있다. 읽음 상태는 participant의 `lastReadMessageId`로 관리한다. 방과 두 참여자는 한 트랜잭션에서 생성한다. Match는 별도 서비스이며 Chat이 Match/Account DB를 직접 조회하지 않는다. 상세 계약은 [구현 범위](../../docs/plans/2026-10-03-chat.md)를 따른다.

## 로컬 실행

저장소 루트에서 `.nvmrc`의 Node 24.13.1과 pnpm 10.34.5를 사용한다.

```sh
pnpm install --frozen-lockfile
pnpm --filter chat... build
cp packages/chat/.env.example packages/chat/.env
```

로컬 PostgreSQL에 Chat 전용 DB와 계정을 만든 뒤 `.env`의 DB 접속 정보와 `INTERNAL_AUTH_ASSERTION_SECRET`을 설정한다. 내부 assertion secret은 Gateway, Match, Chat이 같은 값을 사용한다. 실제 비밀번호와 secret은 커밋하지 않는다.

```sh
pnpm --filter chat migration:run
```

이 명령은 기존 공통 Chat baseline과 ChatMessaging 추가 migration을 `chat_migrations`에 기록한다. 실행 이력이 있는 DB에서도 재실행할 수 있다. 이미 저장된 텍스트가 공백뿐이거나 2000자를 넘으면 새 DB 제약 적용이 실패하므로 기존 데이터를 먼저 확인한다. ChatMessaging 적용 후에는 baseline만 아는 `@core/database`의 Chat baseline 실행 명령 대신 위 Chat migration 명령을 사용한다.

Match `.env`의 Kafka broker와 topic prefix를 Chat과 맞춘다. Kafka를 사용하지 않는 로컬 환경은 `CHAT_KAFKA_ENABLED=false`로 실행할 수 있다. 이 경우에도 채팅 목록을 열 때 활성 매칭을 조회해 방을 동기화한다.

Gateway `.env`에 다음을 설정한다.

```dotenv
CHAT_SERVICE_URL=http://127.0.0.1:2804/chat/graphql
CHAT_WS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Gateway는 WebSocket에서도 직접 opaque token을 검증하므로 기존 OIDC issuer, discovery, audience, introspection client 설정이 필요하다. HTTP 인증을 edge 방식으로 실행할 때도 Chat 연결을 활성화하면 이 설정이 필요하다. UI의 기존 Gateway URL은 그대로 사용한다.

```sh
pnpm dev account match chat gateway
pnpm dev:ui
```

Kafka consumer group은 `CHAT_KAFKA_GROUP_ID`, topic은 prefix가 있으면 `<prefix>.chat.room.created.v1`, 없으면 `chat.room.created.v1`이다. 이벤트 재처리와 구버전 Match payload를 지원하며 `pairId`로 방 중복을 막는다. Match의 이벤트 발행과 DB 커밋은 원자적이지 않으며 방 동기화와 전송 직전 활성 매칭 확인이 복구·권한 경계다.

## API와 권한

Chat 내부 주소는 `/chat/graphql`, Gateway 주소는 `/gateway/graphql`이다. REST는 `/chat/health`만 제공한다.

| 종류 | 필드 | 용도 |
| --- | --- | --- |
| Query | `chatRooms`, `chatRoom` | 내 방 목록과 방 상세 |
| Query | `chatMessages` | 최신, `before`, `after` 메시지 페이지 |
| Mutation | `syncChatRooms` | 내 활성 매칭의 방 복구 |
| Mutation | `sendChatMessage` | 본문과 UUID로 전송; 발신자는 인증 정보에서 결정 |
| Mutation | `markChatRead` | 같은 방의 실제 메시지까지 읽음 위치 전진 |
| Subscription | `chatEvents` | ROOM, MESSAGE, READ, RESYNC 변경 신호 |

기존 `match:read`/`match:write` scope를 사용하며 모든 방 접근에 참여자 검사를 적용한다. 메시지는 앞뒤 공백 제거 후 1~2000자, UUID v4가 필요하다. 같은 방·발신자·UUID의 재전송은 같은 메시지를 반환하고, 본문이 다르면 거절한다. 매칭이 취소되면 기록은 조회할 수 있지만 새 메시지는 보낼 수 없다. 매칭 취소와 메시지 전송은 서비스 간 원자적이지 않으며 전송 직전 Match 조회 시점이 기준이다.

WebSocket은 같은 Gateway 경로에서 `graphql-transport-ws`를 사용한다. opaque token은 URL이 아닌 `connection_init.payload.authorization`의 Bearer 값으로 전달한다. Gateway가 구독마다 새 내부 assertion을 발급하고, 유지 중인 연결도 30초마다 토큰을 재검증한다. 알림은 본문을 포함하지 않는다. PostgreSQL 커밋 후 LISTEN/NOTIFY 변경 신호를 보내며 연결 복구 시 UI가 커서 조회로 누락 메시지를 읽는다. 알림 자체는 영구 저장하지 않는다.

## 검증

```sh
pnpm --filter chat test --runInBand --no-cache
pnpm test:ui
pnpm build:workspaces
```

DB 통합 테스트는 `CHAT_TEST_DATABASE_URL`이 있을 때 실행한다. **해당 DB의 public schema를 초기화하므로 전용 테스트 DB만 사용한다.** 테스트는 loopback 호스트와 이름이 `_qa`로 끝나는 DB만 허용한다. 실제 서비스 DB를 넣지 않는다.

```sh
CHAT_TEST_DATABASE_URL=postgresql://chat_qa:chat_qa@127.0.0.1:5433/ggt_chat_qa pnpm --filter chat test --runInBand --no-cache
```

실제 Kafka 검증은 별도 `CHAT_TEST_KAFKA_BROKERS`를 지정한다. 테스트는 임의 UUID의 전용 topic/group만 생성·삭제한다. 로컬 Docker broker가 호스트에서 해석되지 않는 이름을 광고하면 테스트에만 `CHAT_TEST_KAFKA_HOST_ALIAS=kafka=127.0.0.1`처럼 DNS 별칭을 지정할 수 있다. CI는 PostgreSQL 통합 검증을 실행하고 Kafka 테스트는 broker를 지정하지 않으면 건너뛴다.

## 개발 배포 연결

Docker `chat` target과 변경 파일에 따른 이미지 선택에 Chat을 추가했다. 실제 배포에는 Chat DB와 migration 실행, Kafka 설정, Chat workload/service, Gateway `CHAT_SERVICE_URL`과 허용 UI origin을 등록해야 한다. WebSocket upgrade를 프록시가 지원하고 Gateway까지 전달해야 한다. 브라우저는 upgrade HTTP 요청에 Bearer 헤더를 넣을 수 없으므로 HTTP 헤더 기반 edge 인증이 이 요청을 먼저 거절하는 환경에서는 upgrade 정책을 별도로 맞춰야 한다. 실제 인증은 Gateway의 connection_init 검증이 수행한다.

이 작업은 Auth와 K3s 설정을 변경하지 않는다. 푸시 알림, 첨부파일, 입력 중 표시, 방 나가기, 삭제 및 보존 기간 정책은 아직 구현 범위에 포함하지 않았다.
