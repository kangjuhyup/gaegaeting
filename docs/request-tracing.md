# HTTP 요청 추적

Gateway는 HTTP 요청을 받으면 `x-trace-id`를 한 번 결정한다. 클라이언트가 보낸 유효한 ID는 유지하고, 값이 없거나 잘못되면 UUID v4를 생성한다. ID는 1~128자의 영문·숫자·`.`·`_`·`-`로 구성하며 첫 글자는 영문 또는 숫자다. 중복 헤더나 쉼표로 합쳐진 값은 새 UUID로 대체한다.

동일한 ID를 다음 경로에서 사용한다.

- Gateway의 인증용 Account subject 조회와 모든 GraphQL 서브그래프 호출
- `HttpLoggerModule`을 사용하는 서비스의 HTTP 요청 로그와 요청 안에서 작성한 Pino 애플리케이션 로그 (`traceId` 및 `req.id`)
- 요청 처리 중 `FetchHttpClient`로 보내는 후속 HTTP 호출과 재시도
- Gateway 및 서비스의 `x-trace-id` 응답 헤더

Gateway는 완료 로그에 `traceId`, HTTP 메서드·경로·상태 코드·처리 시간을 기록한다. 인증 실패와 JSON 파싱 오류에도 ID가 응답 헤더와 로그에 남는다. 브라우저에서는 Gateway의 CORS 설정으로 `x-trace-id`를 보내고 응답 값을 읽을 수 있다. 클라이언트가 ID를 제공하면 요청별로 고유한 값을 사용한다.

```bash
curl -i http://localhost:4000/gateway/graphql \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <opaque-token>' \
  -H 'X-Trace-Id: debug-request-123' \
  --data '{"query":"{ __typename }"}'
```

공통 요청 컨텍스트는 `@core/util/trace`의 `requestTraceMiddleware`와 `getTraceId()`를 사용한다. `HttpLoggerModule`은 미들웨어를 자동 등록한다. 비동기 요청 컨텍스트는 요청별로 분리되며 HTTP 클라이언트의 기본 헤더를 변경하지 않는다. 활성 요청 안에서는 해당 요청의 ID가 호출자가 지정한 trace 헤더보다 우선한다.

이 계약은 HTTP 요청 기준이다. WebSocket 메시지, Kafka 이벤트, 예약 작업 및 직접 `fetch()`를 호출하는 외부 어댑터의 자동 전파는 포함하지 않는다. HTTP 밖에서 `FetchHttpClient`를 호출하면 새로운 trace ID를 자동 생성하지 않는다. Gateway의 스키마 조회와 개발용 probe에는 별도 ID를 부여한다.

## 검증 및 릴리즈

```bash
nvm use
pnpm install --frozen-lockfile
pnpm build:workspaces
pnpm --filter @core/util --filter @core/http --filter @core/logger --filter gateway test --runInBand
node --test scripts/request-trace.test.mjs
```

통합 테스트는 실제 Gateway에 요청을 보내 인증용 Account 조회, 두 서브그래프 분기 호출, Match→Account 후속 HTTP 호출, 서비스 및 Gateway 로그가 같은 ID를 사용하는지 확인한다. 동시 요청, 잘못된 ID, GraphQL 오류, 인증·파싱 오류와 CORS도 검증한다. PostgreSQL·Redis·Kafka는 필요하지 않으며 서비스 응답은 로컬 HTTP fixture를 사용한다.

여러 서비스가 사용하는 공통 변경이므로 `fix/core/request-trace-id → dev/core → release/core/<version> → main` 경로로 통합한다. `main` 반영 후 Gateway와 소비 서비스 이미지를 함께 갱신해야 전체 경로가 연결된다.
