# Flutter 간식 결제 연동

2026-10-05 기준. 구현·설정 파일은 리뷰용이며 배포·스토어 활성화·실제 과금은 실행하지 않았다.

## 정본과 현재 상태

- 서버 계약은 [Payment README](../payment/README.md), [GraphQL 연산](../payment/examples/mobile-operations.graphql), [인증 계약](../../docs/central-auth-client-integration.md)의 core 1.0.10 (`75c5a25`)을 따른다. 결제 담당 worktree `b8c2274`와 해당 파일들의 차이가 없음을 확인했다.
- 결제 담당 Orca 터미널의 2026-10-05 최종 배포 기록은 `gaegaeting-dev`, Doppler `gaegaeting/stg`, 양 스토어 비활성, 지갑 조회·구매 차단 검증 완료다. 이 작업은 해당 상태를 변경하지 않는다.
- 앱의 `STORE_PURCHASES_ENABLED` 기본값과 모든 실행 예시는 `false`다. 이때 SDK 상품 조회·미완료 거래 조회·구매를 실행하지 않는다. 서버 지갑·내역·판매 상태만 읽는다. 서버 `STORE_UNAVAILABLE`, 상품 미등록, 지원하지 않는 offer도 구매를 차단한다.
- 기존 작업 공간에는 React만 있었으므로 원본 `feat/core/chat-messaging`의 미커밋 Flutter 소스·플랫폼·에셋·테스트·핀을 선별 이관했다. 원본 코드, 로그인 웹 UI, 다른 도메인의 변경은 수정하지 않았다. 환경 파일·빌드 캐시·자격증명은 복사하지 않았다.

## 계약과 동작

`payment:read`로 `snackProducts`, `mySnackWallet`, `mySnackTransactions`를 읽는다. `payment:write`로 `prepareSnackPurchase`와 `confirmSnackPurchase`를 호출한다. 기존 Gateway Retrofit/Dio와 AuthClient의 AppAuth·PKCE·보안 세션·만료 전 refresh를 사용한다. HTTP 401/403 또는 GraphQL 인증/권한 오류에는 재로그인을 안내하며 구매 복구 정보를 유지한다. HTTP 200의 GraphQL 오류도 실패다.

1. 서버의 활성 판매 조건과 SDK에서 조회한 상품을 연결한다. 서버 수량·참고 KRW 가격과 스토어의 실제 현지 가격·통화를 사용한다. 앱에 기본 상품 목록·가격을 하드코딩하지 않는다.
2. 구매 버튼은 서버 판매 상태와 스토어 가격을 다시 확인하고 서버 구매 준비를 요청한다. 준비 응답의 상품·수량·가격이 화면 조건과 달라지면 목록 갱신을 요청한다.
3. 서버의 준비 ID·계정 연결·상품을 안전하게 저장한 뒤 Apple `appAccountToken` 또는 Google `obfuscatedAccountId`로 전달해 소모성 상품을 구매한다.
4. 콜백 증거는 보안 저장 후 서버에 `{preparedId, proof}`만 제출한다. Apple StoreKit 2의 JWS/거래 ID, Google의 구매 token을 사용한다. 사용자 ID·수량·금액은 지급 입력으로 보내지 않는다.
5. `PENDING`·취소·실패·검증 오류·`REFUNDED`는 충전 성공으로 표시하지 않는다. `PURCHASED` 응답 뒤에만 Apple 거래를 finish한다. Google은 `autoConsume:false`이며 앱 consume/acknowledge를 호출하지 않고 기존 서버 후속 작업에 맡긴다. 잔액은 서버에서 다시 읽고 로컬에서 더하지 않는다.
6. 시작·로그인·앱 복귀·구매 내역 동기화에서 보존된 준비 ID와 증거를 재제출하고 StoreKit 미완료 거래 또는 Play 미소비 구매를 재조회한다. 완료한 소모성 구매는 서버 잔액·내역으로 재동기화한다. 원래 계정과 환경에만 제출한다.

