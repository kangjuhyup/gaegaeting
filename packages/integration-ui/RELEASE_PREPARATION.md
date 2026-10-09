# 개개팅 모바일 앱 배포 준비

## 2026-10-07 개발 배포와 내부 APK 후속

사용자 승인에 따라 GitHub 기본 runner→Auth 공식v0.3.2 배포, native gaegaeting-mobile 등록, Doppler Chat 전용 DB/설정→Chat 개발 rollout을 수행했다. APK0.1.0+4 빌드·서명·Android 실제 로그인/서버 프로필 표시/세션 복원을 확인했다. [최신 배포 상태](DEV_DEPLOYMENT.md), [APK 설치 안내](INTERNAL_DISTRIBUTION.md), [검증 보고서](/Users/kangjuhyup/.codex/artifacts/gaegaeting-flutter/native-chat-dev-20261007/deployment-report.md)를 따른다.

공개 API 시험에서 발견한 Account enum/Chat sync는 교정·실제 재검증을 완료했다. WS 인증도 Gateway core1.0.15/PR34 배포·QA2 보호 구독·Android 상대 메시지 실시간 수신과 자동 읽음까지 재검증을 완료했다. 실제 전체기능 E2E, iOS/TestFlight, 실기기·background GPS·사진, Play/App Store 상품/계약/활성화는 완료로 간주하지 않는다. 양 스토어 flag false 유지. 내부 전달 목적지와 테스터 그룹은 아직 미정이다.


추가 실제 시험: 같은 좌표로 복구하던 지도 camera fit의 무한 확대를 상한으로 교정하고 2개 UI 회귀를 추가했다. 새 APK에서 복구→구간1 GPS 추가→종료(FINISHED31점)→나만 보기 일기 저장을 확인했다. QA2명 간 관심/수락/방 생성/메시지 동일ID 재시도/읽음과 별도 인증 없는 사진 PUT/검증/조회/새 미사용 사진 정리를 실제 공개 개발 API로 확인했다. 장시간 background·실기기·iOS 및 사진 선택기의 앱 변환 E2E는 별도 미검증이다.

## 이전 배포 준비 기록

후속 사용자 승인(2026-10-06)으로 **개발 API 실제 배포와 동료용 내부 앱 공유**를 진행한다. 아래 미배포 검증은 이전 준비 단계의 기록이다. 현재 후보와 배포 진행 상태는 [INTERNAL_DISTRIBUTION.md](INTERNAL_DISTRIBUTION.md)를 따른다.

2026-10-06. 이번 작업은 **리뷰 가능한 배포 준비**다. 앱 업로드·서버 배포·스토어 활성화·새 키 발급·원격 브랜치 변경은 하지 않는다. 첫 후보는 Apple/Google 구매를 모두 비활성으로 유지한다. 이 문서의 미완료 항목이 해결되기 전에는 출시 준비 완료로 판단하지 않는다.

## 담당과 근거

Flutter 담당이 기존 챌린지·어카운트·결제 담당 터미널을 재사용하여 협의한다. 각 담당은 자기 도메인의 변경·검증·인계 파일을 소유하며 Flutter 파일은 Flutter 담당만 수정한다. 기존 미커밋 작업을 일괄 복사하거나 브랜치 전체를 병합하지 않는다.

| 담당 | 준비 범위 | 앱 구현 근거 |
| --- | --- | --- |
| 챌린지 | 최신 35개 계약·migration/federation·사용자 smoke·GPS/사진/공개 moderation·보관/삭제 영향 | [CHALLENGE.md](CHALLENGE.md) |
| 어카운트 | public native PKCE·가입·프로필/사진·계정 삭제/차단 지원 확인·Auth 소유자 인계 | [SOCIAL.md](SOCIAL.md), [README.md](README.md) |
| 결제 | 양 스토어 비활성 확인·안전한 설정/preflight·지갑/복구·향후 Sandbox·거래 보관 | [PAYMENT.md](PAYMENT.md) |
| Flutter | 연결값 점검·서명 주입 경로·스토어 AAB 차단·현재 도구/앱 검증·통합 인계 | 이 문서와 [release_preflight.mjs](tool/release_preflight.mjs) |

## 담당별 준비 결과

