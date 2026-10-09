# 관심·채팅·프로필 API 연동

## 2026-10-07 후속 실제 검증

개발 native 등록·Chat 배포·Account enum 수정은 반영됐습니다. 승인된 synthetic QA2명의 실제 공개 API로 관심→수락→pair→room 동기화, 메시지 같은 요청ID 재시도/다른 본문 거절/상대 조회/읽음을 확인했습니다. Account own-update/reload/외부 소유자 거절14검사와 Android 프로필 저장도 통과했습니다. valid-user WS4401은 Gateway core1.0.15 공식발행·PR34 개발반영으로 해소됐습니다. 실제 QA2 ack/보호 구독, Android 정상 로그인 세션에서 상대 메시지 새로고침 없는 수신·자동 읽음까지 확인했습니다. 전체75개 operation은 공개 인증 introspection에서 schema-valid이며 모든 동작을 실제 성공시킨다는 뜻은 아닙니다. [최신 결과](DEV_API_VERIFICATION.md).

## 2026-10-06 초기 구현 기록

2026-10-06, 기존 Flutter 앱의 `/api/likes`, `/api/chats`, `/api/me`에 연결했다. 미리보기 `/likes`, `/chats`, `/profile`의 세션 데이터와 섞지 않는다. 프로덕션 진입점은 `lib/main.dart`이며 `integration_test/social_review_app.dart`는 실제 앱을 계약 fixture로 실행하는 검토용 진입점이다. 검토 앱에는 **테스트 데이터** 배너가 표시된다.

## 화면과 동작

- 받은/보낸/서로 관심: 서버 소유자 필터와 50개 단위 offset 조회, 수락·거절, 실제 pair ID의 매칭 취소·신고. 보낸 관심은 ‘관심 보냄’으로 표시한다. 수락 응답 후 pair 생성과 채팅방 동기화는 서버 결과를 기다리며 임의 방을 만들지 않는다.
- 상대 프로필: 실제 profile/petsByUserId와 승인된 사진만 표시한다. API ID를 경로에 유지한다.
- 채팅 목록/방: 서버 방·메시지·미읽음·상대 읽음, 과거 before 커서와 재접속 after 커서, 읽음 갱신. 매칭 취소 후 대화 기록을 보존하고 새 전송을 차단한다.
- 내 프로필: 닉네임·지역·소개 수정 후 서버 재조회. 강아지 이름·나이·성격·소개 수정, 등록 삭제 확인, 기존 인증 계약 연결. 등록 후 품종·성별·크기는 현행 UpdatePetInput에 없어 수정하지 않는다.
- 사진: 본인/본인 강아지의 6개 slot 상태, 새 빈 slot 업로드, 승인 대기·승인·반려, UPLOADING 제출 재시도, 명시적 삭제, 만료 URL 새로고침. 기존 사진을 새 업로드 취소로 지우지 않는다.
- 오류/빈 목록/로딩/재로그인, 중복 탭 제한, account identity로 위젯·복구 저장 분리. 저장 실패 시 입력을 유지한다. 잘못된 강아지 ID는 등록 화면으로 해석하지 않는다.

기존 원본 디자인 확인의 공통 토큰/구조를 적용했다: Figma `25:9158`, `25:9159` 관심/채팅, `27:10327` 상호 관심, `18:2000` 프로필, `18:1448`, `18:1489` 등록/수정 필드. 원본 비교 기록은 [DESIGN_REVIEW.md](DESIGN_REVIEW.md). 서버에 없는 첨부 메시지·typing·푸시·메시지 삭제·임의 보상·유료 프로필 열람을 추가하지 않았다. 신고/사진 상태는 실서버 계약에 필요한 공통 상태 화면이다.

## 계약과 권한

원본 저장소의 최신 `packages/chat/README.md`, Chat GraphQL resolver/DTO, Account profile-images resolver/service 및 user/pet resolver를 직접 읽었다. 오래된 브랜치를 병합하지 않았다. 아래 등록된 요청 문서 26개를 최신 소스에서 생성한 code-first 스키마에 검증했다. 기존 가입·프로필 등록·추천 계약도 기존 회귀 테스트로 보존한다.

