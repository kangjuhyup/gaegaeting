# Figma 원본 비교 및 수정 기록

2026-10-05 원본 [개개팅 · Flows](https://www.figma.com/design/pcCLqdVZ1YqFb4mQoMNkHj/?node-id=18-1537)을 Chrome에서 컴퓨터 유즈로 직접 확인했다. MCP 디자인 조회의 한도·권한 오류 이후 사용자가 컴퓨터 유즈를 명시했다. 화면 캔버스, 레이어, 우측 디자인 패널의 수치·변수와 기존 로컬 에셋을 기준으로 수정했다.

## 비교 근거와 변경

| 원본 | 수정한 화면·컴포넌트 |
| --- | --- |
| `18:1362`, `18:1416` 가입·로그인 | 본문 16px 간격, 하단 버튼 8px 간격 |
| `18:1448`, `18:1489` 프로필·강아지 등록 | 사진·입력 구역 사이 간격 16px |
| `18:1537` 메인 | 추가 소개 카드·카테고리 탭 제거, 제목 다음에 추천 카드 표시, 관심 표현 문구 |
| `21:5730` 동네 추천·열람·간식 부족 | 설명 크기·간격, 잠긴 프로필의 중립색 비용 태그, 열람 후 관심 표현 버튼 |
| `21:5764`, `21:9021`, `21:9071` 간식 패키지 | 공통 카드, 수량·가격 상단 정렬, 선택 92px/기본 90px 최소 높이, 반경 20px, 선택 테두리 2px |
| `21:9022`, `21:9024`, `21:9032` 공통 구조 | AppBar 64px, 콘텐츠 패딩 16px, 하단 액션 상단 패딩 16px/버튼 간격 8px/기기 안전 영역 대응 |
| `21:9029` 선택 패키지의 `color/brand/subtle` | 선택 배경 `#FAE9DE` |
| `18:2000` 프로필·알림 | 프로필 구역 간격, 관심 표현·상호 관심·새 채팅의 독립 설정 |
| `25:9158`, `25:9159` 관심→채팅 | 받은/보낸/서로 관심, 대기·상호 관심, 받은 친구 프로필, 채팅 목록·방, 관심 알림의 세션 미리보기 |
| `27:10327` 상호 관심 팝업 | 선택 친구의 이름·아바타·상호 관심 태그, 채팅방 열기/나중에/닫기 |

동네 추천 진입은 메인 제목 옆 필터 버튼에 유지했다. API 모드의 서버 상태·위치 오류·잔액·검증 안내·내역 동기화는 실제 계약에 필요한 정보로 유지했다. 실 상품 카드의 수량·가격·구매 가능 여부는 서버와 스토어에서 받고 디자인 예시 가격을 대입하지 않는다. 스토어가 비활성일 때 상품을 만들어 표시하거나 구매 SDK를 실행하지 않는다.

## 변경 파일

- `lib/core/design/app_theme.dart`, `widgets.dart`: 색상·헤더·본문·안전 영역·공통 간식 카드.
- `lib/app/router.dart`, `bottom_navigation.dart`: 관심·채팅·알림 경로와 하단 안전 영역.
- `lib/features/onboarding/presentation/onboarding_screens.dart`, `settings/presentation/settings_screens.dart`: 등록·설정 배치와 서비스 알림 선택.
- `lib/features/discovery/presentation/discovery_screens.dart`, `account/presentation/api_account_screens.dart`, `api_auth_screens.dart`: 추천·등록 배치와 관심 문구.
- `lib/features/interest/presentation/interest_screens.dart`, `flow/application/flow_controller.dart`, `flow/presentation/flow_gallery_screen.dart`: 관심·채팅·팝업·알림 미리보기와 세션 상태.
- `lib/features/payment/presentation/snack_purchase_screen.dart`: 실제 결제 카드와 하단 구매/추천 복귀 액션. 검증·지급 로직은 유지.
- `test/interest_test.dart`, `flow_integration_test.dart`, `payment_screen_test.dart`, `account_api_test.dart`, `location_sync_test.dart`: 새 상태 전이와 기존 기능 회귀 검증.
- `integration_test/design_review_test.dart`, `test_driver/design_review_driver.dart`: 기기 캡처와 실제 화면 이동 검증.
- `README.md`, `DESIGN_REVIEW.md`: 사용 방법·원본 근거·검증 범위.

## 확인 방법

앱 기본 모드는 디자인 미리보기다. `/flows`에서 화면과 받은/서로 관심 시나리오를 선택한다. 관심·메시지는 세션 안에만 보관되며 실제 상대에게 전달되지 않는다. 직접 채팅방에 진입해도 상호 관심이 없으면 입력창을 제공하지 않는다. 이 문서의 2026-10-05 비교 회차는 관심·채팅의 세션 미리보기다. 2026-10-06 실제 API 탭 연결과 관심 공개 어댑터의 추가·검증은 [SOCIAL.md](SOCIAL.md)를 정본으로 사용한다.

```sh
fvm dart format --output=none --set-exit-if-changed lib test integration_test test_driver
fvm dart analyze --fatal-infos lib test integration_test test_driver
fvm flutter test --no-pub
JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home fvm flutter drive --driver=test_driver/design_review_driver.dart --target=integration_test/design_review_test.dart -d emulator-5554 --dart-define=REVIEW_CYCLE=after --no-pub
JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home fvm flutter drive --driver=test_driver/payment_smoke_driver.dart --target=integration_test/payment_disabled_test.dart -d emulator-5554 --no-pub
fvm flutter build web --release --no-pub
```

Flutter 3.47.6 / Dart 3.13.5, Android SDK36 및 JDK17을 사용했다. Flutter analyze의 한글 경로 LSP 문제는 [결제 문서](PAYMENT.md)의 기존 방식대로 동일 소스의 임시 ASCII symlink를 대상으로 분석했다. SDK나 버전 핀은 변경하지 않았다.

## 검증 결과

- Flutter 테스트 73개 통과: 기존 가입·위치·결제 계약과 중복/검증 실패/인증 오류 회귀, 관심 중복·상호 관심 전 채팅 차단·팝업 취소 및 재진입·선택 친구의 메시지 저장, 독립 알림 설정, 320px/큰 글자 화면을 포함한다.
- Dart 분석 및 Flutter 분석: 오류·경고·info 없음.
- 웹 release 빌드 통과. Android debug APK 빌드·설치 통과.
- Android 에뮬레이터: 26개 화면·패키지 선택·팝업 캡처 및 화면 이동 검증. 사진·SVG를 미리 로드해 캡처 타이밍에 누락되지 않게 했다.
- Android 결제 HTTP 계약 fixture: Retrofit/Dio로 잔액·내역·상품 비활성 응답과 재동기화 확인, 스토어 조회·복원·구매 0회. live stg 또는 실제 스토어 테스트가 아니다.

캡처는 `build/design-review/after-*.png`, 결제 fixture 캡처는 `build/payment-smoke/payment-disabled-android.png`다. 생성물은 소스에 포함하지 않는다. 현재 일반 실행 앱은 `--route=/main`으로 에뮬레이터에 열어 두었다. 현재 화면 캡처는 `build/design-review/review-live-android.png`다. 대표 화면: `after-recommendations.png`, `after-purchase-50.png`, `after-interest-mutual.png`, `after-mutual-popup.png`, `after-chat-room.png`.

이 수정 회차는 Android 화면과 웹 빌드를 검증했다. iOS 기기·실 스토어·푸시 전달·실시간 채팅은 검증하지 않았다. 비밀값·스토어 활성화·배포 설정은 변경하지 않았다. 사용자에게 필요한 외부 콘솔 작업과 안전한 설정 위치는 기존 [PAYMENT.md](PAYMENT.md)를 정본으로 유지한다.
