# 동료용 개발 앱 배포

## 2026-10-09 현재 상태

사용자가 개발자 연락처 `fog0510@gmail.com`을 확인했고 APK 업로드 후 CI/CD 구성을 요청했다. Firebase `gaegaeting-dev`의 Android `app.gaegaeting`에 **0.1.0(4)** APK 업로드를 완료했다(2026-10-09 02:26 UTC). CLI 성공과 Firebase 콘솔의 실제 버전/릴리스 노트를 각각 확인했다. 초대 대상은 지정되지 않아 테스터 초대를 보내지 않았다.

[App Distribution 콘솔](https://console.firebase.google.com/u/0/project/gaegaeting-dev/appdistribution/app/android:app.gaegaeting/releases)에서 업로드된 빌드를 확인할 수 있다. 업로드한 APK SHA256은 `209993f8304a44b82d03797cbe511820433d8f4896c7bc21c54c1e01f7e5882a`이다. 개발 API/native client `gaegaeting-mobile`을 사용하며 스토어 구매는 비활성이다.

자동화와 안전한 설정 위치는 [CI_CD.md](CI_CD.md)를 따른다. Firebase 장기 비밀키 대신 해당 저장소/보호 브랜치/Flutter 워크플로만 허용하는 Workload Identity Federation을 구성했다. 기존 내부 서명은 Doppler `gaegaeting/stg`의 `MOBILE_DEV_ANDROID_*` 네 항목으로 보관했다. 키를 새로 발급하거나 회전하지 않았다. 운영·Play·iOS 배포는 수행하지 않는다.

아래 기록의 “업로드 미실행” 내용은 해당 날짜의 상태이며 현재 업로드 결과는 위와 같다.

## 2026-10-07 Firebase App Distribution 설정

공유 경로는 사용자 요청으로 Firebase App Distribution을 선택했다. 신규 개발 전용 프로젝트 `gaegaeting-dev` (`Gaegaeting Dev`), Spark 요금제 및 Android 앱 `app.gaegaeting` 등록을 완료했다. Firebase App ID는 `1:476922479672:android:d37c950269629567fad2cd`이다. [App Distribution 콘솔](https://console.firebase.google.com/u/0/project/gaegaeting-dev/appdistribution/app/android:app.gaegaeting/releases).

[설정 결과](/Users/kangjuhyup/.codex/artifacts/gaegaeting-flutter/firebase-distribution-20261007/setup-report.md) 및 [릴리스 노트](/Users/kangjuhyup/.codex/artifacts/gaegaeting-flutter/firebase-distribution-20261007/release-notes.txt)를 준비했다. 기존 APK0.1.0+4 checksum을 재확인했으며 앱 SDK/설정/서명·개발 API는 그대로다. 배포만을 위한 Firebase SDK 통합은 필요하지 않다. [공식 안내](https://firebase.google.com/docs/app-distribution/android/distribute-cli).

현재 단계: App Distribution 시작 시 개발자 연락처 이메일이 테스터에게 공개되므로 연락처 이메일과 동료 초대 대상을 확인 중이다. APK 업로드·테스터 초대는 아직0건이다. Analytics/Gemini opt-in 및 결제 업그레이드·신규 service account/key 발급은 하지 않았다. 아래 미정 전달 경로/업로드 미실행 내용은 각 작성 시점의 기록이다.

## 2026-10-07 최신 Android 설치 후보

최신 산출물은 개발 Gateway를 사용하는 `app.gaegaeting`, `0.1.0+4`이다. native client는 `gaegaeting-mobile`, tenant는 `gaegaeting-dev`를 사용한다. 신규 client secret은 없다.

[APK 다운로드](/Users/kangjuhyup/.codex/artifacts/gaegaeting-flutter/native-chat-dev-20261007/gaegaeting-dev-0.1.0-4.apk) · [서명·manifest 검사](/Users/kangjuhyup/.codex/artifacts/gaegaeting-flutter/native-chat-dev-20261007/apk-verification-map.json) · [SHA256SUMS](/Users/kangjuhyup/.codex/artifacts/gaegaeting-flutter/native-chat-dev-20261007/SHA256SUMS).

SHA256: `209993f8304a44b82d03797cbe511820433d8f4896c7bc21c54c1e01f7e5882a`. 크기72,307,683 bytes, versionCode4, signature verified, debuggable=false. 기존 debug keystore 서명의 내부 설치 후보다. 같은 서명은 `adb install -r gaegaeting-dev-0.1.0-4.apk`로 데이터 보존 업데이트할 수 있다. 다른 서명 충돌 시 데이터를 자동 삭제하지 않는다.

Flutter3.47.6/Dart3.13.5 고정. 전체172 tests, auth21 tests, pinned Dart analysis 통과. Android release 및 web release 빌드 통과. Flutter analyze는 언어 서버 초기화 JSON 오류로 실패했으며 같은 pinned Dart analyzer의 lib/test/integration_test/test_driver 검사로 no issues를 확인했다.

Android API35 에뮬레이터 설치·실행, 실제 개발 원격 로그인/AppAuth 동의/앱 복귀, 서버 QA profile/pet 표시와 강제 종료 후 세션 복원을 확인했다. 두 native QA Bearer의 공개 도메인 호출은 별도 서버 시험으로 기록한다. [최신 검증 보고서](/Users/kangjuhyup/.codex/artifacts/gaegaeting-flutter/native-chat-dev-20261007/deployment-report.md)의 부분 실패와 미검증 항목을 함께 확인한다. iOS·실기기·장시간 background GPS·사진 선택기·스토어 E2E 완료를 주장하지 않는다.

실제 배포용 내부 전달 목적지/테스터 그룹은 아직 정해지지 않았다. APK는 로컬에 준비했으며 Firebase/App Store/TestFlight로 업로드하지 않았다. 스토어 양쪽은 비활성이다.


추가 실제 시험: 같은 좌표로 복구하던 지도 camera fit의 무한 확대를 상한으로 교정하고 2개 UI 회귀를 추가했다. 새 APK에서 복구→구간1 GPS 추가→종료(FINISHED31점)→나만 보기 일기 저장을 확인했다. QA2명 간 관심/수락/방 생성/메시지 동일ID 재시도/읽음과 별도 인증 없는 사진 PUT/검증/조회/새 미사용 사진 정리를 실제 공개 개발 API로 확인했다. 장시간 background·실기기·iOS 및 사진 선택기의 앱 변환 E2E는 별도 미검증이다.

실제 개발 API 후속 검증에서 native 로그인·프로필 저장·관심/매칭·채팅 HTTP/WS 수신·자동 읽음·산책 복구/종료·비공개 일기 저장을 확인했다. [실시간 수신 화면](/Users/kangjuhyup/.codex/artifacts/gaegaeting-flutter/native-chat-dev-20261007/android-realtime-incoming-message.png). 75문서 계약 일치는 모든 기능의 E2E 완료와 다르며 iOS/실기기/백그라운드·공개 코스/스토어 시험은 남아 있다.

## 2026-10-06 이전 후보 기록

아래 +2 APK와 이전 인증 차단은 당시 증거이며 현재 후보는 위 +4이다.

2026-10-06. 사용자가 개발 API의 실제 배포와 내부 동료 공유를 요청했다. 이전 [배포 준비](RELEASE_PREPARATION.md)의 미배포 결과는 당시 기록이며, 이번에는 기존 Auth·Account·Payment·Challenge·Match/Chat/Gateway 담당자가 개발 환경 반영을 진행한다. 운영 앱·스토어 활성화·유료 구매·새 키 발급은 범위에 포함하지 않는다.

## Android 설치 후보

실제 앱 진입점 `lib/main.dart`, 개발 공개 설정 `.dart-define.stg.example.json`, `app.gaegaeting`의 `0.1.0+2` release APK다. issuer의 tenant는 `gaegaeting-dev`, public native client는 `gaegaeting-mobile`이다. 실제 Gateway를 사용하며 스토어 구매는 비활성이다.

산출물은 `/Users/kangjuhyup/.codex/artifacts/gaegaeting-flutter/internal-distribution-20261006/gaegaeting-dev-0.1.0-2.apk`다. 같은 디렉터리의 `apk-verification.json`, `SHA256SUMS`로 식별한다. APK SHA256은 `3937a6306d2db6d241c2db22bc918b2d002e4db68c365f95bb7b143156fe9752`, 크기는 72,307,683 bytes다.

기존 Android debug keystore로 서명한 내부 설치 후보이며 `debuggable=false`, 서명 검증 성공이다. Play 업로드 키를 발급하거나 스토어에 업로드하지 않았다. 다른 서명으로 설치된 같은 package와 업데이트가 충돌할 수 있으므로, 기존 앱 데이터 삭제를 자동으로 수행하지 않는다.

동료는 신뢰하는 내부 파일 전달 경로로 APK와 checksum을 받은 뒤 해당 파일 앱의 설치 권한을 허용해 설치할 수 있다. 개발 서버에 도달할 네트워크와 정상 테스트 계정이 필요하다. 이미 등록된 동일 서명의 앱은 다음 명령으로 데이터 보존 업데이트할 수 있다.

```sh
adb install -r gaegaeting-dev-0.1.0-2.apk
```

## 검증과 서버 선행 조건

담당별 최신 실제 배포 결과와 외부 선행조건은 [DEV_DEPLOYMENT.md](DEV_DEPLOYMENT.md)를 따른다.

| 검사 | 실제 결과 |
| --- | --- |
| Dart 분석 `--fatal-infos lib test integration_test test_driver` | exit0, no issues |
| `fvm flutter build apk --release --target=lib/main.dart --build-name=0.1.0 --build-number=2 --dart-define-from-file=.dart-define.stg.example.json` | exit0 |
| Android build-tools36 manifest / apksigner | package·버전 확인, 서명 검증 성공, debuggable=false |
| 실행 중인 Android API35 에뮬레이터 설치·실행 | 성공, 로그인 버튼 존재, 초기 오류 화면 없음 |
| 실제 로그인·도메인 API E2E | 서버 변경 반영 후 확인 예정; 빌드 성공을 API 동작 성공으로 간주하지 않음 |

최초 `--no-pub` release 빌드는 이전 integration-test plugin registry 때문에 실패했다. 공식 Flutter build의 pub 단계를 포함해 재생성한 뒤 위 최종 빌드가 성공했다. 생성 파일을 수동 수정하지 않았다.

native client 등록은 Auth custom URI validator 배포, native/web 가입 복귀는 Account/UI 반영에 의존한다. 관심 7개 공개 계약과 Chat의 실제 서비스·Gateway/WS는 해당 담당자의 배포가 필요하다. Challenge는 기존 core1.0.11이 최신이라 live 재확인한다. Payment 변경 반영 후에도 Apple/Google flag는 false를 유지한다. Chat 전용 DB 자격증명은 현재 Doppler `gaegaeting/dev`, `dev_personal`, `stg`에 없고, 승인된 기존 저장 위치를 확인 중이다. 다른 도메인의 DB 비밀번호를 재사용하지 않는다.

이전 실제 API 검증과 한계는 [DEV_API_VERIFICATION.md](DEV_API_VERIFICATION.md)를 따른다. 현재 APK의 `functionalApiE2EVerified`는 false다. 개인 토큰·영수증·구매 토큰·GPS·사진 metadata를 이 문서나 공개 설정에 기록하지 않는다.

## 공유 채널

APK 파일은 준비했으며 실제 공유 목적지·동료 목록은 아직 정해지지 않았다. Firebase CLI의 현재 읽기 전용 project 조회는 자격증명/접근권한 미확보로 실패했다. Firebase를 선택한다면 기존 승인 프로젝트의 Android App ID(`app.gaegaeting` 등록)·로그인 환경·테스터 그룹을 준비해야 한다. 배포만을 위해 앱에 Firebase SDK를 추가할 필요는 없다. [Firebase App Distribution CLI](https://firebase.google.com/docs/app-distribution/android/distribute-cli).

iOS TestFlight 업로드는 실행하지 않았다. Apple 개발자 계정, App Store Connect 앱/내부 테스터, 승인된 signing/provisioning과 적합한 Xcode runner가 필요하며 Android 실행 증거와 별도로 검증한다. [TestFlight](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/).
