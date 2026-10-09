# 챌린지 앱 연동·검증 인계

## 2026-10-07 후속 실제 검증

native 등록/시험 세션 차단은 해결됐습니다. 실제 Android에서 시작·일시정지·재개·강제종료 후 같은 계정 복구·최종31점 FINISHED·비공개 일기 저장을 확인했습니다. 같은 좌표의 zero-area 지도 자동 fit을 zoom15 상한으로 교정했고 새 UI 회귀2건 포함172테스트·분석·Android/Web 빌드가 통과했습니다. 실제 사진 reserve/별도 no-auth PUT/READY/signed 조회/새 미사용 사진 정리 및 일기 revision 충돌/PRIVATE 소유권도 검증했습니다. 가상 GPS·직접 API 사진 시험이며 실기기/장시간 background/오프라인 기기 시험·앱 사진 선택기·공개 코스 moderation 증거와 구분합니다. [최신 증거](DEV_API_VERIFICATION.md).

## 2026-10-05–06 초기 구현 기록

2026-10-05–06. 기존 Flutter 앱의 `/api/challenge`와 챌린지 하단 탭을 실제 Gateway 계약에 연결했다. `/challenge`는 기존 디자인 미리보기 규칙을 유지하는 읽기 전용 화면이며 로그인·위치·업로드·참여를 실행하지 않는다. 결제 설정과 스토어 비활성 상태는 유지했다. 배포·클라이언트 등록·비밀 발급·유료 결제는 수행하지 않았다.

## 정본과 화면 매핑

