# Flutter 산책·코스·일기 연동 계약

2026-10-05 구현 기준. 백엔드는 `packages/challenge`이며 Flutter 화면·지도·단말 GPS 수집은 앱 에이전트가 이어서 구현한다. [실제 서비스에서 추출한 GraphQL 스키마](../schema.graphql)와 [서비스 실행/챌린지 정책](../README.md)을 함께 사용한다.

## 연결과 인증

- 앱은 기존 Gateway `/gateway/graphql`에 사용자 액세스 토큰을 보낸다. 읽기는 `challenge:read`, 쓰기는 `challenge:write` scope가 필요하다.
- 내부 subgraph `/challenge/graphql`, 내부 assertion 생성, `CHALLENGE_ACTIVITY_SECRET`은 서버 전용이다. 앱에서 실적을 직접 만들거나 `completed`, 이동 거리, 작성자 ID를 제출하지 않는다.
- 운영자 검토·신고 처리 API는 `ADMIN` 역할도 필요하다. 일반 사용자 화면에 운영자 권한을 가정하지 않는다.
- 산책 시작 시 서버가 Account의 `myProfile`과 `pets`로 프로필과 반려견 소유권을 확인한다. 최초 프로필 등록과 반려견 등록을 먼저 완료한다. Account 장애 시 새 산책 시작은 실패한다.
- ID는 문자열, 반려견 ID는 정수다. 날짜는 UTC ISO 8601로 전송한다. 일기 공개 날짜 `walkDate`는 한국 시간 기준 `YYYY-MM-DD`다.

## 화면과 조회 API

| 화면/상태 | Query | 반환 범위 |
| --- | --- | --- |
| 진행 중 산책 복구 | `myCurrentWalk` | 진행 중 1개 또는 `null` |
| 내 산책 상세 | `myWalk(id)` | 본인 좌표·수집 시각·정확도·구간·반려견·코스 스냅샷·완주 결과 |
| 내 산책 목록 | `myWalks(limit, offset)` | 본인의 삭제되지 않은 기록, 최신 시작순. 목록에서는 좌표 필드를 선택하지 않는다 |
| 주변 코스 | `walkingRoutes(input)` | 공개 코스, 시작점까지 가까운 순 |
| 코스 상세 | `walkingRoute(id)` | 공개 경로·소개·표시 이름·반려견 이름·고유 완주 인원·내 저장 여부 |
| 내가 만든 코스 | `myWalkingRoute(id)`, `myWalkingRoutes(limit, offset)` | 본인 초안·검토 상태·반려 사유·수정 버전 포함 |
| 저장한 코스 | `myBookmarkedWalkingRoutes(limit, offset)` | 현재 공개 중인 코스만 |
| 산책 여권 | `myWalkingPassport` | 완주 코스별 이름·완주 횟수, 최근 완주순 최대 100개 |
| 산책의 일기 | `myWalkDiary(walkId)` | 본인 일기 또는 `null` |
| 내 일기 | `myWalkingDiary(id)`, `myWalkingDiaries(limit, offset)` | 본문·기분·사진·공개 여부·버전·최초 저장 시각 |
| 코스 후기 | `walkingRouteReviews(routeId, limit, offset)` | 공개 일기의 본문·기분·사진·한국 날짜·표시 이름 |
| 업로드 복구 | `myWalkingPhotos(walkId)` | 본인 산책에 예약/확정한 사진 ID·상태·서명 URL |
| 챌린지 | `challenges`, `myChallenges`, `myChallenge(id)` | 정의와 현재 참여·진행률·보상 코드 |

목록 기본값은 `limit: 20`, `offset: 0`, 최대는 50개/offset 10000이다. 공개 DTO에 원본 산책 ID·보호자 내부 ID·좌표 수집 시각·정확도는 없다. 비공개 일기는 후기에서 조회되지 않는다.

`WalkingRecord.state`는 `RECORDING`, `PAUSED`, `FINISHED`다. 삭제된 기록은 조회되지 않는다. 코스 스냅샷은 산책 시작 시 고정되며 코스가 나중에 공개 중단되어도 진행 중 산책은 이 경로로 판정한다. 산책 여권의 반복 완주 횟수와 코스의 `walkerCount`는 다르다. `walkerCount`는 작성자를 제외한 서로 다른 완주 보호자 수다.

## 산책 기록 순서