아래 원본 링크는 현재 Orca의 담당 checkout 기준이다. 실제 통합에서는 각 문서·검증 파일·필요한 수정만 소유자가 리뷰한 커밋으로 가져온다. 기존 가입/디자인/다른 도메인의 미커밋 변경을 통째로 가져오지 않는다.

| 담당 보고서 | 실제 마련한 산출물 | 이번 검증과 남은 한계 |
| --- | --- | --- |
| [챌린지 인계](../../../챌린지논의/docs/challenge-mobile-release-readiness.md) | 사용자 Bearer 기반 기본 read-only smoke, 별도 동의한 stg 합성 QA/소유자 검증 cleanup, 보안 파일/환경 예시, GPS·사진·moderation/삭제/차단 운영 인계 | smoke 14/14, 도메인 54/54, build/format 통과. 현재 Challenge/Gateway core1.0.11 Ready·migration 성공·Argo Healthy 읽기 확인. 사용자 세션 없어 live 사용자 smoke·실기기 미실행 |
| [어카운트 인계](../../../어카운트/docs/account-mobile-release-readiness.md) | native dev 등록 payload 초안·GET-only 안전한 Auth probe, `updateProfile` 본인만 수정, `certifyPet` principal/소유자 결속, 미구현 `deletePet` 명시적 실패, 공개 개인정보·삭제/차단 계약 제안 | 최종 Account 223/223, GraphQL 경계 6개 포함, probe 5/5, 의존 build 통과. PG 11개 skipped. 새 보호 수정은 미배포, native login/실제 본인인증/사진·삭제·차단 live E2E 미완료 |
| [결제 인계](../../../결제/docs/payment-mobile-release-readiness.md) | 양 스토어 false 예시·secret 비노출 offline preflight, Apple 환불 history Sandbox30일/Production180일로 adapter/worker 수정, 준비ID 유실·보관·별도 Sandbox 순서 인계 | 결제 65/65, preflight 6/6, edge 1/1, build/tsc/format 통과. PG/HTTP 44개 skipped. stg/runtime false 및16개 환경검사·합성 내부 읽기 확인. 새 수정 미배포, 실제 native 사용자·스토어 구매 미검증 |

현재 10/06의 Auth 근거는 **discovery200/정확한 issuer/S256, dev tenant의 두 mobile 후보 authorize400 `invalid_client`**다. 이전403을 현재 상태로 단정하지 않는다. Auth 소유자와 어카운트 담당의 read-only 협의 결과, 0.3.1에 PKCE/resource/refresh는 있지만 custom native URI 등록 검증의 로컬 수정은 정식 검토/릴리즈가 필요하다. dev 등록 payload는 준비 초안이며 적용된 client가 아니다. 앱 사용자 token은 opaque 가능하며 내부 assertion으로 사용자 E2E를 대체하지 않는다.

후속 사용자 지시로 client ID는 모든 개발 환경에서 `gaegaeting-mobile`로 통일했다. 로컬 기존 client에 결제·챌린지 scope를 보완했고 정상 APK의 실제 로그인 form/취소 복귀를 확인했다. 공유 dev의 같은 ID 신규 등록은 callback/logout validator HTTP400으로 차단된다. 실제 device 19개 읽기는 미인증401, 배포 SDL의 앱 문서75개는61개 일치/관심7개 누락/Chat7개 미구성이다. 전체 사용자 E2E 완료와 구분하며 최신 근거는 [DEV_API_VERIFICATION.md](DEV_API_VERIFICATION.md)를 따른다.

삭제/차단은 아직 미구현 계약이다. Challenge 내부 사용자 데이터 삭제 경로는 있으나 Account의 호출·완료 ACK 추적과 연동되지 않았고, 다른 사용자의 코스 snapshot이 남을 수 있다. 공개 일기/사진별 신고·관리 조치 및 block 관계 필터도 별도로 필요하다. Payment 거래 증거를 일괄 삭제하거나 proof 암호화 키를 없애는 것을 탈퇴 처리로 사용하지 않는다.

## 배포를 막는 항목과 해제 증거

