# Challenge

공유 산책코스·개인 산책 기록·일기와 챌린지 참여·실적·보상 판정을 소유하는 독립 NestJS 서비스다. Match를 의존하지 않고 자체 PostgreSQL DB와 마이그레이션을 사용한다. 제품 전체 흐름은 [산책코스·챌린지 기획안](../../docs/plans/2026-10-05-walking-routes-and-challenges.md)을 참고한다.

## 구현 범위

| 종류 | 조건 | 보상 코드 |
| --- | --- | --- |
| `NEIGHBORHOOD_EXPLORER` | 참여 후 14일 동안 타인이 작성한 서로 다른 코스 3개 완주 | `NEIGHBORHOOD_EXPLORER_BADGE` |
| `WALK_DIARY` | 참여 후 7일 동안 서로 다른 3일에 이동한 산책의 사진·기분이 있는 일기 저장 | `WALK_DIARY_CARD` |

코스 작성·공개 검토·주변 검색·저장·신고, 본인 산책 GPS 저장·완주 판정·여권, 일기 본문·기분·사진 저장·공개 후기를 구현했다. 산책 종료와 일기 변경 시 원본과 실적을 같은 DB 트랜잭션에서 반영한다. 사용자 화면은 Flutter 앱 에이전트가 연결하며 [Flutter API 인계 문서](docs/flutter-integration.md)와 [GraphQL 스키마](schema.graphql)를 사용한다. 시간대 챌린지는 이번 범위에 포함하지 않는다.

## 서비스 내부 모듈

`ChallengeModule`이 다음 여섯 기능 모듈을 조합한다. 각 기능 안에 `domain`, `application`, `infrastructure`를 두며 서비스·리졸버·컨트롤러를 해당 Nest 모듈에서 등록한다.

| 모듈 | 책임 | 진입점 |
| --- | --- | --- |
| [CatalogModule](src/catalog/catalog.module.ts) | 종류·기간·목표·보상·정책 버전 정의와 조회 | `challenges` |
| [ParticipationModule](src/participation/participation.module.ts) | 참여·취소·참여 내역, 실적을 통한 진행률·완료·보상 판정 | `joinChallenge`, `cancelChallenge`, `myChallenges`, `myChallenge` |
| [ActivityModule](src/activity/activity.module.ts) | 원본 명령/외부 검증 실적의 버전·중복·수정·삭제 처리 | 내부 `PUT /activities`, 원본 트랜잭션 내 실적 갱신 |
| [RouteModule](src/route/route.module.ts) | 코스 원본·공개 경로·주변 검색·검토·저장·신고 | `walkingRoutes`, `createWalkingRoute`, `reviewWalkingRoute` |
| [WalkModule](src/walk/walk.module.ts) | 본인 GPS·정지 구간·코스 스냅샷·완주·여권 | `startWalk`, `appendWalkPoints`, `finishWalk`, `myWalkingPassport` |
| [DiaryModule](src/diary/diary.module.ts) | 본문·기분·검증한 사진·공개 후기·사진 정리 | `saveWalkingDiary`, `walkingRouteReviews`, 사진 업로드 API |

참여 모듈은 Catalog가 공개한 `ChallengeCatalogQueries`로 정의를 읽고 참여 시점의 정책을 고정한다. 실적 모듈은 참여 모듈을 의존하지 않는다. 참여 진행률 계산은 실적의 도메인 데이터와 인정 조건을 사용한다. 보상은 현재 완료 여부에서 파생하는 코드이므로 참여 도메인에 둔다. 별도 지급·회수·사용 이력이 생기면 그때 보상 모듈의 경계를 정한다.

`shared`에는 한국 날짜 계산, 시계, 내부 서버 인증, Account 조회와 사용자별 공통 트랜잭션이 있다. 기능별 저장소 포트와 ORM 어댑터를 각 모듈에 두고 `ChallengeSession`으로 같은 트랜잭션을 공유한다. 중첩한 같은 사용자 실적 반영은 기존 트랜잭션을 재사용한다. Account·스토리지 네트워크 작업은 원본 DB 트랜잭션 밖에서 수행한다.