1. 사용자 동작마다 UUID를 한 번 생성하고 `startWalk`를 호출한다. 응답 유실 시 같은 UUID와 같은 반려견·코스 ID로 재시도한다. 다른 기기에서 시작한 산책이 있으면 `myCurrentWalk`로 복구한다. 사용자당 진행 중인 산책은 하나다.
2. 응답의 `id`, `startedAt`, `segments`, `points.length`를 보관한다. 위치 권한을 얻고 좌표를 로컬 큐에 수집한다. 서버는 `startedAt` 이전·현재 서버 시각 이후 좌표를 거절하므로 기기 시각 오류를 처리한다.
3. `appendWalkPoints`에 **다음 저장 인덱스**와 최대 200개를 순서대로 보낸다. `recordedAt`은 엄격한 증가 순서여야 한다. 성공한 배치만 큐에서 제거한다. 하나의 산책에 여러 전송을 병렬로 보내지 않는다.
4. 일시정지는 `setWalkPaused(id, paused: true)`, 재개는 `false`다. 성공 응답의 `segments.length - 1`이 새 위치의 `segment`다. 이 조작은 온라인 서버 상태 변경이다. 정지 전 모은 배치는 해당 구간 시각 범위 내에서 뒤늦게 보낼 수 있다. 정지 중에는 위치를 수집/추가하지 않는다.
5. 끝낼 때 수집을 멈추고 남은 큐를 순서대로 전송한 뒤 `finishWalk(id, endedAt)`를 보낸다. 재시도에는 최초 종료 시각을 그대로 쓴다. 이미 종료한 산책의 좌표 추가와 다른 종료 시각은 충돌한다. 동일한 기존 배치 재전송은 허용한다.
6. 서버가 완주와 거리를 계산하고 챌린지에 자동 반영한다. 이어서 일기 저장이나 공개 코스 구간 선택 화면으로 이동한다.

```graphql
mutation Start($input: StartWalkInput!) {
  startWalk(input: $input) {
    id requestId state startedAt revision policyVersion
    pets { id name }
    segments { startedAt endedAt }
    points { latitude longitude recordedAt accuracyMeters segment }
    route { id title path { latitude longitude } }
  }
}
```

```json
{"input":{"requestId":"3eaf4417-31f4-4a3e-9ca5-0ab847ccfc1b","petIds":[1],"routeId":null}}
```

```graphql
mutation Append($input: AppendWalkPointsInput!) {
  appendWalkPoints(input: $input) { id state revision points { recordedAt } }
}
mutation Finish($id: ID!, $endedAt: DateTime!) {
  finishWalk(id: $id, endedAt: $endedAt) {
    id state endedAt distanceMeters coverage completed policyVersion
  }
}
```

```json
{
  "input": {
    "walkId": "<startWalk가 반환한 ID>",
    "fromIndex": 0,
    "points": [
      {"latitude":37.5,"longitude":127.0,"recordedAt":"2026-10-05T03:00:00.000Z","accuracyMeters":8,"segment":0}
    ]
  }
}
```

예시 시각은 실제 산책 시각으로 바꾼다. 좌표 최대치는 산책당 10,000개, 기간은 24시간, 선택 반려견은 1~6마리다. 위도는 -85~85, 경도는 -180~180, 정확도는 0~5000m를 받는다. 정확도가 낮은 점도 개인 기록으로 저장하지만 인정 거리에는 별도 기준을 적용한다.

GPS 완주 판정 정책 v1은 시작·끝 각각 코스 경계 50m, 진행 순서에 맞는 20m 간격 표본의 80% 이상, 코스 길이 80% 이상의 유효 이동 거리다. 정확도 30m 초과, 60초 초과 수집 공백, 다른 정지 구간, 12m/s 초과 도약은 거리·완주의 연결 근거에서 제외한다. 작은 걸음은 유효한 연속 구간 안에서 3m 이상 이동할 때까지 누적하고, 제자리의 작은 위치 흔들림은 이동에서 제외한다. 앱은 정상 수집 간격이 60초를 넘지 않게 한다. 단말 GPS 위조 탐지와 실제 기기의 백그라운드 품질을 보장하는 기능은 아니다.

## 코스 만들기와 탐색

`createWalkingRoute`는 종료한 본인 산책의 `points`에서 `fromIndex`~`toIndex`를 **양 끝 포함**으로 선택한다. 최소 2개/최대 4000개, 100m~50km의 유효한 연속 구간이어야 한다. 출발·도착의 사적 위치를 제거하는 구간 선택 UI와 공개 미리보기를 제공한다. 서버가 선택한 좌표에서 시간·정확도·구간 번호를 제거해 별도로 저장한다.

```graphql
mutation CreateRoute($input: CreateWalkingRouteInput!) {
  createWalkingRoute(input: $input) { id status revision path { latitude longitude } }
}
mutation SubmitRoute($id: ID!) {
  submitWalkingRoute(id: $id) { id status revision reviewReason }
}
query Nearby($input: WalkingRouteSearchInput!) {
  walkingRoutes(input: $input) {
    id title description startPlace endPlace authorName petNames tags
    path { latitude longitude }
    distanceMeters durationSeconds isLoop nearbyMeters walkerCount bookmarked isMine
  }
}
```