| 순서 | 항목 | 책임 | 해제 기준 |
| --- | --- | --- | --- |
| 1 | native client 실제 등록·모바일 callback 및 가입 복귀 | 어카운트/Auth | Android/iOS 실제 PKCE 로그인·refresh·logout·가입 복귀, 불투명 사용자 bearer로 모든 도메인 scope 확인 |
| 1a | 실제 가입 본인인증과 카카오 가입 client binding | 어카운트/Auth/본인인증 운영자 | 현 mock을 켜지 않고 production 공급자 검증 성공, web/mobile ticket의 검증된 client binding 공존, 실제 가입 E2E |
| 2 | 앱이 호출하는 Match 관심 GraphQL 및 최신 Chat/Account/Challenge 계약 통합 | 도메인/Gateway | 도메인별 정확한 커밋/산출물·migration·federation composition 고정 후 실제 공개 Gateway 2계정 E2E |
| 3 | 사진 저장소 origin·signed PUT·moderation 운영 | 어카운트/챌린지/인프라 | `IMAGE_STORAGE_ORIGIN` 검증된 HTTPS origin, no-auth PUT·reserve/complete/삭제·URL갱신 실제 서버 증거 |
| 4 | 계정 삭제·사용자 차단·신고 처리·보관 정책 | 어카운트/Match/Chat/챌린지/결제/제품 | 기존 서버 지원 여부 확인, 삭제와 거래 법적 보관 구분, 앱/웹 삭제 동선과 모든 재노출 차단 검증. 현재 앱에는 계정 삭제·사용자 차단이 없다 |
| 4a | Account 프로필·반려견 인증의 소유자 경계와 공개 개인정보 | 어카운트/제품 | 로컬 소유자 수정의 서버 반영·회귀 확인, 공개 조회의 전체 생년월일/전화번호/실명 범위 제한 계약 확정. 현재 공개 profile 계약은 별도 수정 필요 |
| 5 | production 연결값 및 지도 사용 조건 | 도메인/인프라/제품 | 운영 issuer/client/audience/Gateway/storage 확인, 지도 attribution·식별자·캐시/이용조건 검증. stg 예시를 운영값으로 쓰지 않는다 |
| 6 | 배포 서명·최신 Apple 제출 도구 | 릴리즈 소유자 | Android upload key/Play App Signing, Apple team/certificate/provisioning, Xcode26+/iOS26 SDK에서 재빌드·실기기 검증 |
| 7 | 스토어 심사·정책·사용자 검증 | 제품/QA/릴리즈 소유자 | 개인정보/약관/지원/삭제요청 URL, Data Safety/App Privacy, 연령등급, 최종 아이콘/캡처, 심사 계정, 내부테스트/TestFlight 증거 |

로그인과 계약이 준비되어야 live E2E를 수행할 수 있다. 계정 삭제·차단은 현재 계약 확인/설계 단계와 구현 완료를 분리한다. `deletePet`, 로그아웃, pair 취소는 계정 삭제나 전역 사용자 차단의 대체가 아니다. 보관기간과 파기 정책은 법적/제품 판단 없이 임의 고정하지 않는다.

