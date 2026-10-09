# 개발 API·native 등록 검증

## 2026-10-07 실제 개발 환경 후속 검증

[최신 원시 집계·명령·증거 보고서](/Users/kangjuhyup/.codex/artifacts/gaegaeting-flutter/native-chat-dev-20261007/deployment-report.md)를 따른다. 아래 2026-10-06의401/invalid_client/68문서 결과는 역사적 기록이다.

실제 native 공개 PKCE·nonce/issuer/aud/sub 서명 검증·opaque Bearer introspection·refresh 성공. 사용자 별도 승인 QA mapping2건과 profile/pet 생성 후 Android AppAuth 로그인/서버 데이터 표시/재시작 복원 성공. 두 사용자 public HTTPS Gateway에서5 domain 조회를 실행했으며 Payment wallet/history는 성공, 비활성 상품은 STORE_UNAVAILABLE이다. Challenge 참여/재시도/상세/소유자 거절/취소를 실제 실행했다.

live5 subgraph의 SDL/health는 전부200이고 배포 Gateway package로 fresh composition한 앱75문서 모두 유효하다. 문서 검증은 schema compatibility이며75개 실제 사용자 실행 성공과 다르다. 인증 없는 HTTP401, forged Bearer/principal401, private Chat경로404, WS no-init4408/missing·invalid token4401/disallowed Origin403도 확인했다.

발견한 valid-user WS4401 issuer mapping 오류는 core1.0.15/PR34 실제 Gateway Ready 후 QA2 ack/보호 구독·invalid/missing4401 재검증으로 해소했다. Android 정상 세션에서 상대 메시지를 새로고침 없이 수신하고 자동 읽음 서버 반영까지 확인했다. Account ORM enum도 core1.0.14/PR33 반영 후2QA 프로필 수정·저장·타소유자 거절14검사를 통과했다. 공개 결과에는 raw token/ID/GPS/사진 metadata를 기록하지 않는다.

Chat PR32 실제 Argo 반영 후 공개 native Bearer `syncChatRooms`가 HTTP200/GraphQL 오류없음으로 성공했다. Chat 기존 image/migrationUID/타9 template를 보존했다. 에뮬레이터 실제 자유 산책 시작과 GPS22점/일시정지 서버 상태도 확인했다(virtual GPS, 실기기 증거 아님).

실제 후속 흐름: QA2명 간 관심 보내기/수락/방 생성/메시지 전송/같은 clientMessageId 재시도(같은 메시지1개)/다른 본문 충돌 거절/상대 조회/읽음 처리 성공. 사진 예약→Bearer 없는 별도 PUT→READY 검증→signed URL 조회/재조회→새 미사용 사진 삭제 성공. Android0.1.0+4에서 같은 좌표의 지도 복구 ANR를 확대 상한으로 교정해 재개 구간 GPS→최종31점 FINISHED→비공개 일기1개 저장 성공. 모두 synthetic dev 데이터이며 가상 GPS·API 직접 사진 시험은 실기기/앱 이미지 선택기/75개 전부 E2E와 구분한다.

## 2026-10-06 이전 검증 기록

최초 검증 시점(2026-10-06, 실제 배포 승인 전)의 기록이다. 이후 사용자 승인에 따른 source/image/GitOps 반영과 최신 계약 결과는 [DEV_DEPLOYMENT.md](DEV_DEPLOYMENT.md)를 따른다. 현재 Match·Gateway 반영 후 68개 유효·0개 불일치·7개 Chat 미구성 상태이며, 아래 61개 결과는 이전 서버 snapshot이다. 정상 native 사용자 E2E는 아직 미완료다.

2026-10-06. 로컬 `gaegaeting-mobile`의 결제·챌린지 권한 추가는 완료했다. 공유 개발 tenant의 신규 native 등록은 Auth URI validator가 HTTP 400으로 거절했다. **전체 API 사용자 E2E 완료가 아니다.** 서버 배포·스토어 활성화·유료 결제·새 키 발급은 실행하지 않았다.

## 연결값과 실제 등록

client ID는 두 환경 모두 **`gaegaeting-mobile`**이다. `gaegaeting-mobile-dev`를 만들지 않는다. 환경은 기존 tenant·issuer·resource로 구분한다.

| 환경 | tenant / issuer | resource | 실제 상태 |
| --- | --- | --- | --- |
| 로컬 | `gaegaeting` / `http://localhost:3002/t/gaegaeting/oidc` | `https://api.gaegaeting.app` | 기존 public/native/none client 보존, 필수 12 scope 확인 |
| 공유 개발 | `gaegaeting-dev` / `https://auth.rvkang.app/t/gaegaeting-dev/oidc` | `https://test-ggt-api.rvkang.app` | 12 scope 정의 존재, native client 신규 POST 400 |

공통 callback은 `app.gaegaeting:/oauth/callback`, logout은 `app.gaegaeting:/oauth/logout`, grants는 `authorization_code refresh_token`, response는 `code`다. 앱은 AppAuth·S256 PKCE·기존 보안 저장을 사용한다. 사용자 access token은 opaque일 수 있다.

