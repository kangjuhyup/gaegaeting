# integration-ui

2026-10-07 후속 개발 반영: Auth hosted runner·Doppler Chat 저장/배포·native 로그인·승인된 QA2계정 API 시험 및 Android0.1.0+4를 준비했습니다. 현재 실제 결과·미검증 범위는 [DEV_DEPLOYMENT.md](DEV_DEPLOYMENT.md), [DEV_API_VERIFICATION.md](DEV_API_VERIFICATION.md), [동료용 APK](INTERNAL_DISTRIBUTION.md)를 따릅니다. 아래 미리보기 동작은 API 모드의 실제 결제·재화 지급을 뜻하지 않습니다.

앱 배포 준비의 담당별 결과·서명 설정·공개 연결값·사전 점검과 미완료 항목은 [RELEASE_PREPARATION.md](RELEASE_PREPARATION.md)에 모았습니다. 스토어 구매는 계속 비활성이며, release AAB에는 기존 업로드 키를 runner에서 안전하게 주입해야 합니다.

개개팅 Flutter 클라이언트입니다. 웹·Android·iOS 프로젝트와 Riverpod, go_router, Retrofit 기반에 Figma의 가입·인증·프로필 등록·추천·개별 프로필 열람·간식 패키지 선택·알림 설정 플로우를 구현했습니다. 기본 실행은 디자인 미리보기이며, 별도의 API 실행 설정으로 Android·iOS에서 로컬 가입·OIDC 로그인·프로필·강아지·일일 추천·관심·채팅 API를 사용합니다. 기존 React 기능은 `src/`에 보존되어 있습니다.

## 화면 미리보기

앱의 첫 화면은 회원가입입니다. 개발 서버에서 `/#/flows`를 열면 화면별 진입점과 초기화 버튼을 확인할 수 있습니다. 이 목록의 `간식 부족`은 해당 상태를 검토하기 위해 미리보기 간식을 0개로 설정합니다.

- 카카오 가입 → 이용 동의 → 로그인 → 내 프로필 → 강아지 등록 → 메인
- 휴대폰 가입 → 인증번호 → 이용 동의 → 로그인
- 메인 → 동네 친구 10명 → 간식 사용 확인 → 선택한 프로필 열람 → 추천 목록
- 간식 부족 → 10개·50개·100개 패키지 선택 → 충전 후 흐름 미리보기
- 관심 표현 → 상대 응답 대기 → 상호 관심 → 채팅 팝업 → 선택한 친구의 채팅방
- 프로필 또는 메인의 알림 아이콘 → 알림·마케팅 수신 설정 → 저장

인증번호는 **123456**이며 유효시간은 3분입니다. SMS 전송, 카카오 인증, 서버 회원가입과 결제는 실행되지 않습니다. 간식은 2개로 시작하고 프로필 한 명을 열 때 2개를 사용합니다. 재열람은 무료이며 취소는 차감하지 않습니다. 구매 버튼은 결제 연동 안내를 표시하고 별도의 미리보기 버튼으로 충전 이후 흐름을 확인합니다. 입력, 동의와 열람 상태는 현재 앱 세션에만 보관되며 새로고침하면 초기화됩니다.

`관심`·`채팅` 탭은 원본 Figma의 받은 관심·보낸 관심·서로 관심·채팅 목록·채팅방·알림·상호 관심 팝업을 제공합니다. `/flows`의 시나리오 버튼으로 받은 관심과 상호 관심 상태를 직접 선택할 수 있습니다. 관심과 메시지는 세션에만 저장되고 다른 사용자에게 전송되지 않습니다. `챌린지`는 읽기 전용 catalogue 미리보기를 제공하고 실제 기능은 `/api/challenge`에서 Gateway에 연결합니다. [챌린지 설정·검증 인계](CHALLENGE.md)를 참고하세요. API 모드의 관심 목록·채팅·프로필 관리가 Gateway에 연결되었습니다. 새 관심 공개 어댑터의 서버 rollout과 native 로그인 선행조건, 사진 origin 및 검증 범위는 [SOCIAL.md](SOCIAL.md)를 참고하세요. 디자인 미리보기의 간식은 화면 흐름 확인용입니다. 실제 간식 구매는 `/api/snacks`에서 Payment API를 사용하며, 기본 설정은 스토어 비활성입니다. 알림 전달·유료 프로필 열람은 미리보기로만 제공합니다. 실제 API 모드는 `/api/` 경로를 사용하고 미리보기 데이터와 섞지 않습니다.

