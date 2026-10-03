회원가입 시 Account가 임시 본인인증 어댑터에 요청하고, CI는 폐기하며 DI HMAC으로 중복 확인한 뒤 Auth 계정 생성을 완료한다.

전제: 실제 공급자 계약 전에는 로컬·개발·테스트에서 동기 요청/응답으로 프로세스를 검증하며, 팝업·콜백 연동은 실제 어댑터 도입 시 다룬다.

1. `IdentityVerificationPort`에 인증 요청과 결과를 분리한 요청 메서드를 추가하고, 요청에는 이름·생년월일·성별·전화번호를, 결과에는 공급자·거래 ID·CI·DI·성인 여부·확인된 인적 정보를 두며 기존 handoff용 `verify` 계약은 유지한다.
2. `MockIdentityVerificationAdapter`가 정규화한 동일 테스트 신원에 안정적인 `mock` CI·DI와 거래 ID를 반환하도록 구현하고, 실패·미성년 결과를 테스트하며 `infrastructure.module.ts`의 포트 바인딩과 `REGISTRATION_MOCK_ENABLED`의 운영 차단을 유지한다.
3. `registration.input.ts`의 `RegisterAccountInput`을 기존 mock 결과 DTO 상속에서 분리해 클라이언트의 CI·DI·거래 ID·성인 여부 입력을 제거하고, `AccountSignupService`에서 입력·약관 검증 → 어댑터 요청 → 결과 검증 → 가입 예약 → Auth provisioning → 가입 완료 순으로 연결해 확인된 인적 정보만 저장한다.
4. `AccountSignupRepositoryPort`와 ORM 저장 구현에는 공급자·거래 ID·인증 시각만 추가하고, 공유 엔티티 `packages/core/database/src/mikro/entity/account/account-signup.ts`와 Account 추가 마이그레이션·`migrate.ts`를 갱신해 기존 행은 nullable로 보존하며 CI와 DI 원문은 repository 경계로 전달하지 않는다.
5. [사업자별 DI 발급 특성](https://niceid.co.kr/prod_cert.nc)에 따라 동일 발급 범위와 HMAC 키를 유지하는 조건으로 어댑터가 반환한 DI의 HMAC·DB unique·Auth 멱등 키를 사용하고, 발급 설정·키 변경에는 별도 전환을 요구하며 최초 인증 정보 보존·신원 변경 거절·Auth 실패 시 `PENDING` 재개·외부 호출과 DB 트랜잭션 분리를 적용한다.
6. 기존 [CI 폐기 정책](../../../../docs/plans/2026-09-08-identity-registration.md)을 신규 가입과 handoff 경로 모두에 유지하고, CI 저장 열·암호화 키를 추가하지 않으며 Auth 및 응답·로그의 CI·DI 원문 비노출과 `packages/integration-ui/src/pages/SignupPage.tsx`의 입력 계약 변경을 함께 반영한다.

검증: 임시 어댑터·가입 서비스·저장소·마이그레이션 테스트로 CI·DI 원문 비저장, 동일 테스트 신원의 DI HMAC 일치, 인증 실패 시 미저장·Auth 미호출, 미성년 거절, 중복·동시 요청, Auth 성공 후 DB 완료 실패 재시도, 기존 행 호환과 원문 비노출을 확인하고 Account·공유 DB 테스트 및 빌드를 실행한다.