로컬 Admin API에 `payment:read payment:write challenge:read challenge:write` 정의만 추가하고 기존 client에 scope-only `PUT`을 적용했다. 기존 이름 `Gaegaeting Flutter`, UI `http://localhost:5174/interaction`, callback·resource·기존 scope와 다른 client는 보존했다. Vote 소유 `vote-auth-service` 이미지·DB·키·실행 상태를 변경하거나 재시작하지 않았다. 재실행에서는 scope/client 생성·수정 요청이 **0개**였고 모든 관리자 세션을 종료했다.

공유 개발은 같은 ID로 실제 등록을 시도했다. `redirectUris`와 `postLogoutRedirectUris`가 URL-only 검증에 걸려 HTTP 400을 반환했다. 기존 client 비교 결과 동일했고 새 client/secret은 생성되지 않았다. 예전 `gaegaeting-mobile-dev` payload와 과거 invalid_client probe는 현재 등록 지시의 정본으로 사용하지 않는다.

## 실제 기기·서버 근거

| 검증 | 실제 실행 | 결과와 범위 |
| --- | --- | --- |
| Android 개발 Gateway | 정상 앱 ProviderContainer·Retrofit/Dio로 19개 읽기 요청, fixture/토큰 주입 없음 | 19/19 HTTP 401. endpoint 도달·미인증 차단 확인이며 조회 성공을 뜻하지 않음 |
| 저장된 dev native 세션 | 실제 앱 secure storage와 identity 조회 경로 | 세션 없음. 인증된 요청·mutation 실행 0개 |
| 로컬 AppAuth | 정상 `lib/main.dart` APK, 실제 Auth·native 전용 React interaction UI | 아이디·비밀번호 로그인 form 도달. 취소 후 앱 복귀·재시도 안내 확인. 사용자 로그인 성공/토큰 교환은 미검증 |
| 배포된 subgraph SDL | ready dev Gateway에서 실제 각 서비스 `_service { sdl }`, 앱 75개 문서 검증 | 61 schema-valid, Match 7개 불일치, Chat 7개 서비스 미구성 |
| 정적 계약 수집 | 실제 앱 operation 상수 + Account/Payment 요청 캡처 | 75개. no-network adapter 호출 0회; 별도 합성 QA이며 live mutation 아님 |
| Payment dev runtime | ready Payment pod의 구매 flag 두 개만 읽기 | `PAYMENT_APPLE_ENABLED=false`, `PAYMENT_GOOGLE_ENABLED=false`. 구매/스토어 SDK 실행 없음 |

현재 dev Gateway는 `https://test-ggt-api.rvkang.app/gateway/graphql`이다. Account 17/17, Challenge 35/35, Payment 5/5 문서는 배포 SDL과 일치하고 Match 기존 4개도 일치한다. SDL 일치는 resolver·소유자 권한·DB 저장·Gateway composition 성공을 증명하지 않는다. 특히 `deletePet` 필드 존재를 실제 삭제 지원으로 해석하지 않는다.

배포 Match에 없는 root는 `myReceivedLikes`, `mySentLikes`, `myPairs`, `acceptLike`, `declineLike`, `cancelPair`, `reportPair`다. Gateway에 `CHAT_SERVICE_URL`이 없어 `chatRooms`, `syncChatRooms`, `chatRoom`, `chatMessages`, `sendChatMessage`, `markChatRead`, `chatEvents`의 대상 서비스 계약을 확인할 수 없었다. 소스/fixture 테스트 성공과 이 배포 상태를 구분한다.

## 실행·검증 명령

앱 디렉터리에서 고정 Flutter 3.47.6/Dart 3.13.5, Node 24.13.1/pnpm 10.34.5, JDK 17을 사용했다. 의존성과 SDK를 업그레이드하지 않았다.

```sh
fvm flutter test --no-pub test/dev_operation_manifest_test.dart
fvm dart analyze --fatal-infos lib test integration_test test_driver
JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home \
  fvm flutter drive --driver=test_driver/dev_gateway_driver.dart \
  --target=integration_test/dev_gateway_test.dart \
  --dart-define-from-file=.dart-define.stg.json -d emulator-5554 --no-pub
JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home \
  fvm flutter build apk --debug --no-pub --target=lib/main.dart \
  --dart-define-from-file=.dart-define.local-api.example.json
```

manifest 1개 테스트, 전체 Dart analyzer, dev 실제 device drive, local 정상 entry APK build가 통과했다. `gaegaeting-mobile`로 바꾼 뒤 device drive를 다시 실행했다. Auth 소유자가 helper 6개·native URI DTO 회귀 49개를 검증했고 coordinator도 helper 6개를 재실행했다. 기존 앱 전체 회귀 결과는 [SOCIAL.md](SOCIAL.md)에 있으며 이번 공개 ID/QA 도구 변경으로 전부 재실행했다고 주장하지 않는다.