`user-data`는 원본·참여·실적 삭제, 사진 정리 예약과 탈퇴 표식을 한 트랜잭션으로 처리한다. 사진 삭제는 DB의 작업을 읽는 워커가 60초 주기로 재시도한다. 산책 삭제 시 일기·사진과 해당 산책에서 만든 코스를 제거하고 시작 요청 중복 방지용 최소 삭제 표식을 남긴다. 탈퇴 시 이 표식도 삭제한다. 다른 보호자의 개인 산책에 이미 저장된 공개 코스 스냅샷과 완주 이력은 유지한다.

### 테이블과 데이터 공개 경계

| 테이블 | 실제 저장 데이터/제약 |
| --- | --- |
| `walking_record` | 본인 GPS JSON(위도·경도·수집 시각·정확도·구간), 반려견·코스 스냅샷, 시작/종료·거리·완주. 사용자별 진행 중 1개, 시작 요청 UUID 중복 방지 |
| `walking_route` | 원본 산책 FK, 사용자가 선택한 공개 좌표 JSON, 소개·장소·특징·검토 상태. 공개 좌표에는 시각·정확도 없음 |
| `walking_diary` | 본문·기분·사진 ID·공개 여부·날짜·버전. 산책당 1개, 보호자/코스별 공개 후기 1개 |
| `walking_photo` | 소유자·산책 FK·업로드/확정 객체 키·검증 상태. 사진 바이트는 비공개 스토리지 |
| `walking_route_bookmark` | 보호자/코스별 저장 1개 |
| `walking_route_report` | 보호자/코스별 신고 사유·설명·처리 여부 |
| `walking_media_cleanup` | 삭제할 객체 키·다음 실행 시각·재시도 횟수 |
| `challenge_enrollment` | 참여 기간·정책 스냅샷·취소 상태 |
| `challenge_activity` | 원본 ID·버전·거리·완주/사진/기분 등 챌린지 판정용 사실. 좌표·본문·사진 바이트는 중복 저장하지 않음 |
| `challenge_deleted_user` | 탈퇴 사용자 ID, 늦은 재전송 방지 |

`migrations`는 서비스 전용 SQL 마이그레이션이며 서버 시작 시 자동 실행하지 않는다. 기존 참여/실적 스키마 뒤에 `WalkingContent1791187200000`을 적용한다. 이력은 `challenge_migrations`에 기록한다. 다른 서비스 DB와 FK를 연결하지 않고 Account 사용자 ID만 보관한다.

일기는 기본 비공개다. 본인만 전체 GPS·개인 일기를 조회한다. 다른 사용자는 공개 승인된 코스의 선택 경로와 명시적으로 공개한 완주 일기를 볼 수 있다. 공개 일기는 한국 날짜만 노출하며 정확한 산책 시각·개인 원본 경로를 반환하지 않는다. 사진은 실제 PNG 검증 후 픽셀만 재인코딩하고 5분 서명 URL로 조회한다.

## 실행

루트에서 Node **24.13.1**, pnpm **10.34.5**를 사용한다.

```bash
nvm use
corepack enable
pnpm install --frozen-lockfile
cp packages/challenge/.env.example packages/challenge/.env
```

전용 PostgreSQL DB(권장 이름 `ggt_challenge`)를 준비하고 `.env`에 연결 정보를 채운다. `INTERNAL_AUTH_ASSERTION_SECRET`은 Gateway와 같은 값, `CHALLENGE_ACTIVITY_SECRET`은 실적 생산 서버와 공유하는 별도 값으로 설정한다. 두 비밀은 각각 32자 이상이어야 한다. 실적 비밀은 앱/브라우저에 전달하지 않는다. `ACCOUNT_SERVICE_URL`은 본인 프로필·반려견 확인용 Account GraphQL 주소다(기본 localhost:2800/account/graphql).

```bash
pnpm --filter 'challenge...' build
# Challenge DB의 DATABASE_*를 프로세스 환경변수로 주입한 셸에서 실행한다.
pnpm --filter challenge migration:run

pnpm dev challenge
# 전체 연결 실행: 각 서비스의 .env와 외부 의존성이 준비된 경우
pnpm dev account match challenge gateway
```