| 도메인 | 요청 |
| --- | --- |
| Match 신규 공개 어댑터 7 | myReceivedLikes, mySentLikes, myPairs, acceptLike, declineLike, cancelPair, reportPair |
| 기존 Chat 7 | chatRooms, chatRoom, chatMessages, syncChatRooms, sendChatMessage, markChatRead, chatEvents(subscription) |
| Account 관리 11 | updatePet, deletePet, certifyPet, myProfileImageUploads, myPetImageUploads, generatePresignedUrl, generatePetPresignedUrl, completeProfileImage, completePetImage, deleteProfileImage, deletePetImage |
| Account 상대 조회 1문서 | profile + petsByUserId |

**관심 조회·관리에는 공개 GraphQL 계약이 없고 내부 REST만 있었다.** 이번 worktree의 `../match/src/social/`에 기존 repositories/CQRS를 사용하는 공개 어댑터를 추가했다. 새 URL/PG/재화 모듈을 만들지 않았고 앱은 내부 REST를 호출하지 않는다. Match/Gateway의 배포 및 federation 재구성이 있어야 신규 roots를 실제 환경에서 사용할 수 있다. 이번에는 배포하지 않았다. 세부 서버 인계는 [Match 공개 어댑터](../match/docs/social-gateway.md).

HTTP는 기존 AccountRepository → GatewayApi(Retrofit/Dio) → 공개 `/gateway/graphql` 경로를 사용한다. `match:read/write`, `account:read/write`를 기존 AppAuth PKCE scope에서 사용한다. 별도 chat scope를 만들지 않았다. 사용자 Bearer access token은 opaque로 취급하며 파싱하지 않는다. 계정 검증은 기존 verified issuer/sub identity를 사용한다. GraphQL partial errors, 401, 403은 성공으로 처리하지 않으며 토큰 갱신은 기존 AuthClient가 수행한다.

