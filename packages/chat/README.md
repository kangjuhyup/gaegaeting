# Chat Service (Go)

개개팅(gaegaeting) 채팅 서비스 - Go 구현

## 기술 스택

- **Language**: Go 1.21
- **Framework**: Gin (HTTP), Gorilla WebSocket
- **Database**: MySQL (GORM)
- **Cache**: Redis
- **Message Queue**: Kafka
- **Authentication**: JWT

## 아키텍처

헥사고날 아키텍처 (포트와 어댑터 패턴)를 따릅니다.

```
internal/
├── domain/              # 도메인 모델
│   ├── message/
│   └── room/
├── application/         # 비즈니스 로직
│   ├── port/           # 인터페이스 정의
│   └── service/        # 서비스 구현
└── infrastructure/      # 인프라 구현
    ├── config/
    └── adapter/
        ├── inbound/    # 인바운드 어댑터 (HTTP, WebSocket)
        └── outbound/   # 아웃바운드 어댑터 (DB, Kafka, Redis)
```

## 주요 기능

### REST API

- **채팅방 관리**
  - `POST /api/v1/rooms` - 채팅방 생성
  - `GET /api/v1/rooms` - 사용자 채팅방 목록
  - `GET /api/v1/rooms/:roomId` - 채팅방 조회
  - `PATCH /api/v1/rooms/:roomId/status` - 채팅방 상태 변경

- **메시지 관리**
  - `POST /api/v1/messages` - 메시지 전송
  - `GET /api/v1/messages/room/:roomId` - 메시지 목록
  - `PATCH /api/v1/messages/:messageId/read` - 읽음 처리
  - `GET /api/v1/messages/room/:roomId/unread-count` - 안읽은 메시지 수

### WebSocket

- `GET /api/v1/ws/chat/:roomId` - 실시간 채팅 연결

WebSocket 메시지 타입:
- `message` - 메시지 전송
- `typing` - 타이핑 중 표시
- `read` - 읽음 표시

## 환경 변수

```env
# Server
CHAT_PORT=3003
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=gaegaeting

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Kafka
KAFKA_BROKER=localhost:9092
KAFKA_GROUP_ID=chat-service

# JWT
JWT_SECRET=your-secret-key
```

## 실행 방법

### 로컬 실행

```bash
# 의존성 설치
go mod download

# 실행
go run cmd/server/main.go
```

### Docker 실행

```bash
# 빌드
docker build -t gaegaeting-chat .

# 실행
docker run -p 3003:3003 gaegaeting-chat
```

## Kafka 이벤트

발행하는 이벤트:
- `chat.message.created` - 메시지 생성됨
- `chat.message.read` - 메시지 읽음
- `chat.room.created` - 채팅방 생성됨

## 다른 서비스와의 연동

- **Account Service**: JWT 토큰 검증을 통한 사용자 인증
- **Match Service**: 매칭 성공 시 채팅방 자동 생성 (Kafka 이벤트 구독)

## 테스트

```bash
# 유닛 테스트
go test ./...

# 통합 테스트
go test -tags=integration ./...
```

## API 문서

서버 실행 후 `/health` 엔드포인트로 헬스체크 가능합니다.
