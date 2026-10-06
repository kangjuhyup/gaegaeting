# Account 모듈

사용자 및 반려동물 계정 정보를 관리하는 모듈입니다.

## 기능

- 사용자 프로필 관리
- 반려동물 정보 관리
- 프로필 이미지 관리

## 회원가입 본인인증

`registerAccount`는 로그인 정보·약관 동의와 이름·생년월일(`YYYY-MM-DD`)·성별·전화번호를 입력받고, Account 서버가 `IdentityVerificationPort.request`로 인증을 요청합니다. CI·DI·거래 ID·성인 여부를 클라이언트가 제공할 수 없으며, 응답에는 `authSubject`만 반환합니다. 인증 실패나 미성년 결과이면 가입 예약과 Auth 계정 생성을 진행하지 않습니다.

현재 `MockIdentityVerificationAdapter`는 외부 통신 없이 요청/응답을 재현합니다. 이름의 앞뒤 공백과 Unicode NFC, 전화번호의 공백·하이픈·괄호를 정규화하며 동일한 이름·생년월일·성별·전화번호 조합에는 안정적인 테스트 DI를 발급합니다. 거래 ID는 요청마다 새로 발급합니다. 입력 조합이 바뀌면 테스트 DI도 바뀌므로 실제 동일인 검증을 제공하지 않습니다. 로컬·개발·테스트에서 `REGISTRATION_MOCK_ENABLED=true`일 때만 동작하며 `NODE_ENV=production`에서는 항상 차단합니다.

CI와 DI 원문은 저장하지 않습니다. Account에는 서버 HMAC으로 만든 DI digest와 공급자·거래 ID·인증 시각, 확인된 가입 인적 정보를 저장합니다. Auth에는 로그인 정보와 불투명한 멱등 키만 전달합니다. 같은 DI의 다른 아이디 가입은 DB unique 제약으로 차단하며 동일 가입 재시도는 최초 인증 이력과 회원 ID를 보존합니다. Auth 실패 또는 가입 완료 저장 실패 후에도 같은 DI와 멱등 키로 재개할 수 있습니다.

`REGISTRATION_DI_HMAC_SECRET`은 임시 DI 생성과 가입 중복 확인에 사용합니다. 기존 테스트 가입과 비교하려면 이 키를 유지해야 하며, 실제 공급자 도입·DI 발급 범위 변경·키 교체는 기존 가입과의 비교 및 전환 절차가 필요합니다. 이전 클라이언트가 임의로 생성한 mock DI는 새 테스트 DI로 변환하거나 기존 데이터에서 추정해 채우지 않습니다. 기존 `completeMockIdentityVerification` handoff API의 입력과 CI 폐기 계약은 유지합니다.

배포 전 `AccountSignupVerification1791028800000` 마이그레이션을 적용합니다. 기존 행의 신규 인증 이력은 nullable로 보존하며 CI 저장 열과 암호화 키는 추가하지 않습니다. 공유 DB 엔티티 변경도 함께 빌드해야 합니다.

```bash
pnpm --filter account... build
pnpm --filter account migration:run
pnpm --filter account test --runInBand
```

PostgreSQL 통합 테스트는 `ACCOUNT_TEST_DATABASE_URL`이 있을 때 실행합니다. 연결 대상에는 임시 스키마를 생성·삭제할 수 있는 전용 테스트 DB를 사용하며, 테스트는 자체 생성한 스키마만 삭제합니다.

```bash
ACCOUNT_TEST_DATABASE_URL=postgresql://postgres:account-test-only@127.0.0.1:5432/account_verification_test \
  pnpm --filter account test --runInBand account-signup-postgres.integration
```

구현 범위와 검증 항목은 [구현계획](docs/plans/2026-10-03-signup-identity-verification.md)을 참고하세요.

## 사진 등록 요청 슬랙 알림

Account 실행 환경 또는 `packages/account/.env`에 `SLACK_WEBHOOK_URL`을 설정하면 사용자·반려견 사진 업로드 완료 후 승인 대기(`PENDING`)로 저장될 때 해당 Incoming Webhook의 채널로 알림을 보냅니다. HTTPS URL을 사용하며, 설정이 없거나 빈 문자열이면 알림을 보내지 않습니다. Webhook URL은 비밀 값이므로 저장소에 커밋하지 않습니다.

알림에는 사진 유형, 요청자 ID, 대상 ID, 사진 번호(1~6)를 담습니다. 사진과 다운로드 URL은 포함하지 않으며 관리자는 `/admin`의 사진 검토 화면에서 확인합니다. 업로드 URL 발급이나 이미 승인 대기 중인 사진의 중복 완료 요청에는 알림을 보내지 않습니다.

슬랙 전송은 최대 10초까지 기다리며, 실패해도 사진 등록과 승인 대기 상태를 유지하고 서버 로그를 남깁니다. 자동 재전송은 하지 않으므로 실패한 알림은 관리자 승인 대기 목록에서 확인해야 합니다. 알림 전송과 DB 저장은 하나의 트랜잭션이 아니므로 프로세스가 중단되면 알림이 누락될 수 있습니다.

관련 공통 Slack 모듈의 의존성 주입 수정과 workspace 의존성·lockfile 변경은 이 Account 기능과 함께 core 릴리즈로 통합합니다. 실제 배포에서는 Account 이미지만 갱신합니다.