WS는 동일 Gateway의 ws/wss 주소와 `graphql-transport-ws`: `connection_init.payload.authorization` → ack → subscribe. 토큰은 URL에 넣지 않는다. ping/pong, ack timeout, 1~30초 backoff 재연결, 만료 시 갱신된 opaque token 재인증, 같은 거절 토큰이면 재로그인 안내. 변경 신호를 받으면 HTTP 권한 조회로 재동기화하며 background pause에서 구독을 닫는다. [공식 프로토콜](https://github.com/enisdenjo/graphql-ws/blob/master/PROTOCOL.md), [고정 SDK](https://pub.dev/packages/web_socket_channel/versions/3.0.3).

메시지는 trim 후 1~2000자, UUIDv4를 서버 sender/room의 멱등 키로 사용한다. 본문/UUID를 secure vault에 먼저 보존하고 서버 응답을 확인한 뒤에만 대기를 제거한다. 응답 유실·재시작은 동일 UUID/본문으로 재시도한다. 계정이 바뀌면 이전 데이터의 복원·전송·응답 반영을 막는다. 저장 경로는 FlutterSecureStorage의 기존 `ChallengeVault` owner hash + `chat.pending.<roomId>`이며 메시지 본문/토큰을 로그에 남기지 않는다.

사진은 원본 5MiB/4096² 제한 확인 → longest 1600px 이하 metadata 없는 PNG → reserve → **별도 no-auth transport** HTTPS PUT → complete 순서다. `IMAGE_STORAGE_ORIGIN`과 일치하지 않는 presigned origin은 거절하고 redirects를 따르지 않는다. 알려진 UPLOADING은 서버 조회 후 complete 재시도/삭제로 정리하며 PENDING을 승인으로 표시하지 않는다. Account 계약에는 slot revision/멱등 예약이 없어 다른 기기와 같은 빈 slot을 동시에 선택하는 경우 서버 개선이 필요하다.

## 설정 위치와 외부 선행조건

| 위치 | 필요한 값/작업 |
| --- | --- |
| `.dart-define.stg.example.json` → gitignored `.dart-define.stg.json` | 기존 공개 Gateway/OIDC/audience/redirect ID, API_ENABLED=true, IMAGE_STORAGE_ORIGIN에 운영자가 승인한 HTTPS 객체 저장소 origin |
| 기존 Doppler `gaegaeting/stg` 및 서버 마운트 | Account 객체 저장소 자격증명, DB/Kafka/내부 인증 설정. 실제 값은 앱에 넣지 않는다 |
| Auth dev native client | Android/iOS 공개 PKCE client와 `app.gaegaeting:/oauth/callback`, logout redirect, account/match scopes/audience 승인 후 사용자 시험 세션 |
| Match/Gateway | 새 SocialModule 포함 서버 변경 리뷰 후 rollout, federation roots 재구성. 기존 Chat roots + WS upgrade/권한 연결 확인 |
| Account 저장소 | reserve/PUT/complete 가능 origin, 웹 사용 시 no-auth PUT의 CORS와 Content-Type:image/png 허용, 사진 승인 작업 경로 |

`STORE_PURCHASES_ENABLED=false`를 유지한다. client secret·access/refresh token·스토리지 키·관리 토큰을 공개 dart-define/소스/로그/사용자 답변에 넣지 않는다. 키 발급·회전, 서버 배포, 콘솔 활성화와 실제 결제는 실행하지 않았다.

2026-10-06 재확인: OIDC discovery HTTP403, 미인증 Gateway Chat/관심 query HTTP401. 이는 endpoint 도달과 인증 차단만 증명한다. 2026-10-05 coordinator의 native client invalid_client 기록은 아직 해소 확인이 없으며, 이번 discovery 403 때문에 최신 native 등록 여부를 다시 검증하지 못했다. 실서버 로그인·상대 계정 송수신·Kafka pair→room·객체 저장소 PUT/승인을 완료했다고 주장하지 않는다.

같은 날 후속 검증에서 discovery200과 dev native 신규 등록400을 확인했다. ID는 사용자 지시에 따라 `gaegaeting-mobile`로 통일했고 로컬 scope 보완은 완료했다. 실제 배포 Match의 관심7개 root 누락과 Gateway Chat 미구성, device19개 미인증401 등 최신 결과는 [DEV_API_VERIFICATION.md](DEV_API_VERIFICATION.md)를 따른다. 위403은 이전 시점 근거다.

## 검증과 재현

module 디렉터리에서 실행한다. Flutter 3.47.6/Dart 3.13.5, Node 24.13.1/pnpm 10.34.5, AndroidSDK36/JDK17, Xcode16.2를 사용하며 핀은 유지했다.

```sh
fvm flutter test
fvm dart analyze --fatal-infos lib test integration_test test_driver
fvm flutter analyze --no-pub --no-current-package /tmp/gaegaeting-design-review-client
JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home fvm flutter drive --driver=test_driver/social_driver.dart --target=integration_test/social_flow_test.dart -d emulator-5554
JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home fvm flutter build apk --release
fvm flutter build web --release
fvm flutter build ios --simulator
```

ASCII symlink는 기존 한글 경로 LSP 문제의 우회이며 같은 module 소스를 가리킨다. Android release는 drive 뒤 dev 플러그인 registry를 갱신하도록 pub 단계와 함께 실행한다. 위 IOS 명령은 simulator 빌드이며 서명·실기기 실행을 검증하지 않는다.

root 디렉터리의 서버 검증:

```sh
pnpm --filter match test --runInBand
pnpm --filter match build
```

소스 스키마 검증은 module의 repository test가 `build/social-review/operation-documents.json`을 만든 뒤 root에서 수행한다. 현재 worktree에 없는 최신 Chat 소스는 읽기 전용 계약 저장소를 지정한다. 해당 source repo의 Chat/Account `dist`가 최신 source 빌드여야 한다.

```sh
SOCIAL_CONTRACT_SOURCE_ROOT=/Users/kangjuhyup/Documents/gaegaeting node packages/integration-ui/tool/verify_social_schema.mjs match
SOCIAL_CONTRACT_SOURCE_ROOT=/Users/kangjuhyup/Documents/gaegaeting node packages/integration-ui/tool/verify_social_schema.mjs chat
SOCIAL_CONTRACT_SOURCE_ROOT=/Users/kangjuhyup/Documents/gaegaeting node packages/integration-ui/tool/verify_social_schema.mjs account
```

검증 결과는 아래 최종 결과표와 `build/social-*.log`, `build/social-review/`에 기록한다. UI 캡처·interaction-proof는 테스트 계정 fixture이며 local WS 테스트는 실제 loopback HTTP/WebSocket 서버를 사용한다. 원본 GPS/사진 metadata/사용자 자격증명은 증거에 넣지 않는다.

| 검사 | 결과 |
| --- | --- |
| Flutter 전체 회귀 | 168개 통과 (기존142개 + 신규26개); 메시지 응답 유실/재시작/UUID/중복 탭/다른 계정/취소, 152개 누락 커서, 읽음 루프, 실제 WS handshake/거절/opaque 갱신, 부분 GraphQL 오류, 사진 trusted origin/no-auth PUT/계정 변경, 프로필 저장/강아지 소유권/한글 조합/320px 포함 |
| Dart·Flutter 분석 및 format | no issues; git diff --check 통과 |
| Match 테스트·타입/빌드 | 107 pass, DB 설정 없는11 skip(2 suites); Nest build 통과 |
| Match 새 adapter format | Prettier check 통과; ESLint는 기존 module에 configuration file이 없어 실행 불가(통과로 표시하지 않음) |
| 요청 문서 소스 스키마 | Match7 + Chat7 + Account12, 총26문서의 validation errors0; 배포 Gateway introspection 검증 아님 |
| Android 기기 | Pixel9Pro API35 실제 앱 flow 통과; 13캡처,14종 호출, 메시지 저장·프로필/강아지 서버 재조회·사진 complete PENDING. In-process Retrofit/Dio fixture, 실제 사용자/DB/Kafka/객체 저장소 E2E 아님 |
| Android production entry build | 공개 stg example(API 활성/구매 비활성)로 release APK 통과 |
| Web production entry build | release build/web 통과, wasm dry run 성공; 웹 OIDC login 실사용은 검증하지 않음 |
| iOS production entry build | Xcode16.2 simulator Runner.app 빌드 통과; 시뮬레이터 실행·실기기·서명/스토어·백그라운드 전달 미검증 |
| Live probe | OIDC discovery403 / 미인증 Chat·관심 query401; 사용자 세션 E2E 미완료 |

앱을 `fvm flutter run -d emulator-5554 --target=integration_test/social_review_app.dart`로 다시 열어 둔다. 테스트 데이터 배너를 유지하며 실제 상대에게 메시지를 전송하지 않는다. 최종 화면, 소스 스키마/validation JSON, interaction-proof, live 상태 코드, 검사 로그는 `/Users/kangjuhyup/.codex/artifacts/gaegaeting-flutter/social-20261006/`에 보존한다. `screenshots/`는 원본, `scaled/`는390px 검토본이며 `contact-sheet.jpg`가 전체13화면이다.

## 변경 파일 범위

- `lib/features/social/data/{social_repository,chat_events}.dart`: HTTP 계약 및 WS 프로토콜.
- `lib/features/social/application/{social_providers,chat_controller}.dart`: 권한 데이터, 커서 병합, 계정별 전송 대기 복구.
- `lib/features/social/presentation/social_screens.dart`: 관심/목록/대화/상대 프로필/매칭 확인·신고의 공통 화면.
- `lib/features/account/data/{account_repository,profile_repository}.dart`, `application/{api_session,profile_providers}.dart`, `presentation/{api_account_screens,profile_images_screen}.dart`: 기존 Retrofit/로그인 보호, 펫·사진 관리.
- `lib/app/router.dart`, `lib/core/{config/app_config,design/widgets}.dart`: 실제 탭/ID/returnTo, 계정별 key, 공개 사진 origin과 공통 스크롤.
- `pubspec.yaml`, `pubspec.lock`, `.dart-define.stg.example.json`: 기존 transitive WS SDK를 같은 고정 버전의 direct dependency로 명시, origin은 빈 값으로 유지.
- `test/social_{fixture,controller_test,repository_test,screen_test}.dart`, `integration_test/social_{flow_test,review_app}.dart`, `test_driver/social_driver.dart`, `tool/verify_social_schema.mjs`: 실제 앱/전송 계층·복구·로컬 WS·기기 캡처·소스 스키마 검증.
- `../match/src/social/`, `../match/test/social/`: 공개 adapter, 권한/페이징/커맨드 테스트. 기존 app/like/pair module, accept/cancel/report/save handlers, persistence mapper/repository를 함께 수정했다.
- `README.md`, `DESIGN_REVIEW.md`, `SOCIAL.md`, `../match/docs/social-gateway.md`: 실행·검증·운영 인계.

기존 root/module package.json, 가입/추천/결제/챌린지/디자인 파일과 원본 저장소의 미커밋 작업을 보존했다. 다른 checkout에서 파일을 가져와 통째로 덮어쓰지 않았으며 브랜치 전환·merge·commit·배포를 수행하지 않았다.
