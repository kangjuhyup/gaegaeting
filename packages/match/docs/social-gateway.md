# Flutter 관심 목록의 공개 Gateway 어댑터

`SocialModule`은 내부 REST로만 존재하던 본인 관심·매칭 관리 기능을 기존 Match GraphQL subgraph로 제공한다. Flutter가 내부 `/match/like` REST를 직접 호출하지 않도록 한다. 현재 worktree의 소스 변경이며 배포된 Gateway 계약이라고 가정하지 않는다.

| Root | Scope | 인자/반환 |
| --- | --- | --- |
| myReceivedLikes / mySentLikes | match:read | limit Int=50, offset Int=0; SocialLike[] {id, otherUserId, likedAt} |
| myPairs | match:read | 같은 paging; SocialPair[] {id, otherUserId, createdAt} |
| acceptLike / declineLike | match:write | id Int!; Boolean |
| cancelPair | match:write | id Int!; Boolean |
| reportPair | match:write | id Int!, reason String! (trim 1..1000); Boolean |

GraphqlAccessGuard와 기존 `UserParam` assertion principal로 owner를 정한다. 사용자 ID를 요청 인자로 받아 권한을 대체하지 않는다. 활성 본인 기록만 반환하며 받은 목록은 본인이 이미 응답한 상대를 제외한다. ID 내림차순, limit1..50/offset0..10000. paging은 기존 repository 조회 결과를 필터한 뒤 적용하며 대규모 DB cursor 조회를 새로 구현하지 않았다.

CQRS AcceptLikeHandler를 등록하고 inbound ownership/활성 상태를 검사한다. 기존 트랜잭션 안에서 incoming row를 pessimistic lock하여 같은 관심의 반복 수락을 직렬화하고 기존 outgoing active like가 있으면 추가 발행하지 않는다. pair 취소/신고는 양쪽 participant 모두 허용하고 제3자는 거절한다. Pair mapper에서 unmatchedAt/like refs를 보존하고 handler와 기존 pair event consumer를 등록했다. 신고 사유를 기존 MATCH_PAIR_REPORTED_V1 payload에 전달한다.

Kafka 발행과 DB transaction의 분산 atomic outbox는 기존 계약에 없다. Kafka/DB 실패 시 분산 exactly-once, 다중 다른 관심 기록의 동시 수락까지 보장했다고 주장하지 않는다. 이번 모듈 단위 테스트는 scopes, owner/상대 구분, paging, 양쪽 취소/신고, 잘못된 ID/사유, 수락 중복 및 lock 호출을 검증한다. DB integration suites 2개/테스트11개는 DB 설정이 없어 skipped였다.

운영자는 기존 Match 설정과 Doppler의 DB/Kafka/내부 assertion secret을 서버에서만 유지한 채 이 변경을 리뷰해야 한다. rollout과 Gateway federation 재구성, 인증된 두 사용자 수락→pair event→Chat sync→room 생성/취소 후 write 거절을 별도로 확인한다. 앱에서 secret이나 내부 REST를 대체값으로 사용하지 않는다. 배포·secret rotation은 이번 작업에서 수행하지 않았다.

Flutter 화면, 요청 문서 검증과 외부 설정은 [SOCIAL.md](../../integration-ui/SOCIAL.md).