## 개발 환경

Flutter **3.47.6 stable**, Dart **3.13.5**를 사용합니다. Flutter 버전은 `.fvmrc`, 의존성 버전은 `pubspec.lock`으로 고정합니다. FVM을 설치한 뒤 이 디렉터리에서 실행합니다.

```bash
fvm install 3.47.6
fvm use 3.47.6
fvm flutter pub get --enforce-lockfile
fvm dart run build_runner build
fvm flutter run -d chrome --web-port=5173
```

저장소 루트의 `pnpm --filter @gaegaeting/integration-ui dev:flutter`도 같은 Flutter 웹 앱을 실행합니다. 기존 `pnpm dev:ui`는 React 실행을 유지합니다. Android SDK 또는 Xcode가 준비된 환경에서는 `fvm flutter devices`로 기기를 확인하고 `fvm flutter run -d <device-id>`로 실행합니다. Android/iOS 앱 식별자의 초기값은 `app.gaegaeting`이며, 스토어 배포 전 식별자와 서명 설정을 확정해야 합니다.

`fvm flutter doctor`로 플랫폼별 개발 환경을 확인합니다. Android 빌드에는 SDK Platform 36, Build-Tools 36.0.0, NDK 28.2.13676358과 JDK 17 이상이 필요합니다. Gradle은 프로젝트 래퍼의 9.3.1을 사용합니다. macOS 기본 SDK 경로에서는 다음 명령으로 필요한 항목을 설치합니다.

```bash
"$HOME/Library/Android/sdk/cmdline-tools/latest/bin/sdkmanager" \
  --install 'platforms;android-36' 'build-tools;36.0.0' 'ndk;28.2.13676358'
fvm flutter doctor -v
fvm flutter build apk --debug --no-pub
```

디버그 APK는 `build/app/outputs/flutter-apk/app-debug.apk`에 생성됩니다.

## 로컬 API 실행

Account(:2800), Match(:2801), Payment(:2802), Gateway(:4000), edge-authz(:4010), Envoy(:8080), Auth(:3002)를 먼저 실행합니다. [서버 실행 안내](../../README.md), [공유 로컬 인프라](../../ops/shared-local/README.md), [Envoy 설정](../../ops/local-envoy/README.md)을 참고하세요. 서버 연결값과 서비스 비밀은 서버 환경에서만 주입합니다.

Android 에뮬레이터에서는 아래 포워딩을 설정합니다. OIDC issuer의 정확한 `localhost` 주소를 유지하므로 API 주소만 `10.0.2.2`로 바꾸지 않습니다.

```bash
adb reverse tcp:8080 tcp:8080
adb reverse tcp:2800 tcp:2800
adb reverse tcp:3002 tcp:3002
adb reverse tcp:5174 tcp:5174
fvm flutter run -d emulator-5554 \
  --dart-define-from-file=.dart-define.local-api.json
```

로컬 설정에는 공개 주소·클라이언트 ID만 있습니다. `API_ENABLED=true`이면 첫 화면이 `/api/login`으로 바뀝니다. `.dart-define.example.json`과 기본 웹 실행은 디자인 미리보기입니다. 실제 기기에서는 HTTPS로 접근 가능한 Auth 및 API와 그 issuer에 등록된 별도 클라이언트를 사용해야 합니다.

Auth의 `gaegaeting` tenant에 다음 **public native client**를 등록합니다. 기존 웹 client나 Vote 설정을 변경하지 않습니다.

client ID는 로컬과 공유 개발환경 모두 `gaegaeting-mobile`입니다. 환경은 아래 tenant·issuer·resource로 구분합니다. `gaegaeting-mobile-dev` client나 추가 개발 tenant를 만들지 않습니다.

10/06 로컬 등록·scope 보완과 실제 에뮬레이터/개발 서버 검증 결과, 공유 개발의 등록 차단 원인은 [DEV_API_VERIFICATION.md](DEV_API_VERIFICATION.md)를 참고하세요.

| 환경 | tenant | issuer | API resource |
| --- | --- | --- | --- |
| 로컬 | `gaegaeting` | `http://localhost:3002/t/gaegaeting/oidc` | `https://api.gaegaeting.app` |
| 공유 개발 | `gaegaeting-dev` | `https://auth.rvkang.app/t/gaegaeting-dev/oidc` | `https://test-ggt-api.rvkang.app` |