마이그레이션 명령은 `.env`를 읽지 않는다. `pnpm dev`는 서비스별 `.env`를 읽고 셸 환경변수를 우선한다. 기본 `pnpm dev` 대상은 account·match·gateway이며, Challenge는 명시적으로 선택한다. challenge와 gateway를 함께 선택하면 실행기가 로컬 Challenge URL을 설정한다. Gateway를 따로 실행하거나 배포할 때는 `CHALLENGE_SERVICE_URL=http://localhost:2803/challenge/graphql`에 해당 환경의 주소를 지정한다. 이 값이 없으면 Challenge subgraph를 추가하지 않는다.

| 용도 | 기본 주소 |
| --- | --- |
| 상태 확인 | `http://localhost:2803/challenge/health` |
| 내부 subgraph | `http://localhost:2803/challenge/graphql` |
| 사용자 GraphQL | `http://localhost:4000/gateway/graphql` |

Docker 빌드 대상은 `challenge`, 런타임 포트는 2803다. 실행·이미지 자동화는 [이미지 배포 계약](../../docs/image-delivery.md)을 따른다.

### 사진 저장소

`STORAGE_HOST`, `STORAGE_REGION`, `STORAGE_WALKING_BUCKET`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`를 모두 지정한다. Challenge 전용 **비공개** 버킷을 사용하고 서비스 계정에 해당 버킷의 읽기·쓰기·삭제 권한을 부여한다. 설정이 없으면 사진 예약/조회 작업은 503으로 실패하며 나머지 코스·산책·텍스트 일기는 사용 가능하다. 업로드 예약은 산책당 4개, PNG 파일은 5MiB 및 가로·세로 각각 1600px 이하를 검증한다.

업로드 URL은 5분 유효하며 임시 파일과 확정 파일을 다른 키에 저장한다. 확정 전 파일 쓰기 실패나 프로세스 종료에도 청소할 수 있도록 삭제 예약을 먼저 남긴다. 확정 완료 시 예약을 취소한다. 임시 파일은 URL 만료 후 제거하고, 미완료 예약은 1시간 후 정리한다. 정리 실패는 DB에 남아 다음 주기에 재시도한다. 운영 시 정리 작업 적체와 스토리지 실패를 모니터링한다.

## 사용자 API

사용자는 Gateway에 액세스 토큰을 보낸다. Challenge는 issuer `gaegaeting-gateway`, audience `challenge`인 내부 assertion을 검증한다. 사용자 ID는 검증된 principal에서만 가져온다.

| GraphQL | Scope | 동작 |
| --- | --- | --- |
| `challenges` | `challenge:read` | 참여 가능한 챌린지 정의 |
| `myChallenges(limit: Int = 20)` | `challenge:read` | 내 참여 내역. 최대 50개 |
| `myChallenge(id: ID!)` | `challenge:read` | 내 참여 상세 |
| `joinChallenge(input: JoinChallengeInput!)` | `challenge:write` | 참여. `kind`, UUID `requestId` 필수 |
| `cancelChallenge(id: ID!)` | `challenge:write` | 진행 중·확인 중인 참여 취소. 성공 시 `true` |

```graphql
mutation Join($requestId: String!) {
  joinChallenge(input: {
    kind: NEIGHBORHOOD_EXPLORER
    requestId: $requestId
  }) {
    id kind title status progressCount targetCount
    joinedAt endsAt settlesAt earnedRewardCode policyVersion
  }
}