Apple은 계정 생성 앱의 앱 내 삭제, UGC의 신고/차단 등 운영 체계를 요구한다. 카카오를 주 계정 인증으로 제공하는 경우 Apple 4.8의 동등한 개인정보 조건의 로그인 선택 또는 적용 예외도 확인해야 한다. Google은 적용 대상 앱의 앱 내 삭제 경로와 웹 삭제 요청 리소스를 요구한다. [Apple 심사 기준](https://developer.apple.com/app-store/review/guidelines/), [Google 계정 삭제](https://support.google.com/googleplay/android-developer/answer/13327111).

## 공개 연결값과 안전한 위치

`.dart-define.prod.example.json`은 의도적으로 미확보 주소/client를 빈칸으로 둔다. 복사한 `.dart-define.prod.json`은 gitignore 대상이고 **공개 설정만** 넣는다. 실제 native client 등록은 JSON 작성만으로 완료되지 않는다.

| 위치 | 값/용도 |
| --- | --- |
| 앱의 gitignored `.dart-define.stg.json` / `.dart-define.prod.json` | public API/issuer/client/audience/redirect/map attribution/storage origin |
| 기존 Doppler `gaegaeting/stg`, 승인된 운영 config | 서버 DB·내부 auth·사진 저장소·결제 credential 이름/경로. 운영 config 이름은 인프라 소유자가 확정 |
| 릴리즈 runner의 기존 secret store | Android 업로드 keystore secure file 및 `GAEGAETING_UPLOAD_STORE_FILE`, `GAEGAETING_UPLOAD_STORE_PASSWORD`, `GAEGAETING_UPLOAD_KEY_ALIAS`, `GAEGAETING_UPLOAD_KEY_PASSWORD` |
| `GAEGAETING_REQUIRE_UPLOAD_SIGNING=true` | store 빌드는 debug 서명으로 우회하지 않도록 강제 |
| Apple/Xcode 서명 설정 또는 `GAEGAETING_IOS_TEAM_ID` | 공개 team ID. 인증서/private key/provisioning은 승인된 Keychain/runner secure file에만 보관 |

앱 package/bundle은 현재 `app.gaegaeting`, version은 `0.1.0+1`이다. 스토어 등록 전 소유권/동일 ID를 확인하고 build number 증가 규칙을 확정한다. keystore, Apple private key, 서버 secret, bearer, 영수증, 관리 token은 소스·dart-define·보고서에 넣지 않는다. 쉘 xtrace/환경 전체 출력/Gradle debug 로그로 secret을 노출하지 않는다. 배포 준비 점검에서는 실제 credential을 읽거나 생성하지 않았다. 후속 native 등록 작업은 기존 관리자 자격증명을 메모리에서만 재사용했으며 위치·결과는 [DEV_API_VERIFICATION.md](DEV_API_VERIFICATION.md)에 기록했다. 신규 credential은 발급하지 않았다.

## 실행 가능한 앱 사전 점검

저장소 `.nvmrc` Node24.13.1, 앱 `.fvmrc` Flutter3.47.6/Dart3.13.5, pnpm10.34.5 및 JDK17을 따른다. 아래 명령은 앱 디렉터리 기준이다. preflight는 네트워크·스토어·키 생성·배포를 수행하지 않고 로컬 config와 준비 환경만 읽는다. 출력은 값과 경로를 숨기고 고정된 진단만 낸다.

```sh
cp .dart-define.prod.example.json .dart-define.prod.json
# 공개 연결값은 확정된 운영 계약으로 채운다. 비밀은 별도 runner가 주입한다.
node tool/release_preflight.mjs --config=.dart-define.prod.json --environment=prod --platform=android
node tool/release_preflight.mjs --config=.dart-define.prod.json --environment=prod --platform=ios
node --test test/release_preflight.test.mjs
```

누락/미승인 config는 exit2, 로컬 점검 충족은 exit0이다. 항상 `releaseApproved:false`이며 endpoint 도달·native 등록·certificate 유효성·도메인 배포·삭제/차단·스토어 승인을 증명하지 않는다. `MAP_TILE_URL`은 현재 HTTPS XYZ형식을 검증하며 credential/query를 허용하지 않는다. 다른 제공자 형식이 필요하면 공개 client token의 범위/제한과 provider 정책을 먼저 확인하여 검증기를 조정한다.

Android Gradle은 네 업로드 환경 값이 전부 있을 때만 upload 서명 경로를 사용한다. 일부만 주입하면 실패하며 release bundle은 upload signing 없이는 실패한다. **로컬 release APK 리뷰**는 credential이 없을 때 기존 debug 서명을 유지한다. 따라서 이전 release APK 빌드 성공은 store 서명 증거가 아니다. 실제 keystore가 없으므로 upload 서명 성공과 certificate 검증은 미실행이다.

릴리즈 소유자가 승인된 runner/기존 credential과 모든 도메인 gate를 마련한 뒤 사용할 명령:

```sh
fvm flutter pub get --enforce-lockfile
fvm dart run build_runner build
fvm dart analyze --fatal-infos lib test integration_test test_driver
fvm flutter test --no-pub
GAEGAETING_REQUIRE_UPLOAD_SIGNING=true fvm flutter build appbundle --release --dart-define-from-file=.dart-define.prod.json --target=lib/main.dart
```

iOS는 Xcode에서 Runner의 승인된 Team/배포 provisioning을 설정한 뒤 release runner에서 `fvm flutter build ipa --release --dart-define-from-file=.dart-define.prod.json --target=lib/main.dart`를 사용한다. 환경 `GAEGAETING_IOS_TEAM_ID`는 preflight 입력이며 Flutter에 서명을 자동 구성하지 않는다. CLI로 Team을 쓰려면 별도 승인된 archive/export 단계의 `xcodebuild ... DEVELOPMENT_TEAM="$GAEGAETING_IOS_TEAM_ID"`로 전달한다. 실제 Xcode26/iOS26 SDK compatibility와 archive/export는 아직 검증하지 않았다. [Apple 제출 요구](https://developer.apple.com/news/upcoming-requirements/), [Flutter Android 서명](https://docs.flutter.dev/deployment/android), [Flutter iOS 출시](https://docs.flutter.dev/deployment/ios).

review/smoke 진입점 `integration_test/*_review_app.dart`를 제출하지 않는다. Flutter CI에 Node 핀과 preflight 정책 테스트를 추가했으며 signing/store upload는 CI에 추가하지 않았다.

## 실제 서버 검증 시나리오

정확한 도메인별 계약/사용자 smoke를 사용하며 현재 fixture 성공을 live로 표시하지 않는다. 개인 bearer는 안전한 테스트 환경에서만 사용하고 원문/메시지/GPS/사진 metadata를 로그나 결과 파일에 저장하지 않는다.

1. 두 합성 QA 계정으로 native 로그인→가입/프로필/소유견 준비→scope 갱신. 종료/앱 복귀·만료·권한 거절·로그아웃/다른 계정 전환을 확인한다.
2. 관심 보내기/받기/수락→pair→두 계정 chat 송수신·읽음·WS reconnect·응답 유실 UUID 재시도·취소 후 history/read-only. Match 관심 adapter와 Gateway 배포는 아직 필요하다.
3. catalogue→참여→서버 진도/상태→GPS 시작/중지/재개→offline 순차queue→재시작→같은 finish시각 재시도→서버완료. 타계정 point upload 금지. 인위적 GPS QA와 실기기 장시간 배터리/foreground 검증은 구분한다.
4. 코스 연속 구간trim/제출/moderation/수정/철회·bookmark/review/report·목록 pagination. 일기 PRIVATE 기본, 공개코스 완주후만 PUBLIC, 사진reserve→no-authPUT→complete·손실응답/재시작/취소/삭제효과.
5. 결제 flag와 두 서버 store 모두 false. 상품/지갑/내역 조회·재동기화, SDK 구매·상품 조회·미완료 거래 조회 호출 없음. 스토어 구매 Sandbox는 별도 승인과 설정 이후에만 수행한다.
6. 계정 삭제/사용자 차단 구현 후 Auth 세션·추천/관심/채팅·코스/일기/사진 재노출·결제 법적기록 보존을 각 소유자와 확인한다. 해당 기능은 현재 테스트완료라고 주장하지 않는다.

## 지도·심사 준비

현재 예시는 OpenStreetMap standard tile을 쓴다. 실제 앱은 `app.gaegaeting` User-Agent와 attribution을 갖지만 서비스 무중단/SLA를 확보했다고 가정하지 않는다. 출시 트래픽에 맞는 제공자·캐시·사용 조건을 확인하고 offline prefetch 기능을 만들지 않는다. [OSM 타일 이용 정책](https://operations.osmfoundation.org/policies/tiles/).

사용자가 준비할 외부 항목은 개발자 계정/법적 주체·앱 ID 소유권·승인된 서명 저장위치·Xcode26 release runner·운영 연결값·합성 테스트 계정·게시된 개인정보/약관/지원/삭제 URL·데이터 보관/신고 운영 담당·스토어 메타데이터다. 비밀 값은 채팅으로 전달하지 않는다. 적용되는 신규 Google 개인 계정은 12명/14일 closed testing을 거쳐 production access를 신청해야 한다. [Google 계정별 테스트 조건](https://support.google.com/googleplay/android-developer/answer/14151465).

## 통합·출시 순서와 롤백

도메인별 검증 변경만 소유자의 `dev/<domain>` 흐름으로 통합한다. `release/<domain>/<version>`에서 고정한 후보를 검증하고 `main`은 squash한다. 앱/current worktree를 자동으로 core/match/account release에 합치지 않는다. 최신 브랜치 규칙의 허용 domain에는 독립 `challenge`/`flutter`가 없으며, 챌린지 담당과 기존 core1.0.11 전례를 따라 **챌린지/Flutter는 core 경로로 인계**하기로 협의했다. Account/Match/Payment/Gateway는 각 도메인 경로를 유지하고 core 변경의 소비 서비스 검증을 포함한다. 앱 AAB/IPA 제출은 main의 고정 커밋과 별도 artifact로 식별하며 server image 배포와 구분한다. 이번 작업은 브랜치를 생성·이동하지 않는다.

호환 API/migration→domain release→Gateway composition→stg 사용자 E2E→production 연결/서명 gate→내부테스트/TestFlight→심사 순서다. 각 배포 시 이전 image digest/config/composition과 DB backup/forward-compatible migration을 기록한다. 데이터가 생성된 뒤 되돌릴 수 없는 migration을 자동 down하지 않는다. 로그인/업로드/재화 중복지급/타계정 데이터 노출이 생기면 candidate 배포를 중단하고 이전 호환 image/config로 되돌리는 운영 owner가 필요하다. 구매 flag는 계속 false다. 배포 실행은 별도 사용자 승인 범위다.

## 이번 턴 검증

| 검증 | 이번 결과 |
| --- | --- |
| Node runtime / Flutter runtime / Xcode | Node24.13.1, Flutter3.47.6/Dart3.13.5, Xcode16.2 확인 |
| `node --test test/release_preflight.test.mjs` | 10/10 통과: 비활성/실API/secret진단 미노출/native/prod구분/origin/private endpoint/signing/Xcode/map |
| stg example `--platform=all` preflight | 예상 exit2: image origin·Android upload env/강제값·Xcode/iOS SDK·Apple Team 미확보 |
| `flutter build apk --debug` | exit0. 업로드 환경 없이 일반 개발빌드 유지 |
| `flutter build appbundle --release --no-pub --dart-define-from-file=.dart-define.stg.example.json` | 예상 exit1: upload signing 없는 AAB 생성 중단, 산출물 제출 없음 |
| Dart analyze `--fatal-infos lib test integration_test test_driver` | exit0, 오류·경고·info 없음 |
| 결제 화면/상태/전송 테스트 | 30/30 통과. 비활성 화면을 잔액/내역 중심 문구로 변경 |
| Android `payment_disabled_test.dart` drive | exit0, 실제 Retrofit/Dio 합성 HTTP 조회·동기화 6회, SDK 조회/복원/구매 0회, 화면 캡처 확인 |
| Node branch-policy tests | 30/30 통과. 원격 Ruleset 적용 여부는 이번에 조회하지 않음 |
| Prettier·`git diff --check`·로컬 문서 링크 | 통과 |

기존 Flutter168테스트·Android/web/iOS simulator 빌드·에뮬레이터 fixture 증거는 [SOCIAL.md](SOCIAL.md)에 있는 **이전 검증**이다. 이번 턴의 앱 변경은 서명 설정/검증 도구/비활성 결제 문구이며 위 범위를 재검증했다. 실기기/live 로그인/스토어 Sandbox/production E2E는 여전히 미검증이다. 세 도메인의 로컬 준비·수정/검증은 담당별 준비 결과에 통합했다.

앱 변경 파일은 `.github/workflows/flutter-client.yml`, `.dart-define.prod.example.json`, `android/app/build.gradle.kts`, `lib/features/payment/presentation/snack_purchase_screen.dart`, `tool/release_preflight.mjs`, `test/release_preflight.test.mjs`, `README.md`, 이 문서다. 원문을 제외한 로그·로컬 점검 JSON·합성 에뮬레이터 캡처는 `/Users/kangjuhyup/.codex/artifacts/gaegaeting-flutter/release-preparation-20261006/`에 보관한다. 도메인별 변경 파일·명령은 각 담당 보고서가 정본이다. 통합 전 source/변경 목록을 리뷰하고 필요한 backend 수정의 배포 승인·실행은 별도 절차로 넘긴다.
