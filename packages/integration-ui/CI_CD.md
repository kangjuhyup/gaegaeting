# Android 개발 앱 CI/CD

사용자 승인 범위: GitHub 기본 러너, Doppler 비밀 저장, Firebase App Distribution 업로드. 운영 서비스/스토어 활성화 및 iOS 배포는 포함하지 않는다.

## 실행 흐름

`.github/workflows/flutter-client.yml`은 `ubuntu-24.04`를 사용한다. 앱/워크플로 변경 PR에서 Node 정책 테스트, 잠금 파일 검증, 코드 생성 불변성, Dart format/analyze, Flutter 전체 테스트, web release 및 Android debug build를 수행한다. PR에서는 서명 비밀과 Firebase 인증을 사용하지 않는다.

`dev/core` 또는 `main`에 앱 변경이 병합되면 위 검증 성공 후 내부 release APK 서명 → artifact 검증 → Firebase 업로드 → 업로드 버전 조회를 수행한다. `main`에서도 **개발 API**만 연결하며 운영 앱을 배포하지 않는다. `main` 반영은 저장소의 별도 release/core → main squash 절차를 따른다. workflow_dispatch는 워크플로가 기본 브랜치에도 반영된 이후 사용할 수 있다.

Flutter 3.47.6/Dart 3.13.5와 SDK revision `5fc346839b5d0eef006ed8404392afb4dfae428d`, Node `.nvmrc`, JDK17, Android SDK36/build-tools36.0.0/NDK28.2.13676358을 검증한다. Flutter 공식 SDK 저장소의 정확한 revision으로 설치하며 핀을 임의 변경하지 않는다. Firebase CLI는 15.33.0, Actions는 검증된 commit SHA로 고정한다.

versionName은 0.1.0, versionCode는 `1000 + github.run_number`다. 재시도는 같은 versionCode를 사용하며 이전 수동 빌드 +4보다 크다. APK manifest에 sourceCommit/SHA256/서명 인증서/스토어 비활성을 기록하고 업로드 전에 다시 확인한다. 동일 내부 서명으로 기존 앱을 업데이트할 수 있다. 이 서명은 Play 출시용 키가 아니다.

## 설정 위치

- Firebase 프로젝트: `gaegaeting-dev`, Android App ID: `1:476922479672:android:d37c950269629567fad2cd`.
- GitHub environment: `mobile-dev`, 배포 허용 브랜치: `dev/core`, `main`.
- GitHub 기존 secret: `DOPPLER_TOKEN`. CI는 이 토큰으로 Doppler `gaegaeting/stg` 아래 네 항목만 읽는다. 서버 비밀 전체를 Flutter 프로세스에 주입하지 않는다.
- Doppler `gaegaeting/stg`: `MOBILE_DEV_ANDROID_KEYSTORE_BASE64`, `MOBILE_DEV_ANDROID_STORE_PASSWORD`, `MOBILE_DEV_ANDROID_KEY_ALIAS`, `MOBILE_DEV_ANDROID_KEY_PASSWORD`. 값은 저장소/공개 설정/로그에 기록하지 않는다. runner 임시 keystore는 빌드 후 삭제한다.
- GitHub 공개 vars: `FIREBASE_WORKLOAD_IDENTITY_PROVIDER`, `FIREBASE_DISTRIBUTION_SERVICE_ACCOUNT`. 개인 OAuth 토큰/서비스 계정 키는 GitHub에 저장하지 않는다.
- WIF provider: `projects/476922479672/locations/global/workloadIdentityPools/gaegaeting-github/providers/mobile-app`.
- Firebase service account: `mobile-distribution@gaegaeting-dev.iam.gserviceaccount.com`, App Distribution Admin. 저장소/소유자 numeric ID, 허용 브랜치, push/workflow_dispatch 및 정확한 Flutter workflow_ref 조건으로 제한한다. user-managed key는 0개다.
- 선택 공개 var `FIREBASE_TESTER_GROUPS`: 사용자가 확정한 Firebase 테스터 그룹 alias만 쉼표로 지정한다. 현재 비어 있으므로 APK만 업로드하고 초대하지 않는다.
- 앱 공개 연결 설정: `.dart-define.stg.example.json`. `gaegaeting-mobile`, tenant `gaegaeting-dev`, 실제 개발 Gateway를 사용하며 `STORE_PURCHASES_ENABLED=false`를 검사한다.

장기 비밀키 없이 GitHub OIDC→Google WIF를 사용하는 구성은 [공식 auth Action 안내](https://github.com/google-github-actions/auth#workload-identity-federation-through-a-service-account)를 따른다. 앱에 Firebase SDK를 추가하지 않고 App Distribution을 사용할 수 있으며 [공식 CLI 안내](https://firebase.google.com/docs/app-distribution/android/distribute-cli)에 따라 테스터/그룹은 명시적으로 지정한다.

## 결과 확인 및 재시도

Actions의 verify/internal-distribution 두 job을 확인한다. 공개 GitHub 저장소에 APK artifact를 남기지 않는다. 서명·Firebase 인증·업로드는 같은 보호 브랜치 runner에서 순서대로 수행하며, `firebase-release-{sha}-{run}` artifact에는 민감한 다운로드 URL을 제거한 릴리스 메타데이터만 보관한다(30일). job summary에서 Firebase 콘솔 링크, 소스 커밋, SHA256을 확인한다. signed binaryDownloadUri 및 원시 Firebase CLI 출력은 로그/artifact에 남기지 않는다.

실패하면 같은 Actions run의 실패 job을 재시도한다. 새 비밀키/서명을 발급하지 않는다. Doppler 접근 오류는 기존 `DOPPLER_TOKEN`의 해당 config 접근 권한만 확인한다. 앱 업데이트 서명이 다르면 자동 제거/사용자 데이터 삭제를 하지 않는다.

2026-10-09 로컬 검증: 정책/배포 Node tests 26개 통과, actionlint 1.7.12 통과(shellcheck 미설치로 제외), pinned Dart analyze no issues, Dart format 94 files/0 changed. 전체 앱 테스트/빌드는 원격 verify job에서 다시 검증한다. 실제 원격 실행 결과는 PR 및 Actions run과 별도 완료 보고서에 기록한다. iOS/실기기/장시간 백그라운드 GPS/유료 구매는 이 파이프라인의 검증 범위가 아니다.