```json
{
  "input": {
    "requestId": "351ae079-b6bd-4ebf-821b-d24435d0fdf2",
    "walkId": "<종료한 본인 산책 ID>",
    "fromIndex": 5,
    "toIndex": 80,
    "details": {
      "title": "보리와 걷는 그늘길", "description": "나무 그늘이 많은 공원길이에요.",
      "startPlace": "공원 정문", "endPlace": "분수대", "tags": ["SHADE", "REST_AREA"]
    }
  }
}
```

제목·출발/도착 장소는 필수이며 각각 최대 100자, 소개는 최대 2000자다. 태그는 `DIRT_PATH`, `NO_STAIRS`, `SHADE`, `CROSSWALK`, `REST_AREA`다. 예상 시간은 선택한 원본 구간의 실제 소요 시간, `isLoop`는 양 끝 거리 50m 이내 여부다.

검색 입력은 `latitude`, `longitude` 필수, `radiusMeters` 기본 3000/허용 100~20000이다. `tags`는 모두 만족하는 코스를 찾으며 `isLoop`, `minDistanceMeters`, `maxDistanceMeters`와 페이지를 추가할 수 있다. 거리 필터 단위는 m, 시작점과의 거리가 `nearbyMeters`다.

상태는 `DRAFT → PENDING → PUBLISHED / REJECTED`, 작성자나 관리자의 공개 중단은 `WITHDRAWN`이다. `submitWalkingRoute` 후 운영자 승인이 있어야 검색/산책 시작이 가능하다. 수정은 `updateWalkingRoute(id, revision, input)`이며 공개/검토 중에는 먼저 `withdrawWalkingRoute`를 호출한다. 경로 변경은 새 코스로 만든다. 같은 생성 요청 ID를 다른 구간에 쓰면 충돌하며, 같은 구간 재시도는 기존 ID를 반환한다. 생성 재시도로 제목을 바꾸지 말고 수정 API를 사용한다.

- 저장/해제: `bookmarkWalkingRoute(id, saved)`.
- 신고: `reportWalkingRoute(id, reason, detail)`; `UNSAFE`, `PET_RESTRICTED`, `PRIVACY`, `INACCURATE`, `OTHER`. `OTHER`는 설명 필수, 설명 최대 500자. 같은 사용자의 동일 코스 신고는 최신 내용으로 갱신한다.
- 운영 조회: `pendingWalkingRoutes`, `walkingRouteReviewItem(id)`, `walkingRouteReports`.
- 운영 처리: `reviewWalkingRoute(id, revision, decision, reason)`; `PUBLISH`, `REJECT`, `WITHDRAW`. 반려/중단 사유 필수. 처리한 신고는 `resolveWalkingRouteReports(id)`로 정리한다. 운영자 중단은 해당 신고도 처리한다.

## 사진과 일기

1. 사진을 PNG로 변환하고 가로·세로 각각 1600px 이하, 파일 5MiB 이하로 축소한다. 업로드할 사진 수는 산책당 최대 4개다.
2. `beginWalkingPhotoUpload(walkId)`로 `id`, `uploadUrl`, `expiresIn`, `maxBytes`, `maxDimension`을 받는다. 예약도 4개 제한에 포함된다. 응답 유실 시 `myWalkingPhotos`에서 남은 예약을 확인한다.
3. `uploadUrl`에 `Content-Type: image/png`를 설정하여 PNG 바이트를 HTTP PUT한다. 앱 액세스 토큰은 스토리지 요청에 보내지 않는다. URL은 300초 유효하다.
4. `completeWalkingPhotoUpload(id)`를 호출한다. 서버가 실제 PNG를 디코딩/재인코딩하여 메타데이터를 제거하고 다른 객체로 확정한다. 이후 원본 업로드 URL로 파일을 교체해도 확정 사진은 바뀌지 않는다. 완료 응답 유실 시 같은 사진 ID로 다시 호출할 수 있다.
5. 확정된 사진 ID를 `saveWalkingDiary`에 전달한다. 임의 URL, 타인/다른 산책 사진, 미완료 업로드는 사용할 수 없다.

사진 조회의 `status`는 `UPLOADING` 또는 `READY`, `url`은 READY에만 있고 300초 유효하다. 파일 URL을 영구 저장하지 말고 만료되면 일기/사진 API를 재조회한다. 공개 중단·삭제 이전에 발급한 다운로드 URL은 만료 전까지 유효할 수 있다. 저장소가 설정되지 않은 환경에서는 사진 기능을 사용할 수 없다.

```graphql
mutation SaveDiary($input: SaveWalkingDiaryInput!) {
  saveWalkingDiary(input: $input) {
    id walkId routeId content mood visibility revision savedAt updatedAt walkDate
    photos { id status url expiresIn }
  }
}
```