[Figma 승인 원본](https://www.figma.com/design/pcCLqdVZ1YqFb4mQoMNkHj/?node-id=42-9697)과 디자인 담당자가 원본에서 직접 내보낸 최종 25개 PNG·contact sheet·153개 조건 상태 인계를 대조했다. MCP quota를 반복 호출하지 않았다. 원본 이미지 경로는 `/Users/kangjuhyup/.codex/artifacts/gaegaeting-design-system/challenge-20261005/screenshots-final/`, 인계는 디자인시스템 worktree의 `docs/design/challenge-figma-handoff.md`, `challenge-figma-node-index.md`, `challenge-design-verification.md`이다. Figma 파일은 수정하지 않았다.

| 승인 노드 | 앱 구현 |
| --- | --- |
| C00 `42:9697` | 챌린지 탭·서버 catalogue·내 참여·진행 중 산책 복구 |
| C01–C04 `42:9793`, `42:9873`, `42:9925`, `42:9990` | 코스 목록·지도 중심 검색·필터·상세·저장·신고·후기 |
| W05/W07/W08 `42:10494`, `42:10588`, `42:10638` | 본인 강아지 선택·기록·일시정지/재개 |
| W11–W14 `42:10745`, `42:10803`, `42:10854`, `42:10904` | 서버 완주/미완주·자유 산책·계정별 복구 |
| D01–D05 `42:11491`, `42:11553`, `42:11586`, `42:11619`, `42:11674` | 일기·기분·사진·PRIVATE 기본·공개 자격/확인 |
| R01/R02U/R03/R04/R06 `42:12168`, `42:16345`, `42:12272`, `42:12327`, `42:12404` | 연속 구간 선택·사적 위치 제외 확인·정보·초안·검토 중 |
| H01/H02/H04Z/H07 `42:12780`, `42:12820`, `42:13215`, `42:13072` | kind별 문구·참여·최초 0/3·기간/상태/보상 카드 |
| M00/M12 `42:13356`, `42:13794` | 내 코스·저장·일기·산책·여권·참여 기록 |
| S 충돌 `42:14069`, `42:14104` | 최신 버전 확인과 입력 보존 |

153개 하드코딩 페이지 대신 공통 로딩·빈 목록·인증·권한·오프라인·충돌·검증 실패 화면을 공유한다. 1.4초 예시 전환을 모방하지 않고 실제 요청 결과를 기다린다. 서버 kind는 유지하고 표시명만 `NEIGHBORHOOD_EXPLORER → 동네 탐험가`, `WALK_DIARY → 산책 일기`로 매핑한다. 기간·목표·진행·보상은 서버 값을 사용하며 API에 없는 인정 코스/날짜 체크리스트와 간식/자동 이미지 보상을 생성하지 않는다. `earnedRewardCode`가 있을 때만 기본 배지·카드를 표시한다.

## API와 구현 경계

정본은 챌린지논의 worktree의 `packages/challenge/schema.graphql`, `docs/flutter-integration.md`, `README.md`이며 Gateway는 `https://test-ggt-api.rvkang.app/gateway/graphql`이다. 읽기 `challenge:read`, 쓰기 `challenge:write`를 기존 Auth scope에 추가했다. 사용자 access token은 opaque일 수 있으므로 그대로 Bearer로 Retrofit에 전달하며 UserInfo에 보내지 않는다. HTTP 200의 부분 GraphQL 오류도 성공으로 처리하지 않는다.

| 영역 | 지원 사용자 operation |
| --- | --- |
| 챌린지 | `challenges`, `myChallenges`, `myChallenge`, `joinChallenge`, `cancelChallenge` |
| 코스·저장·여권·후기 | `walkingRoutes`, `walkingRoute`, `myWalkingRoute`, `myWalkingRoutes`, `myBookmarkedWalkingRoutes`, `myWalkingPassport`, `walkingRouteReviews`, `createWalkingRoute`, `updateWalkingRoute`, `submitWalkingRoute`, `withdrawWalkingRoute`, `bookmarkWalkingRoute`, `reportWalkingRoute` |
| 산책 | `myWalk`, `myCurrentWalk`, `myWalks`, `startWalk`, `appendWalkPoints`, `setWalkPaused`, `finishWalk`, `deleteWalk` |
| 일기·사진 | `myWalkingDiary`, `myWalkDiary`, `myWalkingDiaries`, `myWalkingPhotos`, `saveWalkingDiary`, `deleteWalkingDiary`, `beginWalkingPhotoUpload`, `completeWalkingPhotoUpload`, `deleteWalkingPhoto` |

총 35개 사용자 root(17 query/18 mutation)를 연결했다. 운영자 moderation root는 앱에 제공하지 않는다. 코스·산책·일기·저장·후기는 서버 limit/offset 페이지를 사용한다. `myChallenges`는 최신 최대 50개, 여권은 최대 100개 실제 계약을 따른다. 산책 목록에는 원본 points를 요청하지 않는다.

- `lib/features/challenge/domain/`: 서버 상태·좌표·UUID·한국 날짜·페이지 경계.
- `data/`: operation registry, 기존 Gateway Retrofit/Dio adapter, 계정별 보안 vault, 명시적 읽기 전용 preview.
- `application/`: Riverpod 주입, 산책 전송/디스크 직렬화·복구, PNG 변환·사진 업로드.
- `presentation/`: 홈·코스·산책·일기·코스 편집·내 기록 공통 상태와 실제 ID/returnTo.
- `lib/features/account/data/{auth_identity_repository,verified_appauth_driver}.dart`: AppAuth state/PKCE를 유지하면서 JOSE 라이브러리로 ID token 서명/JWKS·issuer·audience·expiry·nonce를 검증하는 앱 adapter. 인증 SDK 저장소는 수정하지 않았다.
- 기존 `app/router.dart`, `app/gaegaeting_app.dart`, 계정 세션·로그인·프로필·강아지 복귀, 설정·내 기록 진입을 연결했다. 기존 가입·추천·결제 파일을 대체하거나 원본 worktree를 병합하지 않았다.

## 복구와 개인정보

검증한 ID token의 issuer+subject를 계정 소유권 경계로 사용한다. 프로필 없는 계정도 구분한다. 로그인/로그아웃 세대 검사를 통해 늦은 인증·API 응답이 이전 계정을 다시 활성화하지 않는다. 기존 검증 기록 없는 세션은 재로그인이 필요하다. 키 회전 시 JWKS를 다시 조회한다. ID token digest와 검증 신원은 보안 저장소에 보관하고 access token 내용을 해석하지 않는다.

GPS/초안/사진 작업은 `ChallengeVault`에서 계정별 해시 키로 FlutterSecureStorage에 저장한다. 이전 계정 큐는 다른 계정으로 업로드하지 않는다. start UUID·200개 순차 배치·미확인 응답·일시정지 구간·최초 종료 시각을 보존하고 서버 points와 재조정한다. 복구 전 수집과 디스크 작업을 정리하며 종료는 마지막 flush 뒤 서버 결과를 표시한다. 30초 수신 공백 안내, 정확도 경고, 10,000개/24시간 한도를 적용한다. 원본 GPS·사진 metadata·signed URL·token은 로그에 출력하지 않는다.

사진은 장치 decoder로 다시 PNG를 생성해 metadata를 제거하고 최대 1600px/5MiB로 제한한다. reserve → 별도 무인증 Dio PUT → complete 순서이며 redirect도 따르지 않는다. 저장된 일기 사진은 취소 정리에서 보호하고 새 미사용 사진만 제거한다. 알려진 예약 ID는 READY/미완료 상태와 URL 만료를 복구한다. `beginWalkingPhotoUpload`에는 requestId가 없으므로 **예약 응답을 잃고 ID를 확보하지 못한 경우 다른 기기의 새 사진을 추측해 채택·삭제하지 않는다**. 작성 취소로 로컬 작업을 정리하고 서버 예약 만료(1시간) 뒤 재시도하며, 자동 복구를 더 확장하려면 서버 idempotency 계약이 필요하다.

코스는 하나의 연속 segment에서 양 끝 포함 2–4000개/100m–50km를 선택하고 공개 미리보기·사적 위치 제외 확인 뒤 저장한다. 요청 UUID와 payload를 보존한다. pending/published는 withdraw 후 metadata 수정하며 경로 변경은 새 코스다. revision 충돌 시 입력을 유지하고 최신 상태를 확인한다. 일기는 PRIVATE가 기본이고 선택 코스를 완주했으며 현재 코스가 공개 중일 때만 PUBLIC을 선택할 수 있다.

## 앱·외부 설정 위치

앱 공개 설정은 `.dart-define.stg.example.json`을 복사한 gitignored 환경 파일이다. 공개 주소/ID만 넣는다: `API_ENABLED`, `GATEWAY_GRAPHQL_URL`, `ACCOUNT_GRAPHQL_URL`, `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_REDIRECT_URI`, `OIDC_LOGOUT_URI`, `API_AUDIENCE`, `MAP_TILE_URL`, `MAP_ATTRIBUTION`. `STORE_PURCHASES_ENABLED=false`를 유지한다. 비밀번호·access/refresh token·client secret·스토리지 자격증명을 넣지 않는다.

| 담당 외부 작업 | 안전한 위치/필요 항목 |
| --- | --- |
| Auth native client | Auth `gaegaeting-dev` tenant의 public native client 등록: `gaegaeting-mobile`, 인증 방식 none, native/code, authorization_code+refresh_token, PKCE S256, callback `app.gaegaeting:/oauth/callback`, logout `app.gaegaeting:/oauth/logout`, 기존 account/match/payment scope + `challenge:read challenge:write`, stg API resource. 로컬도 같은 client ID를 사용하며 환경은 tenant·issuer·resource로 구분. 웹 client 대체 금지 |
| 인증 시험 계정 | 등록 완료된 native client와 사용자 테스트 계정/보유 강아지. 비밀번호는 coordinator와 기존 안전한 전달 경로를 사용하고 문서/앱/로그에 남기지 않음 |
| 서버·사진 저장 | 기존 환경별 Doppler/운영 secret 경로: `CHALLENGE_SERVICE_URL`, `ACCOUNT_SERVICE_URL`, `INTERNAL_AUTH_ASSERTION_SECRET`, `CHALLENGE_ACTIVITY_SECRET`, `STORAGE_REGION`, `STORAGE_HOST`, `STORAGE_WALKING_BUCKET`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`. private bucket, 접근 정책, 필요한 web PUT/GET Content-Type CORS는 운영자가 확인 |
| 운영 지도 | 승인된 raster tile 제공자의 `MAP_TILE_URL`과 정확한 attribution. 서버용 secret key는 앱에 넣지 않음. stg 예시 OSM public tiles는 개발 검증용이며 운영 트래픽 정책·제공자 확정 필요 |
| 실기기·스토어 | 기존 Android/iOS `app.gaegaeting` 식별자 유지. 서명/프로비저닝과 위치·사진 개인정보 고지, 백그라운드 위치 용도 설명은 실제 릴리스 전에 운영자가 확인. 스토어 활성화/배포 수행 안 함 |

지도 URL이 없거나 tile fetch가 실패하면 안내·재시도를 표시하고 저장된 경로는 남긴다. 선택 코스는 점선, 실제 경로는 실선이며 일시정지/60초 공백을 직선으로 연결하지 않는다. flutter_map 8.3.2 기본 cache(HTTP headers/7일 fallback)·명시적 User-Agent·항상 보이는 attribution을 사용한다. offline tile 다운로드/미리 가져오기는 구현하지 않는다. [지도 제공자 공식 안내](https://docs.fleaflet.dev/tile-servers/using-openstreetmap-direct), [OSM 정책](https://operations.osmfoundation.org/policies/tiles/).

Android는 사용자 시작 시 location foreground service+알림/wake lock으로 위치를 수집한다. 앱이 화면에 있는 동안 시작한 서비스가 화면 잠금/다른 앱에서도 유지되도록 설정했다. 자동 부팅·강제 종료 뒤 무인 수집은 수행하지 않는다. [Android 위치 권한](https://developer.android.com/develop/sensors-and-location/location/permissions), [geolocator 설정](https://pub.dev/packages/geolocator/versions/14.0.2).

iOS는 AppleSettings background updates+표시, Info.plist 위치 사용 설명/UIBackgroundModes location과 Xcode BackgroundModes capability를 적용했다. 잠금/백그라운드 수신 품질과 사진 권한/HEIC 선택은 실기기에서 별도 검증해야 한다. [image_picker 설정](https://pub.dev/packages/image_picker).

## 재현과 검증 결과

모듈 핀 Flutter 3.47.6/Dart 3.13.5와 pubspec.lock을 사용했다. Java는 Zulu JDK17, Android SDK36/Gradle9.3.1, Xcode16.2를 유지했다. 루트의 다른 도메인 SDK/브랜치를 변경하지 않았다.

```sh
fvm flutter test
fvm dart analyze lib test integration_test test_driver
# Korean path Flutter LSP byte-length 문제를 피하는 기존 ASCII symlink 사용:
fvm flutter analyze --no-pub --no-current-package /tmp/gaegaeting-design-review-client
JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home fvm flutter build apk --release --dart-define-from-file=.dart-define.stg.example.json
fvm flutter build web --release --no-pub
fvm flutter build ios --simulator --debug --no-pub
JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home fvm flutter drive --driver=test_driver/challenge_driver.dart --target=integration_test/challenge_flow_test.dart -d emulator-5554 --no-pub '--dart-define=MAP_TILE_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png'
```

| 검증 | 결과/범위 |
| --- | --- |
| 기존 기능+새 테스트 | **142개 통과**. 기존 73개 유지, lost response/재시작·pause segment·immutable finish·계정 전환·정리·PNG metadata·충돌·인증/JWKS 회귀 포함 |
| Dart 분석 | no issues |
| Flutter 분석 | no issues (ASCII symlink 사용) |
| Android release / web release / iOS simulator build | 모두 통과. APK 71.4MB, web release, iOS simulator debug Runner.app. APK release는 검증용 debug 서명이며 배포/스토어 서명이 아님 |
| Android 에뮬레이터 실제 앱 | 코스 목록/지도/상세/저장→본인 강아지→start/pause/resume/final flush/finish→PUBLIC 일기→구간 trim/privacy/초안/submit PENDING→join 0/3→내 기록 통과. 실제 GaegaetingApp+Retrofit/Dio 계약 fixture이며 인증된 live Gateway E2E가 아님 |
| 네이티브 GPS | Pixel9Pro API35 emulator에서 DeviceWalkingGps stream 수신 통과. 재설치 후 adb로 runtime location 권한을 준비함. OS 권한 팝업 조작은 미검증 |
| GraphQL 계약 | 권위 SDL에 35개 query/mutation 문서 모두 유효(Node24.13.1/GraphQL16.12.0), schema-validation.json |
| live Gateway | 토큰 없는 읽기 query 17개가 모두 HTTP401. 도달/인증 차단만 확인했으며 인증된 업무·사진 객체 저장 성공은 확인하지 않음 |
| iOS/실기기/백그라운드 | 플랫폼 구성 구현. 실제 iOS 단말·잠금/절전/장시간·강제 종료/재시작·S3 이미지 저장·실 스토어는 별도 검증 |

로그는 `build/challenge-{unit-tests,dart-analyze,emulator-tests,android-build,web-build,ios-build,flutter-analyze}.log`, 화면과 operation 증거는 `build/challenge-review/`에 있다. 원본 Android PNG 19개와 `scaled/` 390px 검토본을 함께 보존한다. 큰 이미지 도구의 축소 표시에서 지도가 누락돼 보였으나 원본/crop/축소본에서 정상 표시를 확인했다. `interaction-proof.json`은 21개 실제 앱 호출 operation 및 완료/공개/검토/진행값만 기록한다. `live-unauthenticated-probe.json`에는 상태 코드만 있고 사용자 토큰/원본 GPS가 없다.

로컬에서 테스트 데이터를 사용하는 실제 앱을 계속 조작하려면 다음 검토 전용 진입점을 사용한다. 프로덕션 main은 이 파일을 import하지 않으며 테스트 데이터 배너를 표시한다. 실제 로그인/서버 데이터 검증으로 보지 않는다. 최종 검토 앱을 emulator-5554에 실행해 열어 두었으며 실행 화면은 보존 산출물의 `screenshots/review-app-open-390.png`에서 확인할 수 있다.

```sh
JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home fvm flutter run --target=integration_test/challenge_review_app.dart -d emulator-5554 '--dart-define=MAP_TILE_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png'
```

Flutter drive와 release build는 같은 생성 registrant를 사용하므로 순차 실행한다. drive 뒤 Android release에는 `--no-pub`를 사용하지 않는다. Flutter3.47.6은 pub 수행 시 release용 dev-plugin 제외 registrant를 재생성한다. 생성 Java 파일을 수동 수정하지 않았다.

현재 가장 작은 live E2E 차단 조건은 **Auth dev native client 등록 완료와 사용자 시험 세션**이다. coordinator 확인 당시 두 native client PKCE 요청이 `invalid_client`였고 custom redirect 허용 DTO 수정은 Auth 원본 저장소에 있으나 배포되지 않았다. 이 작업에서 Auth 서버를 배포하거나 웹 client로 우회하지 않았다. 구현·fixture·복구 검증 결과를 실제 사용자 결제/인증/완주 검증으로 표현하지 않는다.

## 이번 dispatch의 변경 파일과 보존 산출물

다음은 이번 챌린지 dispatch에서 추가·수정한 파일이다. 작업 시작 전 이미 미커밋인 Flutter 프로젝트와 결제·디자인 작업은 보존했다. 생성 plugin registrant·빌드 파일은 목록에 포함하지 않는다.

```text
lib/features/challenge/application/challenge_providers.dart
lib/features/challenge/application/photo_controller.dart
lib/features/challenge/application/walk_controller.dart
lib/features/challenge/data/challenge_repository.dart
lib/features/challenge/data/challenge_vault.dart
lib/features/challenge/data/preview_challenge_api.dart
lib/features/challenge/domain/challenge_models.dart
lib/features/challenge/presentation/challenge_common.dart
lib/features/challenge/presentation/challenge_screens.dart
lib/features/challenge/presentation/course_screens.dart
lib/features/challenge/presentation/diary_screens.dart
lib/features/challenge/presentation/record_screens.dart
lib/features/challenge/presentation/route_editor_screen.dart
lib/features/challenge/presentation/walk_screens.dart
lib/features/challenge/presentation/walking_map.dart
lib/features/account/data/auth_identity_repository.dart
lib/features/account/data/verified_appauth_driver.dart
lib/features/account/application/api_session.dart
lib/features/account/data/account_repository.dart
lib/features/account/presentation/api_auth_screens.dart
lib/features/account/presentation/api_account_screens.dart
lib/features/settings/presentation/settings_screens.dart
lib/app/router.dart
lib/app/gaegaeting_app.dart
android/app/src/main/AndroidManifest.xml
ios/Runner/Info.plist
ios/Runner.xcodeproj/project.pbxproj
pubspec.yaml
pubspec.lock
.dart-define.stg.example.json
README.md
CHALLENGE.md
test/challenge_app_fixture.dart
test/challenge_fixtures.dart
test/challenge_contract_test.dart
test/challenge_recovery_test.dart
test/challenge_screen_test.dart
test/challenge_photo_test.dart
test/auth_identity_test.dart
integration_test/challenge_flow_test.dart
integration_test/challenge_review_app.dart
test_driver/challenge_driver.dart
```

빌드 정리 이후에도 남는 검증 산출물은 `/Users/kangjuhyup/.codex/artifacts/gaegaeting-flutter/challenge-20261006/`에 복사했다. `screenshots/`에는 원본 19개·390px 검토본·contact sheet, `evidence/`에는 operation/SDL/HTTP401 확인, `logs/`에는 테스트·분석·플랫폼 빌드 로그가 있다. `files-modified.json`은 위 파일의 실제 절대 경로를 기록한다.