query Mine {
  myChallenges(limit: 20) {
    id kind title status progressCount targetCount earnedRewardCode
  }
}
```

참여 버튼을 누를 때 UUID를 생성하고 네트워크 재시도에는 같은 `requestId`를 사용한다. 같은 사용자·요청 ID는 동일 참여를 반환하며, 다른 종류에 재사용하면 충돌한다. 같은 종류는 한 번에 하나만 참여할 수 있다. 완료했더라도 정산 시각까지 새 참여를 제한한다. 취소 후에는 새 요청 ID로 즉시 다시 참여할 수 있다. 완료·만료된 참여는 취소할 수 없다.

인증 bootstrap 정의에 `challenge:read`, `challenge:write`를 추가했다. 기존 Auth tenant·client를 실제로 변경한 것은 아니다. 연결 환경의 허용 scope와 사용 클라이언트의 요청 scope도 맞춰야 한다. 기존 client 설정이 다르면 bootstrap은 자동 덮어쓰기 대신 중단하므로 설정을 확인하고 반영한다.

## 기간·실적·보상 정책

- 참여 날짜를 한국 시간 1일째로 계산한다. `endsAt`은 마지막 날 다음 날 00:00의 **미포함 경계**, `settlesAt`은 그로부터 24시간 후다. 참여 전에 시작한 산책은 인정하지 않는다.
- 산책은 `endsAt` 전에 끝나야 한다. 일기는 산책 종료일과 같은 한국 날짜이면서 `endsAt` 전에 저장해야 한다. 이동 거리가 0이면 인정하지 않는다.
- 인정 조건을 충족한 실적이 산책 종료 후 24시간 이내이면서 `settlesAt` 전에 도착해야 한다. 마지막 날 이후에는 새 산책을 인정하지 않고 기존 기록의 전송만 기다린다.
- 탐험대는 서로 다른 타인 코스, 일기는 서로 다른 한국 날짜를 센다. 같은 코스·날짜의 반복이나 반려견 수로 진행률을 늘리지 않는다.
- 상태는 `ACTIVE`, 전송 유예 중인 `VERIFYING`, `COMPLETED`, `EXPIRED`, `CANCELLED`다. 종료 시각을 조회할 때 판정하므로 별도 만료 스케줄러가 필요 없다.
- 참여 시 목표·보상·기간·정책 버전을 고정한다. `earnedRewardCode`는 현재 유효한 실적을 기반으로 완료했을 때만 반환한다. 외부 재화 지급이나 이미지 카드 생성은 수행하지 않는다.
- 실적 수정·삭제로 조건을 잃으면 완료 상태와 보상 코드도 재계산한다. 기분 값처럼 인정 여부를 바꾸지 않는 수정은 최초 인정 수신 시각을 유지한다. 늦은 변경으로 사진 등 필수 조건을 새로 갖춘 기록은 유예를 소급 적용하지 않는다.

## 내부 실적 전달 계약

이 서비스의 Walk/Diary 명령은 HTTP 없이 같은 DB 트랜잭션에서 실적을 반영한다. 아래 API는 별도 신뢰 생산자를 위한 호환 계약이다. 원본 좌표와 본문은 위 원본 테이블에 저장하며 아래 facts에 넣지 않는다.

생산 서버가 `Authorization: Bearer <CHALLENGE_ACTIVITY_SECRET>`으로 다음 API를 호출한다. 외부 ingress에 이 경로를 노출하지 않는다. 사용자 JWT나 Gateway assertion으로 실적을 등록할 수 없다.

`PUT /challenge/internal/v1/activities`는 **전체 최신 스냅샷**을 받는다. 아래 시간·ID는 형식 예시이며 실제 검증된 값으로 전송한다.

```json
{
  "userId": "01K6P000000000000000000001",
  "kind": "WALK",
  "sourceId": "walk-123",
  "revision": 1,
  "deleted": false,
  "facts": {
    "walkId": "walk-123",
    "walkStartedAt": "2026-10-05T09:00:00+09:00",
    "walkEndedAt": "2026-10-05T09:30:00+09:00",
    "distanceMeters": 1200,
    "routeId": "route-456",
    "routeAuthorId": "01K6P000000000000000000002",
    "completed": true
  }
}
```

일기는 동일 API에 별도 원본 ID로 전달한다. 코스 없는 일반 산책도 일기 실적이 될 수 있다.

```json
{
  "userId": "01K6P000000000000000000001",
  "kind": "DIARY",
  "sourceId": "diary-789",
  "revision": 1,
  "deleted": false,
  "facts": {
    "walkId": "walk-123",
    "walkStartedAt": "2026-10-05T09:00:00+09:00",
    "walkEndedAt": "2026-10-05T09:30:00+09:00",
    "distanceMeters": 1200,
    "diarySavedAt": "2026-10-05T10:00:00+09:00",
    "hasPhoto": true,
    "mood": "HAPPY"
  }
}
```

응답은 적용 시 `{"result":"APPLIED"}`, 중복·과거 버전·삭제된 원본이나 탈퇴 계정의 재전송에는 `{"result":"IGNORED"}`다. 잘못된 데이터는 400, 다른 산책으로 원본 연결을 바꾸면 409다.

생산자는 다음 계약을 보장해야 한다.

1. 원본 저장과 전달 예약을 함께 보장하는 outbox 등으로 저장 후 유실을 막고 실패 시 재시도한다. 동일 서비스의 Walk/Diary는 공유 트랜잭션으로 이 보장을 제공한다.
2. `(userId, kind, sourceId)`별 단조 증가 정수 `revision`을 사용한다. 같은 버전의 내용은 바꾸지 않는다. 먼저 도착한 최신 버전보다 낮거나 같은 버전은 무시한다.
3. 사용자 소유권, 제출 GPS의 이동·완주 판정, 코스 작성자, 일기 저장 시각·사진·기분을 원본 서비스에서 검증한다. Challenge는 이 검증 결과를 신뢰하며 원본 DB를 재조회하지 않는다.
4. 산책 변경이 일기에 영향을 주면 관련 `DIARY` 스냅샷도 새 버전으로 전달한다. `WALK.sourceId`는 `facts.walkId`와 같아야 하며 기존 일기를 다른 산책에 재연결할 수 없다.
5. 원본 좌표·사진 URL·일기 본문을 전송하지 않는다. 알려지지 않은 필드는 거부한다. 시각은 시간대가 포함된 ISO 문자열이며 미래 시각은 거부한다.

### 삭제와 탈퇴

원본 삭제 시 같은 ID와 더 높은 버전으로 `deleted: true`, `facts: null`을 전송한다. 삭제 표식은 최종 상태이므로 이후 더 높은 버전이 와도 복구하지 않는다. 새 기록에는 새 ID를 사용한다.

```json
{
  "userId": "01K6P000000000000000000001",
  "kind": "WALK",
  "sourceId": "walk-123",
  "revision": 2,
  "deleted": true,
  "facts": null
}
```

삭제한 실적의 사실 데이터와 발생 시각은 비운다. 산책 삭제는 연결된 일기 실적도 무효로 만든다. 별도 생산자는 일기 원본 삭제와 `DIARY` 삭제도 전달해야 한다. 이 서비스의 `deleteWalk`는 원본 일기·사진 제거와 두 실적 삭제를 함께 처리한다. 삭제 표식이 일기보다 먼저 도착한 경우에도 나중에 들어온 일기로 보상이 복구되지 않는다.

탈퇴 확정 시 Account의 서버 작업이 `DELETE /challenge/internal/v1/users/:userId`를 같은 내부 인증으로 호출해야 한다. 응답은 204이고 반복 호출할 수 있다. 코스·산책·일기·사진 메타데이터·참여·실적을 제거하고 사진 정리를 예약한다. 또한 지연 메시지로 데이터가 다시 생성되지 않도록 사용자 ID만 가진 탈퇴 표식을 남긴다. 해당 ID의 새 참여는 거부하고 이후 실적은 무시한다. 이 탈퇴 호출 역시 원본 Account 흐름에 후속 연결해야 한다.

## 검증

```bash
pnpm --filter challenge test --runInBand
pnpm --filter challenge exec tsc -p tsconfig.spec.json --noEmit
pnpm --filter challenge format
```

기본 실행은 챌린지·좌표·사진·Account 어댑터 테스트를 수행하고 DB 통합 테스트는 건너뛴다. 통합 테스트는 **비워도 되는 전용 로컬 DB**를 준비한 뒤 아래와 같이 실행한다. 각 테스트가 테이블 데이터를 지우므로 공유 DB를 사용하지 않는다. 테스트는 localhost와 `challenge_test_`로 시작하는 DB 이름만 허용한다.

```bash
CHALLENGE_INTEGRATION_TESTS=1 \
DATABASE_HOST=127.0.0.1 DATABASE_PORT=5432 \
DATABASE_USERNAME=challenge_test DATABASE_PASSWORD=challenge_test \
DATABASE_NAME=challenge_test_local \
pnpm --filter challenge test --runInBand
```

검증 결과와 실제 외부 환경에서 확인할 항목은 [구현 검증 기록](docs/verification.md)을 참고한다. 통합 테스트는 실제 PostgreSQL, 서명된 사용자/관리자 assertion, HTTP GraphQL과 삭제 API를 사용한다. 사진 객체 저장은 테스트 어댑터로 검증하며 운영 S3 연결·Flutter 기기 GPS·배포는 별도 확인 대상이다.