```json
{
  "input": {
    "walkId": "<종료한 산책 ID>", "expectedRevision": 0,
    "content": "보리가 그늘길을 좋아했어요.", "mood": "HAPPY",
    "photoIds": ["<업로드 확정 사진 ID>"], "visibility": "PRIVATE"
  }
}
```

최초 저장은 `expectedRevision: 0`, 수정은 조회한 최신 `revision`을 보낸다. 동일 내용·버전의 네트워크 재시도는 같은 결과를 돌려준다. 충돌하면 최신 일기를 다시 읽고 사용자 편집 내용을 확인한다. 본문 최대 5000자, 기분 최대 50자이며 기분은 앱이 정한 문자열을 사용할 수 있다. 본문·기분·사진 중 하나 이상이 필요하다.

일기 기본값은 `PRIVATE`다. `PUBLIC`은 **현재 공개 중인 코스를 완주한 산책**만 허용한다. 같은 보호자의 같은 코스 공개 후기 중 최신 하나만 공개하고 기존 후기는 비공개로 전환하며 버전이 증가한다. 최초 `savedAt`은 수정으로 바뀌지 않는다. 일기 챌린지는 공개 여부와 관계없이 산책 당일 저장·사진·기분 등의 조건을 서버가 확인한다.

`photoIds`에서 빼면 일기 연결만 해제한다. 파일도 지우려면 `deleteWalkingPhoto(id)`를 호출한다. 사진 삭제는 연결된 일기의 사진 목록과 버전을 갱신하고 실적도 즉시 재계산한다. 업로드 미완료 사진을 삭제해 4개 제한을 비울 수도 있다.

## 삭제와 재시도

| 조작 | 재시도/주의 |
| --- | --- |
| 시작·코스 생성 | 동일한 UUID와 동일 대상/구간을 재사용한다 |
| 좌표 전송 | 같은 `fromIndex`와 같은 값을 그대로 재전송한다. 충돌 시 `myWalk`의 저장 좌표 수를 확인한다 |
| 일시정지·재개 | 같은 상태 설정 재시도 가능. 성공한 상태 기준으로만 segment를 바꾼다 |
| 종료 | 같은 `endedAt`으로 재시도한다 |
| 코스 수정·운영 검토 | 충돌 시 최신 revision을 읽고 내용을 확인한다 |
| 사진 예약 | 재시도마다 예약이 생길 수 있다. 내 사진 목록으로 복구하고 사용하지 않는 예약을 삭제한다 |
| 사진 확정 | 같은 사진 ID로 재시도 가능. 예약 1시간 경과 시 다시 업로드한다 |
| 일기 저장 | 동일 내용과 `expectedRevision`으로 재시도한다 |
| `deleteWalkingDiary(id)` | 반복 호출 가능. 일기·실적 및 해당 산책 사진을 삭제한다. 재작성은 새 일기 ID다 |
| `deleteWalk(id)` | 반복 호출 가능. 전체 좌표·일기·사진과 이 산책에서 만든 코스를 제거한다. 요청 중복 방지용 최소 삭제 표식은 유지한다 |

네트워크 오류/일시적 서버 오류만 재시도하고, 권한·입력·버전 충돌은 그대로 반복하지 않는다. GraphQL HTTP 200에서도 `errors`를 확인한다. 인증은 `extensions.code`의 `UNAUTHENTICATED`/`FORBIDDEN`, 비즈니스 오류는 `extensions.originalError.statusCode` 또는 `extensions.status`의 400/404/409/503을 사용한다. 내부 실패 메시지나 디버그 정보를 사용자 UI에 그대로 노출하지 않는다.

코스 공개 중단은 새 조회·시작을 막지만 이미 시작한 산책과 다른 사용자의 개인 산책 스냅샷/완주 이력을 지우지 않는다. 보호자 탈퇴 API는 Account 서버에서 호출하며 앱에서 내부 비밀로 호출하지 않는다.

## 연결 환경과 앱 검증

운영자는 Challenge DB 마이그레이션, Gateway의 `CHALLENGE_SERVICE_URL`, Challenge의 `ACCOUNT_SERVICE_URL`, 두 서비스 간 assertion 비밀, Auth scope, 전용 비공개 사진 버킷과 스토리지 자격증명을 준비한다. Flutter web도 지원하면 버킷 CORS에 해당 앱 origin의 PUT/GET과 Content-Type을 허용해야 한다. 실제 계정·버킷 설정 변경과 운영 배포는 이번 구현에 포함하지 않았다.

앱 에이전트는 실기기에서 위치 권한 거절/철회, 화면 잠금·백그라운드 수집, GPS 정확도 저하, 오프라인 큐와 재시작 복구, 중복 탭, 배터리 사용량, 사진 변환·업로드 실패·URL 만료를 확인한다. 지도 제공자와 GPS 수집 패키지 선택은 Flutter 쪽에서 수행한다.