- client ID: `gaegaeting-mobile`, 인증 방식: `none`
- application type: `native`, response type: `code`
- grants: `authorization_code`, `refresh_token`
- redirect: `app.gaegaeting:/oauth/callback`
- logout redirect: `app.gaegaeting:/oauth/logout`
- scopes: `openid profile email offline_access account:read account:write match:read match:write payment:read payment:write challenge:read challenge:write`
- resource: `https://api.gaegaeting.app`
- external interaction UI: `http://localhost:5174/interaction` (로컬)

### 모바일 로그인 웹 UI

모바일 AppAuth는 해당 Auth native client에 등록한 interaction UI를 사용합니다. 이 worktree의 기존 React 로그인 UI를 유지하며 원본의 미커밋 `dev:interaction` 설정은 이관하지 않았습니다. Auth에 등록한 HTTPS UI 또는 원본의 별도 로컬 로그인 UI를 사용하세요. public native client 등록은 [결제 문서](PAYMENT.md)의 tenant·redirect·scope 계약을 따릅니다.

앱 복귀 URI를 등록할 수 있는 Auth 서버 버전이 필요합니다. Auth Flutter SDK는 Git 커밋으로 고정하며 AppAuth/PKCE, 보안 저장, refresh 회전, 토큰 폐기 및 로그아웃을 사용합니다. SDK의 기존 AppAuth 9 Android compileSdk 제약으로 이 앱은 `dependency_overrides`에서 AppAuth 12.1.0을 고정합니다. SDK가 해당 버전을 지원하는 릴리스를 제공하면 override를 제거합니다.

Android `MainActivity`는 기본 task affinity를 사용합니다. Flutter 템플릿의 빈 `android:taskAffinity`를 추가하면 AppAuth 콜백을 받은 뒤 앱 화면으로 복귀하지 못할 수 있습니다.

회원가입은 Account의 최신 `registerAccount`에 아이디·비밀번호·이메일·약관·이름·생년월일·성별·휴대폰 번호만 전달합니다. CI·DI·성인 여부·거래 ID는 서버가 관리합니다. 로컬 서버는 모의 본인확인을 사용하며 문자 전송이나 실제 본인확인을 제공하지 않습니다. 가입 이후 OIDC 로그인을 별도로 시작합니다.

인증한 API 요청은 Retrofit/Dio로 Envoy를 통과합니다. HTTP 200이어도 GraphQL 오류가 있으면 저장 완료로 처리하지 않습니다. 프로필과 강아지는 서버에서 다시 불러오고 로그인할 때 해당 저장 상태에 맞춰 등록 또는 추천 화면으로 이동합니다.

앱 실행 시 인증 세션이 복원되거나 첫 로그인에 성공하면 현재 위치를 Match의 `setCurrentLocation`으로 기록한 뒤 `createDailyFeed`와 추천 목록 조회를 자동으로 이어갑니다. 백그라운드에서 앱으로 돌아올 때도 갱신합니다. 등록을 마친 사용자는 저장된 세션으로 추천 화면에 바로 진입합니다. 같은 한국 날짜·시간대의 추천이 이미 있으면 서버가 기존 추천을 반환합니다.

로그아웃 상태에서는 위치 권한이나 위치 기록을 요청하지 않습니다. OS 위치 권한을 허용해야 하며, 위치 조회 실패나 서버 오류는 앱 사용을 막지 않고 안내와 재시도 버튼을 표시합니다. 위치 저장 실패 시 추천 생성은 실행하지 않습니다. 추천은 자동으로 생성하며 실패 시 재시도할 수 있습니다. Android 에뮬레이터 검증에서는 Extended Controls의 Location 또는 `adb emu geo fix <longitude> <latitude>`로 테스트 위치를 주입합니다.

API 화면과 미리보기는 Figma의 공통 헤더·탭·하단 메뉴·필드 스타일을 사용합니다. 등록 폼은 1/2·2/2 진행 표시와 사진 영역을 유지하고, 강아지 품종·나이는 두 칸으로 표시합니다. 간식 잔액은 Payment 서버에서 조회하고 조회 전·오류 시 `—`로 표시하며, 실제 사진이 없는 프로필에 미리보기 사진을 사용하지 않습니다.

추천 프로필 조회와 좋아요도 저장할 수 있습니다. 간식 구매·지갑·내역은 Payment API와 연결합니다. 관심·채팅 WebSocket·프로필 관리의 현재 계약과 실제 서버 선행조건은 [SOCIAL.md](SOCIAL.md)에 있습니다. 유료 프로필 열람·알림 전달 API는 현재 구현 범위에 포함하지 않습니다.