기기에서 준비 ID가 유실된 거래는 현재 API에 준비 내역 조회/재연결 연산이 없으므로 임의로 새 준비를 만들지 않는다. 서버 알림이 기존 준비와 연결해 복구할 수 있으며, 앱은 고객지원과 잔액 확인을 안내한다. 같은 기기의 미완료 구매가 있으면 새 구매를 막는다. 결제 시작 이후 애매한 SDK 오류도 복구 정보를 보존한다. 검증 오류가 지속될 때 앱 데이터나 보안 저장을 삭제하지 말고 서버에서 원래 구매 준비·거래를 조사한다. 환불은 스토어 정책과 기존 서버 처리에 맡기며 앱 환불 요청 API는 추가하지 않았다.

Google 특정 `storeOfferId` 일회성 할인은 현재 고정 SDK의 wrapper에 offer ID/token 선택 정보가 없어 차단한다. [현재 공식 wrapper API](https://pub.dev/documentation/in_app_purchase_android/latest/billing_client_wrappers/OneTimePurchaseOfferDetailsWrapper-class.html)와 0.5.3 소스를 확인했다. 별도 이벤트 SKU(`storeOfferId:null`) 또는 Apple의 스토어 가격 예약은 기존 서버 매핑으로 지원한다. 할인별 offer token을 임의로 만들지 않는다.

## 앱 설정과 안전한 저장 위치

Flutter `.fvmrc` 3.47.6, Dart 3.13.5, Gradle wrapper 9.3.1, AGP 9.1.0, Kotlin 2.4.0, Java target 17을 유지한다. 검증에는 설치된 Zulu JDK 17.0.14를 사용한다. Android SDK36·Build Tools36.0.0·NDK28.2.13676358은 기존 Flutter 핀을 따른다. SDK는 `in_app_purchase` 3.3.1 / Android 0.5.3 (Play Billing 8.0.0) / StoreKit 0.4.11+2이며 `pubspec.lock`에 고정한다. StoreKit 0.4.12 이상에서 추가된 구독용 introductory offer API는 로컬 Xcode 16.2에 없어 0.4.11+2를 명시적으로 고정했다. 이번 소모성 결제에 필요한 JWS·appAccountToken·미완료 거래 조회는 유지한다. [공식 변경 기록](https://pub.dev/packages/in_app_purchase_storekit/changelog). iOS 최소 버전은 15.0이다.

| 위치 | 내용 |
| --- | --- |
| Android `app/build.gradle.kts` | package/namespace `app.gaegaeting`, AppAuth redirect scheme, 기존 debug signing |
| Android main manifest | Billing·인터넷 권한, backup 비활성 |
| iOS `Runner.xcodeproj` | bundle ID `app.gaegaeting`, In-App Purchase capability, iOS15 |
| `.dart-define.local-api.example.json` | 로컬 공개 URL·native client·audience, 구매 비활성 |
| `.dart-define.stg.example.json` | stg HTTPS·개발 tenant·개발 API audience, 구매 비활성 |
| 복사한 `.dart-define.local-api.json` / `.dart-define.stg.json` | gitignore 대상. 공개 연결값만 사용 |
| Android secure storage namespace `gaegaeting_payment_v1` | KeyStore/AES-GCM 복구 journal, 로그인 저장과 분리, 오류 시 자동 초기화 금지 |
| iOS Keychain service `gaegaeting.payment.v1` | this-device-only 복구 journal |
| journal key `gaegaeting.payment.v1.<환경 digest>` | issuer·client·Gateway별 분리. 사용자별 소유자 검증. 로그아웃에도 복구 정보 보존 |
| Doppler `gaegaeting/stg` | 기존 Payment 서버 DB·증거 암호화·내부 인증 설정. 실제 값은 앱·소스·로그에 포함하지 않음 |

완료 journal은 증거 원문을 제거하며 최근 50건의 digest/거래 연결만 유지한다. 미완료 증거는 완료까지 보존한다. 클라이언트 로그에는 GraphQL 메시지 원문이나 SDK 오류 상세를 표시하지 않는다. 실제 구매 증거·사용자 token·관리 token·클라이언트 secret을 `dart-define`에 넣지 않는다. 기존 `PAYMENT_PROOF_ENCRYPTION_KEY`는 회전·재발급하지 않는다. Android release는 현재 debug signing이므로 스토어 제출 전에 별도 안전한 서명을 구성해야 한다.

## 실행

이 디렉터리에서 실행한다. native client가 해당 tenant에 등록된 뒤 이용한다.

```sh
fvm flutter pub get --enforce-lockfile
fvm dart run build_runner build
cp .dart-define.local-api.example.json .dart-define.local-api.json
adb reverse tcp:8080 tcp:8080
adb reverse tcp:2800 tcp:2800
adb reverse tcp:3002 tcp:3002
fvm flutter run -d emulator-5554 --dart-define-from-file=.dart-define.local-api.json
```

Account·Match·Payment·Gateway·Envoy·Auth를 준비한다. Payment의 2802를 과거 Chat 포트로 사용하지 않는다. 서버 연결은 Gateway의 `PAYMENT_SERVICE_URL`을 사용하며 앱은 내부 Payment URL/assertion secret을 갖지 않는다.

stg는 `.dart-define.stg.example.json`을 `.dart-define.stg.json`으로 복사한다. 공개 native client ID는 로컬과 공유 개발환경 모두 `gaegaeting-mobile`로 통일한다. 개발환경은 `gaegaeting-dev` tenant와 해당 issuer·API audience로 구분하며 별도 `gaegaeting-mobile-dev` client를 만들지 않는다. 설정 파일 작성과 실제 Auth 등록 완료는 별개다. 웹 client `gaegaeting-web`을 대신 사용하지 않는다. `/api/main` 상단 간식 잔액에서 `/api/snacks`로 이동한다. API 모드의 기존 `/snacks/purchase` 경로도 실제 결제 화면으로 연결되며 디자인 미리보기 충전은 실행하지 않는다.

## 사용자가 외부에서 준비할 항목

지금 활성화하지 않는다. 아래 항목은 차후 Sandbox 검증 준비에 필요한 요청이며 비밀 값은 채팅으로 전달하지 않는다.

1. **Auth**: `gaegaeting-dev` tenant에 public native client를 등록/확인한다. `authorization_code`, `refresh_token`, PKCE, client authentication `none`, redirect `app.gaegaeting:/oauth/callback`, logout `app.gaegaeting:/oauth/logout`, audience `https://test-ggt-api.rvkang.app`, 기존 account/match scopes와 `payment:read payment:write`를 허용한다. 기존 세션에는 권한이 없을 수 있어 재로그인한다. 사용할 client ID와 테스트 계정의 준비 여부만 공유한다.
2. **Apple**: Apple Developer/App Store Connect의 앱 bundle `app.gaegaeting`을 확정하고 Paid Apps 계약·세금·은행 정보, In-App Purchase 권한·서명 team을 준비한다. 아래 ID의 consumable 상품과 한국 가격·판매 지역·메타데이터를 등록한다. Sandbox tester를 생성한다. 서버 Notifications V2 Sandbox URL은 공개 ingress에 정확한 `/payment/notifications/apple`을 연결한 후 등록한다. [Apple 상품 설정](https://developer.apple.com/help/app-store-connect/configure-in-app-purchase-settings/overview-for-configuring-in-app-purchases/), [Sandbox 계정](https://developer.apple.com/help/app-store-connect/test-in-app-purchases/create-a-sandbox-apple-account/).
3. **Google**: Play Console의 앱 package `app.gaegaeting`을 확정하고 판매자 결제 프로필·서명·내부 테스트 준비, 아래 일회성 상품의 활성 구매 옵션·가격·지역을 등록한다. 서버는 거래 수량 1만 허용하므로 다중 수량 구매는 활성화하지 않는다. Android Publisher API 조회/consume 및 Voided Purchases 권한을 부여한 서버 서비스 계정과 RTDN Pub/Sub push 인증 계정을 준비한다. HTTPS notification 경로 `/payment/notifications/google`, audience·push 계정을 맞춘다. license tester와 Play 설치 기기를 준비한다. 테스트 track만 등록한 일반 계정은 실제 과금될 수 있으므로 license tester의 테스트 결제 수단만 사용한다. [Google 테스트 안내](https://developer.android.com/google/play/billing/test), [서버 검증·consume](https://developer.android.com/google/play/billing/security).

| 간식 | Apple/Google product ID | 서버 기본 판매 조건 | 기준 KRW 가격 |
| --- | --- | --- | --- |
| 10개 | `app.gaegaeting.snacks.10` | `apple-snacks-10` / `google-snacks-10` | 2,000 |
| 50개 | `app.gaegaeting.snacks.50` | `apple-snacks-50` / `google-snacks-50` | 6,000 |
| 100개 | `app.gaegaeting.snacks.100` | `apple-snacks-100` / `google-snacks-100` | 10,000 |

상품 ID·지급 수량의 기존 매핑을 보존한다. 콘솔에서 ID가 다르면 판매 시작 전 서버 매핑·허용 목록을 검토해서 맞춘다. 가격 표시의 최종 기준은 스토어 응답이다.

**서버 설정 요청**: 승인받은 담당자가 기존 Doppler `gaegaeting/stg`에 `PAYMENT_APPLE_BUNDLE_ID`, `PAYMENT_APPLE_KEY_ID`, `PAYMENT_APPLE_ISSUER_ID`, `PAYMENT_APPLE_APP_ID`, `PAYMENT_APPLE_PRODUCT_IDS`, `PAYMENT_APPLE_SIGNING_KEY_PATH`, `PAYMENT_APPLE_ROOT_CERT_PATHS`와 `PAYMENT_GOOGLE_PACKAGE_NAME`, `PAYMENT_GOOGLE_PRODUCT_IDS`, `PAYMENT_GOOGLE_PUSH_AUDIENCE`, `PAYMENT_GOOGLE_PUSH_SERVICE_ACCOUNT_EMAIL`, ADC/`GOOGLE_APPLICATION_CREDENTIALS`를 구성한다. `.p8`·서비스 계정 파일은 서버에만 마운트하고 경로를 설정한다. 외부 ingress·마운트는 기존 인프라 저장소에서 검토한다. 알림 URL이 외부에 열려 있다고 현재 가정하지 않는다.

두 서버 enabled 값과 앱 enabled 값은 계속 false로 둔다. 자격증명·상품·native Auth 설정 확인 뒤 별도 승인된 Sandbox 작업에서만 필요한 플랫폼을 활성화하고 `PAYMENT_STORE_ENVIRONMENT=Sandbox`를 사용한다. 프로덕션 환경은 Sandbox를 거절한다. 앱 flag는 테스트 환경을 강제하거나 권한을 부여하는 보안 경계가 아니다. 이번 작업에서 새 키 발급·회전, secret 비활성화, 콘솔 계약 제출·상품 활성화, 실제 유료 결제·배포는 하지 않았다.

## 검증 명령

```sh
fvm dart format --output=none --set-exit-if-changed lib test integration_test test_driver
fvm dart analyze --fatal-infos lib test integration_test test_driver
fvm flutter test --no-pub
fvm flutter build web --release --no-pub
JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home fvm flutter build apk --debug --no-pub
JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home fvm flutter drive --driver=test_driver/payment_smoke_driver.dart --target=integration_test/payment_disabled_test.dart -d emulator-5554 --no-pub
```

에뮬레이터 검증은 기기 내 임시 HTTP 계약 fixture를 대상으로 실제 Retrofit/Dio 전송, 별도 보안 저장, 서버 잔액·구매 불가 UI, 버튼 재동기화를 확인한다. live stg 로그인·실제 Payment DB·스토어 검증을 대체하지 않는다. 테스트 화면 캡처는 `build/payment-smoke/payment-disabled-android.png`다. 재현용 테스트 증거/세션은 합성 문자열이며 실제 자격증명을 쓰지 않는다. 실제 Sandbox에서는 정상·대기·취소·실패·검증 실패·응답 유실·재실행·중복 제출·계정 전환·재구매·환불·별도 기기 잔액을 검증한다.

## 2026-10-05 검증 결과

| 검증 | 결과 |
| --- | --- |
| `flutter pub get --enforce-lockfile` | exit 0, 핀과 lockfile 일치 |
| Retrofit/JSON `build_runner build` | exit 0, 생성 완료 |
| format (lib/test/integration_test/test_driver) | exit 0, 변경 필요 없음 |
| Dart analyze `--fatal-infos` | exit 0, 오류·경고·info 없음 |
| Flutter analyze (ASCII symlink) | exit 0, 오류 없음 |
| Flutter 전체 테스트 | exit 0, 69개 통과 (기존 39개 + 결제 30개) |
| Flutter web release build (최종 lockfile) | exit 0, `build/web`, Wasm dry run도 성공 |
| Android debug APK (최종 main.dart) | exit 0, `build/app/outputs/flutter-apk/app-debug.apk` |
| APK manifest 검사 | `app.gaegaeting`, minSDK24/compileSDK36/targetSDK36, Billing 권한 확인 |
| Android emulator drive | exit 0, 계약 HTTP 6회·비활성 UI·보안 저장·재동기화 통과, 화면 캡처 확인 |
| iOS Simulator build / Xcode16.2 | exit 0, `build/ios/iphonesimulator/Runner.app` |
| 개발 Auth OIDC discovery | HTTPS issuer 일치, PKCE `S256` 확인 |
| stg 공개 Gateway 미인증 요청 | HTTP 401, 인증 거절 확인 |
| 인증된 stg 모바일 로그인·결제 API | 미실행, native client/테스트 계정 확인 필요 |
| Apple/Google 실제 Sandbox·실기기 구매 | 미실행, 스토어 비활성 유지 |

Flutter 3.47.6의 `flutter analyze`는 이 worktree의 한글 경로를 LSP Content-Length로 전송할 때 프로토콜 오류로 종료했다. 동일 소스를 임시 ASCII symlink로 지정해 정상 완료했고, 직접 Dart 분석도 통과했다. SDK나 버전 핀은 수정하지 않았다. 기존 geolocator 등 Android 의존성의 Java8/deprecated API 빌드 경고가 있었으며 이번 결제 코드 분석 경고는 없다. SwiftPM이 생성한 로컬 plugin reference와 AppAuth-iOS 2.1.0 resolved 파일을 iOS 프로젝트에 포함한다.

결제 추가 테스트는 검증 전 성공·finish 금지, 중복/재시작, store/server pending, 취소·실패·환불, 검증 실패, 응답 유실 복구, Apple finish 실패, Google 서버 consume, 비활성/상품 종료/미등록/할인 offer 차단, 저장 실패·손상, 계정 전환·로그아웃, 권한 거절, 기존 SDK refresh 회전, HTTP200 부분 오류, 화면 선택·중복 클릭·320px 큰 글자를 검사한다.

리뷰 대상은 `lib/features/payment/` 7개 파일, `api_session.dart` scope, 앱 lifecycle/router·API 추천 잔액 연결, native 플랫폼 설정, `pubspec.yaml/lock`, 공개 설정 예시, Flutter CI·실행 스크립트, 결제 테스트·에뮬레이터 driver와 이 문서다. Flutter 기본 프로젝트도 함께 신규 파일로 표시되는 이유는 기존 미커밋 앱을 선별 이관했기 때문이다. 작업 브랜치는 지정된 `kangjuhyup/플러터앱`을 유지했으며 commit/push/merge/deploy는 하지 않았다.