이번 변경 파일은 `.dart-define.stg.example.json` 및 gitignored `.dart-define.stg.json`, `integration_test/dev_gateway_test.dart`, `test_driver/dev_gateway_driver.dart`, `test/dev_operation_manifest_test.dart`, 이 문서와 `README.md`, `CHALLENGE.md`, `PAYMENT.md`, `SOCIAL.md`, `RELEASE_PREPARATION.md`다. 기존 가입·추천·프로필·결제·챌린지·디자인 코드와 미커밋 도메인 변경은 보존했다. Auth 원본의 기존 미커밋 세 파일도 그대로 보존하고 검토용 인계만 별도로 마련했다.

로컬 로그인 UI는 기존 React 코드를 그대로 사용하며 **native 전용 실행 환경**에서 client binding을 맞춘다. 웹 client 대신 native AppAuth를 사용한다. 앱 디렉터리에서 다음 공개 설정으로 실행한다.

```sh
VITE_OIDC_CLIENT_ID=gaegaeting-mobile \
VITE_AUTH_ORIGIN=http://localhost:3002 \
VITE_OIDC_ISSUER=http://localhost:3002/t/gaegaeting/oidc \
VITE_ACCOUNT_GRAPHQL_URL=http://localhost:2800/account/graphql \
  pnpm exec vite --host 0.0.0.0 --port 5174 --strictPort
adb reverse tcp:3002 tcp:3002
adb reverse tcp:5174 tcp:5174
```

로컬 Auth/interaction UI는 실행 중이다. Account·Match·Payment·Gateway 등 로컬 도메인 서버를 이 검증에서 시작하지 않았으므로 로컬 가입·전체 API 동작을 완료했다고 해석하지 않는다. 에뮬레이터는 로컬 정상 entry 앱의 로그인 화면으로 복귀한 상태다.

## 안전한 설정·증거 위치

- 앱 `.dart-define.stg.example.json` / gitignored `.dart-define.stg.json`: 공개 URL·ID, `STORE_PURCHASES_ENABLED=false`. 서버 secret이나 Bearer를 넣지 않는다.
- 기존 로컬 Auth 컨테이너 환경의 `ADMIN_USERNAME`, `ADMIN_PASSWORD`: 기존 값을 메모리에서만 사용했다. 값은 파일/로그/응답에 기록하지 않는다.
- 기존 Doppler `auth/prd`의 `ADMIN_USERNAME`, `ADMIN_PASSWORD`: 공유 Auth 관리자 인증을 위해 기존 저장값만 읽고 **dev tenant**의 native 등록만 시도했다. production tenant를 수정하지 않았다.
- 기존 Doppler `gaegaeting/stg`: 서버 DB·내부 인증·스토리지·결제 자격증명 저장 위치. 앱 공개 설정에 복사하지 않는다.
- 영구 로컬 증거: `/Users/kangjuhyup/.codex/artifacts/gaegaeting-flutter/dev-api-20261006/`. 안전한 JSON·앱 로그인 캡처·Auth helper/tests/public payload와 검토용 URI 패치만 보관했다. 브라우저 원본 URL, OIDC state/code, cookie, GPS·사진 metadata는 보관하지 않았다.

주요 증거 파일은 `device-read-results.json`, `deployed-contract-validation.json`, `local-native-registration-result.json`, `local-native-idempotency-result.json`, `local-native-ui-result.json`, `remote-native-registration-result.json`이다. `native-auth-handoff/`에는 Auth 소유자의 helper/tests와 패치 인계가 있다. 해당 패치는 현재 원격 Auth release base에 최소 변경으로 대조·통합해야 하며 전체 DTO 파일을 무작정 덮어쓰지 않는다.

## 남은 최소 선행조건

1. **Auth 소유자:** 검증된 custom native URI validator 수정을 정식 release base에 통합·배포한 뒤 `gaegaeting-dev`에 `gaegaeting-mobile` 등록. 원격 배포는 이번 위임 범위 밖이다.
2. **Match/Chat/Gateway 소유자:** 앱이 요청하는 관심 root와 Chat subgraph/HTTP·WS composition을 실제 dev 환경에 준비.
3. **테스트 환경 소유자:** 승인된 native QA 계정과 사진 origin/저장소 연결, 필요한 로컬 서비스 설정 준비. 자격증명은 기존 안전한 저장소에서 전달.
4. **Flutter QA:** 실제 native 로그인·refresh·logout·가입 복귀 후 저장된 동일 계정 세션으로 device read probe 재실행. 두 계정 관심/채팅, 프로필·사진, 산책 GPS/복구, 일기·공개 moderation 및 지갑 재동기화는 별도 live E2E로 검증.

iOS·실기기·백그라운드 GPS·실 스토어 Sandbox 구매는 이번 live 검증에서 실행하지 않았다. 양 스토어 구매는 비활성으로 유지한다.