| 경로 | 실제 기능 |
| --- | --- |
| `/api/signup` | Account 회원가입 |
| `/api/login` | OIDC 로그인·저장된 세션 복원 |
| `/api/profile` | 프로필 등록·수정 |
| `/api/pet` | 강아지 등록 |
| `/api/main` | 추천 조회·생성·좋아요 |
| `/api/snacks` | 서버 상품·지갑·구매 내역, 검증·재동기화 (기본 구매 비활성) |
| `/api/challenge` | 코스·산책·일기·챌린지·계정별 복구·내 기록 |
| `/api/me` | 프로필·강아지 조회, 수정 진입, 로그아웃 |

웹의 OIDC 로그인은 아직 이관하지 않았으므로 기본 웹 모드는 디자인 미리보기로 유지합니다. `dart-define`에는 client secret, 비밀번호, 액세스 토큰을 넣지 않습니다. Android HTTP 예외는 debug 빌드의 loopback과 에뮬레이터 호스트에만 적용합니다.

## 패키지 구성

| 위치 | 역할 |
| --- | --- |
| `lib/main.dart` | Riverpod 앱 시작점 |
| `lib/app/` | 앱 설정과 go_router 라우팅 |
| `lib/core/config/` | 환경별 API 주소 |
| `lib/core/network/` | Dio·Retrofit·GraphQL 요청 및 응답 모델 |
| `lib/core/design/` | Figma 색상·타이포그래피·공통 UI |
| `lib/features/account/` | 실제 Account·OIDC·추천 API 상태 및 화면 |
| `lib/features/onboarding/` | 가입·인증·내 프로필·강아지 등록 |
| `lib/features/discovery/` | 추천·개별 열람·간식 패키지 선택 |
| `lib/features/challenge/` | 실제 Gateway 챌린지·지도·GPS·사진·복구 |
| `lib/features/interest/` | 관심·상호 관심·채팅·알림의 세션 미리보기 |
| `lib/features/settings/` | 프로필·알림·마케팅 수신 설정 |
| `lib/features/flow/` | 미리보기 진입점과 세션 상태 |
| `assets/` | 원본 사진·SVG·Noto Sans KR·출처 및 라이선스 |
| `test/*.dart` | 화면 플로우·상태 규칙·API 전송 계약 테스트 |
| `web/`, `android/`, `ios/` | 플랫폼 실행 프로젝트 |

API 및 JSON 모델을 수정하면 코드 생성 명령을 다시 실행합니다. 생성된 `*.g.dart`와 `pubspec.lock`은 버전 관리합니다.

## 검증과 빌드

```bash
fvm dart run build_runner build
fvm dart format --output=none --set-exit-if-changed lib test integration_test test_driver
fvm dart analyze --fatal-infos lib test integration_test test_driver
fvm flutter test --no-pub
fvm flutter build web --release --no-pub
```

Flutter 웹 결과물은 `build/web/`에 생성됩니다. `pnpm --filter @gaegaeting/integration-ui build:flutter`도 웹 릴리스 빌드를 실행합니다. `.github/workflows/flutter-client.yml`에서 고정 SDK 및 잠금 파일로 코드 생성 일치 여부, 포맷, 분석, 테스트, 웹 빌드를 검증합니다.

기능 이관 중 기존 React 앱은 `pnpm --filter @gaegaeting/integration-ui dev:legacy`로 실행합니다. 기존 `build` 명령과 Docker 배포는 React의 `dist/`를 계속 사용합니다. Flutter의 기능 이관이 완료되면 배포 경로를 `build/web/`로 전환합니다.

## 결제 연동과 외부 설정

[결제 설정·검증 문서](PAYMENT.md)를 정본으로 사용합니다. 스토어 활성화와 배포는 이번 변경에 포함하지 않습니다. 2026-10-07 공유 개발 tenant `gaegaeting-dev`의 공개 native `gaegaeting-mobile` 등록과 Android PKCE 로그인 검증을 완료했습니다. 기존 웹 client를 재사용하지 않습니다. API 모드에서는 미리보기 충전 버튼을 사용하지 않습니다.

원본 디자인 비교 근거, 기기 캡처와 검증 범위는 [디자인 검토 기록](DESIGN_REVIEW.md)에 정리했습니다.
