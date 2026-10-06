# Account 모바일 출시 준비 인계

> 2026-10-06 후속 개발 API 배포 승인: native client ID는 `gaegaeting-mobile`로 통일하고 dev/prod는 tenant로 분리한다. 아래 09시 준비 기록은 과거 evidence다. 후속 후보는 web/native interaction allowlist와 Auth ticket 재검증, profile/certifyPet ownership 및 deletePet 명시 오류를 포함하며 실제 배포 상태는 별도 개발 배포 보고서로 확인한다.


작성·정책 확인: 2026-10-06 KST. **로컬 준비 완료와 출시 완료는 다르다. 현재 출시 판정은 보류**다. 네이티브 클라이언트, 실제 본인인증, 사진 저장소, 계정삭제·차단·UGC 운영 및 실제 사용자 E2E가 선행되어야 한다.

## 범위와 보존

- Account 담당 작업 경로: `/Users/kangjuhyup/orca/workspaces/gaegaeting/어카운트`, 브랜치 `feat/core/kakao-signup`, 기준 HEAD `9f8217187797243de47353a75b61a5cb2b730b17`.
- 기존 가입·본인인증·소셜가입·integration-ui·ui-common·logger 미커밋 변경은 보존했다. 이번 변경은 아래 두 resolver와 반려견 인증 command/handler, 신규 준비/테스트 파일에 한정한다.
- Flutter `/Users/kangjuhyup/orca/workspaces/gaegaeting/플러터앱`은 coordinator 소유이며 읽기만 했다. Auth `/Users/kangjuhyup/Documents/auth`의 native redirect validator 관련 미커밋 세 파일도 수정하지 않았다.
- 배포, push/merge/커밋, 원격 client 등록, 스토어 활성화, secret 발급·회전·비활성화, 계약 체결은 수행하지 않았다. secret 값, 원본 토큰·인증 코드·영수증·실사용자 정보는 이 문서에 없다.
- worker `term_15925b21-f897-41a7-8fc9-11c016d87640`, task `task_66ed839645e9`, dispatch `ctx_26cafab77bf5`; coordinator `term_3a7b8e10-88d3-47c3-9102-025d3a0680a4`. 기존 담당 터미널은 외부 사용자 소유이므로 **닫지 않고 유지**한다.

## 증거와 한계

| 종류 | 확인한 사실 | 출시 증거로 사용할 수 없는 부분 |
| --- | --- | --- |
| 현재 live/익명 | 2026-10-06 09:10 KST 일반 Node GET: dev discovery 200, 정확한 issuer·같은 issuer 경로의 authorization endpoint·S256 광고 확인; `gaegaeting-mobile-dev` authorization 400 `invalid_client` | 사용자 로그인, code 교환, refresh/logout, 가입, API 호출 성공은 미검증. Client가 정상 등록되었다고 판정할 수 없음 |
| 다른 담당의 live/익명 | Challenge 담당 09:05 KST ordinary curl: dev discovery 200; 같은 dev issuer에서 `gaegaeting-mobile-dev`와 `gaegaeting-mobile` 모두 400 `invalid_client` | prod tenant에서 prod client 등록 상태를 확인한 결과가 아님 |
| 과거 live 기록 | 10월 5일 Auth 0.3.1 및 카카오 개발 앱 1289760/tenant `gaegaeting-dev` provider 2 활성화 기록: `/tmp/auth-kakao-v0.3.1-final-evidence.md`, `/tmp/gaegaeting-kakao-provider-activation-result.json` | 이번 실행에서 런타임 버전·관리자 provider 설정을 다시 조회하지 않음. 카카오 활성화만으로 native client가 생기지는 않음 |
| source | 원본 Gaegaeting HEAD `48bb019d3cb4bb6a3a61b1fdbb958380e4488daa`, 작업 트리, 로컬 `origin/main` `dfd6fca` 비교; 두 resolver 문제 동일 | 원격 HEAD 최신 여부와 실제 pod 동작을 단정하지 않음 |
| 배포 manifest/source | K3s `gitops/apps/base/gaegaeting/account.yaml`의 Account 이미지 source SHA `5d6d7c0c218033d3bd70f074d4116d110af4c6e4`, 해당 commit의 두 resolver에도 문제 존재 | manifest에 지정된 source 증거이며 현재 실행 중인 image/pod의 검증은 아님 |
| 현재 live/익명 metadata | 09:15 KST 재조회: discovery200, 정확한 issuer, S256 및 위 12개 요청 scope 모두 광고 확인 | scope 광고는 native client 허용/실제 토큰 발급 증거가 아님 |
| local API/mock | 이번 GraphQL 경계 테스트 6개, Account 전체 223개 통과, build 통과 | 인증 principal·User command bus·pet repository/registry는 fixture; pet certify handler는 실제 로컬 코드. 실제 Auth/Gateway/DB/storage E2E 아님 |
| Flutter 담당 전달 | Flutter 168 tests 및 Android/web/iOS simulator(Xcode 16.2) 통과; 자료 `packages/integration-ui/{README,CHALLENGE,SOCIAL,PAYMENT}.md` | 실제 로그인/API E2E 및 Apple 업로드 SDK 기준 충족은 미검증. Xcode 26/iOS 26 SDK 업로드 확인은 Flutter 담당 |

이전 10월 6일 discovery 403 기록은 현재 200으로 갱신한다. 재발하면 client를 우회하거나 web client로 대체하지 말고 네트워크/WAF/issuer 가용성 문제를 별도로 확인한다.

## 이번 로컬 수정과 파일

| 파일 | 변경과 검증 목적 |
| --- | --- |
| `packages/account/src/user/infrastructure/adapter/inbound/gql/user.resolver.ts` | `updateProfile`의 요청 principal `userId`와 대상 id 일치 확인 후 command 실행; 타 계정 수정 차단. 기존 GraphQL id/input 스키마 보존 |
| `packages/account/src/pet/infrastructure/adapter/inbound/gql/pet.resolver.ts` | `certifyPet`에 server principal 전달; 미구현 `deletePet`의 무조건 `true`를 `NotImplementedException('PET_DELETION_UNAVAILABLE')`로 변경. 실제 삭제/cascade는 새로 만들지 않음 |
| `packages/account/src/pet/application/port/command/certify-pet.port.ts` | 인증 command에 server principal 필수 결속; 유일한 호출부 resolver 수정. 공개 GraphQL input 변경 없음 |
| `packages/account/src/pet/application/service/command/certify-pet.command.ts` | 조회 pet owner와 principal userId 일치 확인 후에만 registry 조회/상태 수정/저장 |
| `packages/account/test/user/account-mobile-safety-api.spec.ts` | 실제 로컬 GraphQL 요청: 본인 수정 성공/타인 command 미실행/삭제 명시적 오류, 실제 인증 handler: 본인 허용/타인 registry·저장 미실행/유효 registry proof 여전히 필수 |
| `docs/contracts/account-mobile-native-client.dev.json` | Auth 담당/operator 검토용 native client 등록 초안. **원격 적용되지 않음** |
| `scripts/account-mobile-auth-readiness.mjs` | GET-only discovery/익명 authorize probe. redirect를 따라가지 않고 상태·허용된 오류 분류만 출력, 로그인·token 요청 없음 |
| `scripts/account-mobile-auth-readiness.test.mjs` | discovery 403/issuer·endpoint·S256 오류/invalid_client/redirect 미추적/출력 민감 query 비노출 검증 |
| `docs/account-mobile-release-readiness.md` | 이 인계 문서 |

coordinator가 최초 두 수정과 후속 `certifyPet` owner binding 수정을 승인했다. Flutter 담당은 `deletePet` 오류에서 삭제 완료 메시지나 목록 삭제를 표시하지 않는지 확인해야 한다. 이 오류는 반려견 삭제 및 계정삭제의 구현을 대신하지 않는다. `certifyPet` actor 누락도 원본 Gaegaeting과 deployment-manifest image SHA의 handler source에서 동일하게 확인했다.

## Auth native client 인계

### Dev 등록 초안

issuer `https://auth.rvkang.app/t/gaegaeting-dev/oidc`, admin 등록 후보 경로 `POST /t/gaegaeting-dev/admin/clients`의 DTO 형식을 기준으로 [등록 payload](contracts/account-mobile-native-client.dev.json)를 준비했다. operator가 등록 전에 Auth 소유자의 DTO/도메인 승인과 현존 client 조회를 먼저 수행한다. 이 문서의 payload를 자동 POST하는 스크립트는 없다.

- `clientId=gaegaeting-mobile`, `type=public`, `applicationType=native`, `tokenEndpointAuthMethod=none`.
- Authorization Code + PKCE S256, grant `authorization_code refresh_token`, response `code`.
- callback `app.gaegaeting:/oauth/callback`, post logout `app.gaegaeting:/oauth/logout`: 정확한 문자열 등록과 Android/iOS 실제 앱 복귀 확인 필요.
- scope: `openid profile email offline_access account:read account:write match:read match:write payment:read payment:write challenge:read challenge:write`.
- `allowedResources=["https://test-ggt-api.rvkang.app"]`; Flutter `API_AUDIENCE`도 정확히 같은 값. trailing slash/다른 API origin을 혼합하지 않는다.
- `externalInteractionUiUrl=https://test-ggt-ui.rvkang.app/interaction`는 기존 dev UI 기반 **후보**다. external interaction origin/CSRF/cookie/return flow, 로그인 완료 후 native callback 및 mobile 사회가입 ticket binding을 실제로 검증해야 확정된다.
- client secret 필드는 없으며 앱·dart-define·브라우저 코드에 provisioning secret을 넣지 않는다. `gaegaeting-web`로 fallback하지 않는다.
- Auth 담당 제안대로 `introspectionResources=[]`를 명시했다. public native client에 introspection 권한을 주지 않는다. `skipConsent=true` 역시 first-party dev client에 대한 담당 제안이며 operator가 기존 동의 정책과 함께 검토한 뒤 적용할 초안이다; 서비스 이용약관/본인인증·UGC 동의를 생략하는 설정으로 해석하지 않는다.

Auth 배포 기준 0.3.1의 immutable main SHA는 과거 기록 `c1484a190d67d57fc155719a5b7f605215569a95`다. 현재 Auth 원본의 native reverse-domain custom URI validator 수정은 로컬 미커밋이며 배포 증거가 아니다. 기존 URL-only admin DTO가 위 custom URI 등록을 거절하는 부분을 Auth 담당이 정식 검증·리뷰해야 한다. Provider의 PKCE/redirect 검증은 표준 OIDC 엔진에 맡기고 완화하지 않는다.

**사회가입 binding 추가 결정 필요:** Account `AUTH_SIGNUP_CLIENT_ID`는 단일 값이며 기본 `gaegaeting-web`이다. native ticket은 이 client binding과 맞지 않을 수 있다. 이 값을 mobile로 단순 교체하면 기존 web 가입을 깨뜨릴 수 있다. Auth/Account가 검증된 opaque ticket의 tenant·client·provider subject에 바인딩되는 허용 client 집합 또는 별도 운영 구성을 합의해야 한다. 임의 clientId/providerSub/issuer를 가입 공개 input에 추가하지 않는다. dev DopplerSecret manifest에는 `AUTH_SIGNUP_CLIENT_ID` export가 없으므로 설정 추가 방식도 operator 인계에 포함한다.

### Dev/prod 분리

| 항목 | Dev/stg | Prod |
| --- | --- | --- |
| tenant/issuer | `gaegaeting-dev` / 위 dev issuer | 앱 문서의 `/t/gaegaeting/oidc`는 후보, Auth operator의 실제 tenant·HTTPS issuer 확인 필요 |
| public client | `gaegaeting-mobile` (사용자 후속 확정), 등록/배포는 후속 검증 | `gaegaeting-mobile` 별도 등록/조회 필요; dev tenant probe를 prod 증거로 쓰지 않음 |
| API resource/audience | `https://test-ggt-api.rvkang.app` | 앱 문서 후보 `https://api.gaegaeting.app`, 실제 운영 gateway 및 resource policy 승인 필요 |
| interaction UI | dev 후보 위 주소 | 실제 prod HTTPS UI/origin 아직 미확정; dev UI를 복사하지 않음 |
| 카카오 provider | 개발 앱 1289760 활성화 과거 기록 | 운영 앱/동의항목/redirect/domain/business 설정의 승인 및 검증 필요 |
| 설정 저장 | Gaegaeting `stg`와 Auth dev tenant | 독립 운영 config/DB/storage/key 접근 및 prod owner 승인 필요, config 이름은 미확정 |

Auth 소유자 기존 terminal `term_661164a2-d585-4bf2-ba29-4c73cbf2f65b`와 read-only 계약 협의를 완료했다. 담당 측 network·Orca IPC가 EPERM으로 차단되어 실시간 관리 조회나 orchestration 답변을 못 보냈으므로, 본 worker가 terminal의 민감정보 없는 최종 답변을 읽어 coordinator에 전달했다. 새 Auth 에이전트나 중복 작업 트리를 만들지 않았다. 담당은 0.3.1의 public native/S256/refresh/revocation/introspection/end-session 지원, 정확한 dev audience 및 위 payload를 source/과거 snapshot으로 확인했다; 이는 이번 worker의 현재 익명 probe와 구분한다. client 등록 직전 operator가 중복 client와 API introspector `gaegaeting-api.introspectionResources`를 다시 조회해야 한다. 별도 `mobileSignup` client 속성/정책은 없으므로 external UI의 mobile client 허용/가입 화면과 Account ticket binding을 함께 준비한다.

### 검증 순서와 최소 실제 E2E 선행조건

1. Auth 담당: native URI DTO/도메인 검증, public/none/native·S256·scope/resource 정책, dev/prod 분리 및 external UI/client binding 검토를 완료한다. operator 승인 후 별도 release/등록 업무로 진행한다.
2. 이 probe에서 discovery 200/exact issuer, authorization `interaction_reachable` 확인. 이것은 **로그인 화면 도달**만 증명한다. invalid_client/invalid_scope/invalid_target/unknown redirect는 미합격이다.
3. Flutter 담당이 등록 client로 실제 테스트 사용자 로그인/카카오 가입을 수행한다. state/nonce/PKCE와 redirect 검증은 AppAuth/OIDC SDK가 담당한다. 앱에 code·token·userinfo를 출력하지 않는다.
4. server가 확인한 subject→Account ID 매핑, 동의·본인인증 완료를 확인한다. Gateway introspection이 access token의 issuer/audience/tenant/scopes를 확인한다. 앱은 opaque access token을 JWT처럼 해석하지 않고 ID token 검증은 SDK에 맡긴다. 본인확인 결과/DI 원문/토큰을 증거 파일에 복사하지 않는다.
5. 사용자 공개 진입점 `/gateway/graphql`의 myProfile 조회 → 프로필 생성/수정 → 반려견 생성/수정 → 아래 사진 reserve/PUT/complete/승인 조회를 실제 API로 확인한다. `ACCOUNT_GRAPHQL_URL`의 `/account/graphql`은 서비스 내부 경로와 구분하고 Gateway를 우회하지 않는다. 서버 principal 및 account scope 거절 경로도 확인한다.
6. 개발용 테스트 사용자 두 명으로 타 계정 프로필/반려견/사진 쓰기 거절, 삭제·차단 신규 계약의 도메인 효과를 검증한다. 실제 결제는 하지 않는다.
7. refresh, session logout, 앱 재실행/토큰 정리, 취소·실패 재시도, wrong audience/tenant/scope 및 revoked session/grant 처리 검증을 완료한다. 체크 결과는 pass/fail·버전·시각만 남긴다.

## 가입·프로필·반려견 운영 준비

- `registerAccount`, 미배포 소셜가입 `registerSocialAccount`, 프로필 onboarding은 로컬 source/mock 증거다. 카카오 provider 활성화와 Account 미배포 변경의 적용 여부는 별개다.
- 현 본인인증 adapter는 mock이다. `NODE_ENV=production` 또는 `REGISTRATION_MOCK_ENABLED=false`에서 거절하고 production mock은 설정 검증에서도 허용하지 않는다. 실제 공급자 연결 없이 production 신규 가입은 준비되지 않았다. 이를 켜서 통과시키지 않는다.
- CI 및 DI 원문은 가입 저장 대상으로 사용하지 않고 DI는 서버 HMAC으로 중복 판별한다. HMAC 키 버전/중복 예약·handoff·재시도 정합성과 만료 후 정리는 실제 DB integration 검증 필요. DI HMAC은 재식별 연결 가능한 가명 정보이므로 익명 데이터로 취급하지 않는다.
- 가입 identity의 이름/생년월일/성별/전화번호, 외부 identity binding, terms version, Auth subject 및 DI 예약/중복 기록도 삭제·보존 정책 범위다. HMAC key를 임의 회전/삭제하면 중복 확인과 이전 버전 조회를 깨뜨릴 수 있다.
- `updateProfile`의 타 계정 쓰기 거절은 이번 로컬 fix이며 미배포다. 사진 owner checks와 `updatePet` owner binding은 source/test에 존재한다.
- 추가 source 위험이었던 `certifyPet` actor 누락은 이번 로컬 command/handler에서 수정했다. 본인 요청만 registry 조회·저장을 진행하고 실제 registry proof도 계속 요구한다. 원본/배포 image source의 누락은 여전히 남아 있으며 이번 fix의 정식 리뷰·배포 및 실제 registry 검증은 별도 후속이다.
- `profile(id)`는 `account:read`에서 DTO 이름/생년월일/전화번호까지 선택할 수 있는 source다. 공개 소개용 필드와 본인 전용 개인정보 필드를 구분하고 타 사용자 필드 접근 정책을 결정·검증해야 한다. 현재 live 조회/PII 수집은 수행하지 않았다.
- `deletePet`은 실제 삭제 기능 미지원이다. 이번 변경의 명시적 실패를 UX가 처리해야 하며 서버 삭제/cascade와 다른 도메인의 pet reference 정리는 별도 계약이다.

공개 개인정보 정책 **제안/미구현**: 본인용 `myProfile`에서 업무상 필요한 전체 identity 필드를 제공하고, 타인용 공개 프로필은 nickname·bio·region·승인 사진 및 필요성이 승인된 최소 소개 필드만 허용한다. 실명·전체 생년월일·전화번호·DI·Auth identity는 타인에게 제공하지 않는다. 연령 표시가 필요하면 정책상 최소 age band/성인 여부를 별도로 검토한다. 현재 `UserProfile`을 두 query가 공유하므로 단순 non-null 필드 null 반환은 GraphQL 오류/호환성 문제를 낼 수 있다; public DTO/query 버전과 기존 필드 권한/클라이언트 이행을 합의한 뒤 적용해야 한다. 이 출시 차단을 이번에 임의 schema 수정으로 해결하지 않았다.

## 사진 업로드 계약과 운영

Source: `packages/account/src/common/profile-images/profile-image.service.ts`, `packages/core/storage` 및 Account images tests. Flutter 전송 구현 evidence는 `packages/integration-ui/SOCIAL.md`.

| 단계 | 현재 source 계약 | 운영 합격 기준 |
| --- | --- | --- |
| reserve | USER는 actor==target, PET는 owner 조회; 슬롯 0..5; opaque object key; PNG PUT presign 300초 | 다른 계정/반려견 거절, 슬롯 초과 거절, 올바른 버킷/HTTPS exact origin, URL/query 로그 제외 |
| PUT | 앱은 메타데이터 없는 PNG로 변환하고 별도 무인증 HTTP client 사용 | 승인된 `IMAGE_STORAGE_ORIGIN`과 presigned URL origin 정확히 일치; Authorization·cookie 첨부/redirect 따라가기 금지; 만료 오류 재예약 UX |
| complete | bounded read/ETag 조건; PNG signature/IHDR, 최대 5MiB·4096×4096; 서버 review object로 고정 후 CAS UPLOADING→PENDING | 위변조/교체/크기 초과 및 경합 거절, complete 중복/재시도 정책 검증. 실제 저장소 HEAD/GET/PUT 권한 확인 |
| moderation | admin PENDING→APPROVED/REJECTED; 일반 공개에는 승인·active만 표시; signed GET 300초 | reviewer 역할·queue·연락처·검토/신고 응답 담당·운영 SLA 확정; pending/rejected가 타 사용자에게 노출되지 않음 |
| removal | DB/CAS 후 object best-effort 삭제, 실패 처리 일부 존재 | object 삭제 실패 재시도/관측·orphan sweep·재고 대조·versioned object/CDN/backups 정책 필요 |

현재 Flutter `IMAGE_STORAGE_ORIGIN=''`이며 실제 업로드는 차단 조건이다. 운영자 승인된 HTTPS storage origin이 가장 작은 외부 blocker다. `STORAGE_HOST` 값과 실제 presigned URL origin이 같은지 server/operator가 **query 없이 origin만** 확인해 공유한다. web CORS는 필요한 origin·PUT/content-type만 허용하며 공개 bucket이나 broad wildcard로 해결하지 않는다.

300초 signed URL 만료는 **object retention/삭제 기한이 아니다**. staging 업로드 재예약 시 옛 object, complete race loser, 거절/삭제 후 best-effort 실패, versioned object, DB와 분리된 사진/백업의 보존·삭제 작업을 운영자가 정해야 한다. 확정된 보존 기간은 아직 없다. review alert 실패에서도 queue 조회·수동 처리와 재시도 관측이 필요하다. 사진 사전 승인만으로 자기소개/채팅/챌린지 UGC 전체 moderation이 충족되지는 않는다.

## 계정삭제·사용자차단: 현재 지원 여부

| 동작 | 서버 source 지원 | 구분 |
| --- | --- | --- |
| logout | OIDC/session logout 흐름 존재 | 앱/일부 session 종료이며 Account·UGC·결제 기록 삭제 아님 |
| deletePet | command/handler 없음; 이전 true, 이번 로컬 명시적 오류 | 반려견 삭제도 아직 미지원; 계정삭제 아님 |
| Account self-service 계정삭제 | `DeleteUserCommand` 선언만 있고 handler/resolver/controller 연결 없음 | 지원 없음. `hardDeleteUser` repository helper는 종단 간 삭제 API 아님 |
| `DELETE /users` | 과거 `packages/account/swagger-spec.json`에 표기 | 실제 controller 지원 증거 아님. 오래된 artifact를 앱 계약으로 사용하지 않음 |
| Auth admin user 삭제 | tenant admin `DELETE /t/:tenant/admin/users/:id`, source handler `user.withdraw()` 후 save | privileged Auth lifecycle. Account self-delete/물리적 삭제·cross-domain UGC 정리 아님; session/grant/credential retention 별도 확인 |
| 사용자차단 | 확인한 Account 및 최신 원본 Match source에 지속 차단 API/정책 없음 | 앱도 차단 없음. UI만 숨기기/매치 취소로 대체 불가 |
| 신고 | 원본 Match `PairController.reportPair` REST 동작 source 있음 | 매치 취소 및 report event는 차단/신고 운영 해결을 증명하지 않음. Flutter 현재 GraphQL 계약과 별도 확인 필요 |

### 최신 공식 정책 대조 — 2026-10-06 확인

Apple은 계정 생성 앱의 쉽게 찾을 수 있는 앱 내 계정삭제 시작, 관련 개인정보·UGC 삭제, 처리 시간/필수 보존 안내를 요구한다. 임시 비활성화만으로 충족되지 않는다. 일반 앱은 전화·메일·상담 강제 흐름으로 대체할 수 없고, 합리적인 재인증/확인은 허용한다. Sign in with Apple을 제공한다면 관련 user token revoke도 필요하다. [Apple 계정삭제 안내](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion)

Apple 1.2는 UGC 필터링, 신고와 적시 대응, 가해 사용자 차단, 공개 연락처를 요구한다. 카카오 같은 social login이 주 계정 인증으로 쓰이면 4.8의 동등한 privacy 조건을 충족하는 다른 로그인 서비스 또는 명시적 예외를 확인해야 한다. 현재 카카오 활성화나 일반 비밀번호 로그인만으로 이 판정을 끝내지 않는다. [Apple App Review Guidelines 1.2·4.8](https://developer.apple.com/app-store/review/guidelines/)

Google Play는 앱 내 및 앱 외 웹 resource에서 삭제 요청 시작을 지원하고 Play Console에 웹 URL을 등록하도록 요구한다. 계정과 관련 데이터 삭제가 필요하며 freezing은 대체가 아니다. 보안/사기방지/규제 등 정당한 잔존 데이터는 사용자에게 보존 정책을 명확히 알려야 한다. 개인정보처리방침·Data safety 표기는 실제 데이터 처리와 일치해야 한다. [Google User Data / Account Deletion](https://support.google.com/googleplay/android-developer/answer/10144311)

Google UGC 정책은 생성/업로드 전 약관 동의, 금지 내용 정의, 지속 moderation·신고/조치를 요구한다. 1:1 interaction은 앱 내 사용자차단, 공개 UGC는 신고·차단을 갖춰야 한다. 사진 승인만으로 채팅 차단을 대신할 수 없다. [Google UGC](https://support.google.com/googleplay/android-developer/answer/9876937?hl=en)

따라서 현재 상태에서 계정삭제/차단 출시 gate는 미합격이다. 법정 기간·국가별 의무는 이 문서에서 새로 정하지 않고 사업/개인정보 책임자가 확정한다.

## 삭제·차단 cross-domain 계약 제안 — 미구현, 이름·스키마 미확정

coordinator와 각 소유자가 승인할 **검토안**이다. 새 breaking GraphQL/API를 이번 작업에서 구현하지 않았다.

### 삭제

- 앱 내 계정설정 및 독립 HTTPS 웹 삭제 resource가 같은 self-service server use case를 호출한다. 요청 대상은 server principal의 본인으로 고정하고 임의 userId·subject 삭제 입력을 받지 않는다.
- 최근 재인증을 issuer/subject/tenant/nonce/auth_time 등 서버가 검증한 증거로 확인한다. 카카오 계정에 존재하지 않는 비밀번호를 요구하지 않는다. 단순 UI 확인·클라이언트 timestamp는 인증 증거가 아니다.
- idempotent request receipt·진행 상태·처리 예정 및 잔존 범위 안내를 제공한다. `DELETION_REQUESTED`에서 신규 API/매칭/메시지/위치 업로드/구매 접근을 즉시 제한하고, 삭제 worker/outbox를 통해 도메인별 조치를 추적한다. **접근 제한은 삭제 완료가 아니다.**
- Auth session/grant/refresh token/linked credential 처리는 Auth owner가 적합한 revoke/withdraw/erasure 순서를 확정한다. 기존 access token 잔존 시간 동안 Gateway와 서비스에서 tombstone/상태 확인 계약도 필요하다. Auth admin withdrawal만으로 전체 삭제 완료를 표시하지 않는다.
- 각 소유자의 ACK/검증과 승인된 최소 잔존 데이터 정책까지 완료한 뒤만 삭제 완료로 표시한다. event/로그에는 opaque request/account 식별자·상태만 두고 DI·GPS·사진 URL·provider token·영수증을 싣지 않는다.

| 소유자 | 삭제 효과 및 먼저 합의할 내용 |
| --- | --- |
| Account | profile, pet, 사진 DB/object, 가입 identity/외부 identity mapping·handoff·DI HMAC/중복 예약, 개인정보가 포함된 audit/cache/index. pet FK `no action` 및 다른 도메인 reference 때문에 `hardDeleteUser` 단독 호출 불가. DI 재가입 제한 근거·기간·키 버전 조회/삭제 정책 결정 |
| Auth | 사용자 withdraw와 실제 identity/credential erasure 차이, 전체 세션/authorization grant/refresh revoke, issuer-subject 매핑 및 provider 연결 해제/토큰 revoke 효과, Auth audit 최소 잔존 및 재가입 새 subject. Auth 담당 확인: tenant-scoped 최소권한 atomic deprovision API는 없음. 이를 해결하려고 Account에 admin 권한을 주지 않음 |
| Match/Chat | feed/index/관심/매치/room membership·발송 및 push 취소. 작성한 채팅·UGC·사진을 삭제하거나 법적 근거 있는 최소 증거만 별도 제한 보관; 표시 이름을 바꾸는 것만으로 UGC 삭제 완료를 주장하지 않음. 상대 사용자 정상 사용과 신고 조사의 잔존 범위를 명시 |
| Challenge/GPS | 담당 확인 source: `DELETE /challenge/internal/v1/users/:userId`가 server-only `CHALLENGE_ACTIVITY_SECRET`로 transaction 내 자기 route/walk/diary/photo cleanup/participation/activity 및 deleted-user tombstone을 처리. Account 호출·재시도·완료 추적 연계는 미확인. 다른 사용자 walk의 routeId FK는 null이지만 공개 좌표/title snapshot은 남으므로 재노출/보존 계약 필요. 공개 코스/리뷰에는 suspended/block 관계 필터 없음. 현 participation/activity/earnedRewardCode의 삭제·기존 발급 보상 영향은 도메인 소유자와 확인한다 |
| Payment | source `75c5a25`: account token/userId를 identity/intent/purchase/wallet/ledger/job에서 참조. 암호화 proof, 중복 구매 방지, refund tombstone에 삭제 연계·TTL 없음. 승인된 법정·부정사용 최소 증거만 제한 보존하고 account mapping 가명화/삭제 범위 협의. proof/key를 무조건 삭제해 환불·중복 방지를 깨뜨리지 않음. 재가입 새 subject에 이전 wallet을 자동 연결하지 않음 |
| 운영/개인정보 | 버전/백업/로그/export/CDN 삭제·접근·백업복원 시 재삭제 정책, 잔존 자료 근거·기간·담당·사용자 고지 확정. 삭제 진행 실패 retry/DLQ/연락처와 확인 절차 |

Payment 담당에게 위 의견을 전달했다. 실제 법정 보존 기간, 환불/스토어 restore 및 계정삭제 완료 기준은 아직 합의되지 않았다. 결제/구독 해지와 계정삭제가 다른 행위임을 사용자에게 설명해야 한다.

### 차단/신고

- server-owned block 관계와 idempotent block/unblock 조회·변경 계약을 합의한다. 요청 actor는 server principal, 자신 차단 금지, 임의 actor 입력 금지; 다른 tenant 차단 참조 거절.
- Match feed/추천/새 관심·매치에서는 차단 관계 양쪽 노출을 차단한다. Chat은 서버가 신규 발송·첨부·push를 거절하고 websocket 재연결/REST 우회에도 적용한다. 이미 받은 콘텐츠/history 접근·삭제와 신고 증거의 정책도 합의한다.
- GPS/Challenge 공개 route·리뷰 및 다른 사용자 walk의 원본 route 좌표/title snapshot 노출 정책을 결정한다. 차단은 상대 Payment wallet/영수증을 삭제하거나 상대 계정 탈퇴를 의미하지 않는다.
- 신고는 사용자·콘텐츠 target, 사유, 안전한 evidence reference, 접수 상태 및 moderator 처리 기록을 가진다. 금지 약관/담당·연락처/필터링·응답 SLA와 제재·이의 처리 절차가 필요하다. 신고했다고 차단이 구현된 것으로 보지 않는다.
- 출시 합격: 두 실제 테스트 사용자로 앱 내 block/unblock·신고, feed 차단, 메시지 발송 거절, websocket/API 우회 거절, moderator 처리 및 개인정보 비노출을 검증한다.

## 환경 이름과 경로 — 값은 공유하지 않음

dev manifest `gitops/clusters/oci-a1/gaegaeting-dev/secrets/account-runtime.yaml`: Doppler project `gaegaeting`, config `stg` → Kubernetes Secret `gaegaeting-dev/gaegaeting-account-runtime`. 실제 값을 이번에 조회하지 않았다. prod config/managed Secret과 access owner는 별도 승인·확인이 필요하다.

| 목적 | 이름/경로 | 준비 상태 |
| --- | --- | --- |
| Flutter 공개 OIDC/API | `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_REDIRECT_URI`, `OIDC_LOGOUT_URI`, `API_AUDIENCE`, `GATEWAY_GRAPHQL_URL`, `ACCOUNT_GRAPHQL_URL`, `API_ENABLED`, `STORE_PURCHASES_ENABLED` | 실제 `lib/core/config/app_config.dart` key 확인; 앱 담당의 dart-define 값과 issuer/resource 표 대조; 예시 파일만으로 live 판정 금지 |
| Flutter 사진 | `IMAGE_STORAGE_ORIGIN` | 현재 빈 값, operator 승인 exact HTTPS origin 필요 |
| Account/Auth 연동 | `AUTH_BASE_URL`, `AUTH_ISSUER`, `AUTH_TENANT_CODE`, `AUTH_PROVISIONING_CLIENT_ID`, `AUTH_PROVISIONING_CLIENT_SECRET`, `AUTH_SIGNUP_CLIENT_ID` | provisioning secret은 서버 전용; signup client ID export/다중 client binding 결정 필요 |
| 가입/중복 | `REGISTRATION_DI_HMAC_SECRET`, `REGISTRATION_DI_HMAC_KEY_VERSION`, `REGISTRATION_SERVICE_TOKEN`, `REGISTRATION_MOCK_ENABLED`, `REGISTRATION_HANDOFF_TTL_MS`, `REGISTRATION_CLAIM_TTL_MS`, `NODE_ENV` | production mock 금지; 실제 provider 필요; TTL 키 미export 시 source 기본값 사용 |
| 내부 인증 | `INTERNAL_AUTH_ASSERTION_SECRET` | Gateway↔Account 전용; 원문 앱/문서/로그 노출 금지 |
| DB/cache | `DATABASE_HOST/PORT/SSL_MODE/SYNCHRONIZE`, `ACCOUNT_DATABASE_NAME/USERNAME/PASSWORD` → `DATABASE_NAME/USERNAME/PASSWORD`, `REDIS_HOST/PORT` | migration backup/복구 및 DB integration 검증을 operator가 준비 |
| storage | `STORAGE_HOST`, `STORAGE_USER_BUCKET`, `STORAGE_PET_BUCKET`, `STORAGE_PROFILE_PREFIX`, `STORAGE_REGION`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY` | server-only credential, HTTPS signed-origin 및 staging/review lifecycle·moderator queue 확인 |
| 반려견 인증 | `PUBLIC_DATA_API_KEY` | 서버 전용; 실제 공급자 장애·타 계정 ownership 계약 검증 필요 |

Auth tenant/client/provider의 저장소 설정과 Doppler 참조는 Auth 소유자가 확인한다. 카카오 API key/client secret 및 OIDC server/provisioning secret은 native client payload에 포함하지 않는다.

## 실행한 검증

검증 runtime `Node v24.13.1`, `pnpm 10.34.5`: `.nvmrc` 및 packageManager pin 일치. 아래 pnpm 명령은 해당 Node bin을 PATH 선두에 두고 실행했다. repo AGENTS/상위 AGENTS 없음 확인; Auth AGENTS/OIDC·security, backend/toolchain/QA/document/branch 및 Orca workflow 규칙을 확인했다.

```sh
PATH=/Users/kangjuhyup/.nvm/versions/node/v24.13.1/bin:$PATH pnpm --filter account test --runInBand --runTestsByPath test/user/account-mobile-safety-api.spec.ts
PATH=/Users/kangjuhyup/.nvm/versions/node/v24.13.1/bin:$PATH pnpm --filter account test --runInBand
PATH=/Users/kangjuhyup/.nvm/versions/node/v24.13.1/bin:$PATH pnpm --filter account... build
PATH=/Users/kangjuhyup/.nvm/versions/node/v24.13.1/bin:$PATH pnpm --filter account build
node --test scripts/account-mobile-auth-readiness.test.mjs
node scripts/account-mobile-auth-readiness.mjs
git diff --check
```

| 명령 | 결과 |
| --- | --- |
| 신규 GraphQL 경계 | 1 suite / 6 tests pass |
| Account 전체 | 최종 반려견 인증 변경 후 26 suites / 223 tests pass; PostgreSQL integration 1 suite / 11 tests skipped. 실제 DB/migration 검증 완료로 표시하지 않음 |
| Account 및 의존 패키지 build | 11 workspace projects build pass; 추가 반려견 인증 변경 후 `pnpm --filter account build` 재검증 pass |
| Node probe tests | 5 tests pass |
| live dev anonymous probe | exit 2 (의도된 미준비 신호): discovery200, authorize400 invalid_client, userLoginE2E=false |
| whitespace diff | pass |

probe exit 0은 오직 interaction UI redirect 도달을 뜻한다. 실제 로그인·API·삭제/차단·사진 및 prod 준비 완료를 뜻하지 않는다. Jest Slack 관련 테스트 출력은 stub 호출 기록이며 이번 작업에서 외부 메시지를 보내지 않았다.

## 외부 후속 업무 순서·합격 기준·중단/롤백

| 순서/책임 | 남은 일 | 합격 기준 | 중단·롤백 조건 |
| --- | --- | --- | --- |
| 1 Auth/operator | native URI validation review/release 승인, 현존 client 조회 후 dev public PKCE 등록, scope/resource/UI binding 및 prod 별도 승인 | 익명 probe UI 도달 + 실제 기기 로그인/refresh/logout, 정확한 issuer/audience; 잘못된 tenant/scope/S256 거절 | invalid_client/redirect/resource, 기존 web/social signup 회귀: 앱 API 활성화 보류, 변경 client/설정을 기존 승인 상태로 돌리는 별도 운영 작업. secret embedding/web fallback 금지 |
| 2 본인인증/Account 운영 | 실제 본인인증 공급자·동의/보존 계약, DI 중복·signup binding, 기존 미배포 migration 검토 | production mock false에서도 실제 검증 가입·재시도·중복 거절, DB integration 11개 및 migration rehearsal 성공 | provider unavailable/중복·subject 오결합: 신규 가입 보류, 데이터 손실 없는 rollback/forward-fix. HMAC key 임의 교체 금지 |
| 3 storage/moderation operator | 승인 HTTPS origin 공유, bucket 제한권한·lifecycle·orphan retry·검토 담당 | 실제 기기 reserve→PUT→complete→승인, 거절/삭제/만료/타 owner 거절; 공개에는 승인 사진만 | 원치 않는 origin/PII URL 로그/미승인 노출: 업로드·UGC 노출 보류, 보안 이슈 조치 및 object 접근 재검증 |
| 4 Account/Match/Chat/Challenge/Payment/Auth + 개인정보 책임자 | self-service 삭제·웹 삭제 및 차단/신고 계약, 데이터 항목·정당한 잔존 기간/고지·처리 상태 합의 후 구현 | 두 테스트 사용자로 삭제·차단 전 도메인 효과/권한/재시도/완료 고지 확인, published web URL/정책 일치 | partial cleanup/차단 우회/데이터 재노출: 출시 보류, 삭제 상태 유지·retry/forward-fix. **이미 지운 개인정보 복원은 rollback으로 하지 않음** |
| 5 Account/Flutter/security reviewer | 이번 profile·certifyPet ownership/unsupported 오류 리뷰·정식 반영, 공개 개인정보 필드 계약, Apple social-login 선택/예외 | 기존 GraphQL 호환성, 타 계정 모든 쓰기 거절·개인정보 정책, 앱 삭제 오류 UX, Apple 4.8 판단 근거 | IDOR/PII 노출/삭제 성공 오표시: 관련 기능 및 출시 보류; 보안 수정 이전 상태를 안전 rollback이라고 주장하지 않음 |
| 6 Flutter coordinator/스토어 owner | 실제 E2E, privacy/Data safety/연락처/UGC terms·심사 테스트 계정, 업로드 SDK·서명·스토어 설정 | source/mock가 아닌 사용자·API E2E 결과와 정책 gate 모두 합격 | 빌드 성공만으로 출시하지 않음; store rollout/활성화는 별도 사용자 승인 범위 |

현재 가장 작은 즉시 외부 작업은 **Auth native client 계약 확정과 storage HTTPS origin 지정**이다. 그와 독립적으로 개인정보/삭제·차단·UGC 운영 계약과 실제 본인인증 준비를 병행할 수 있다. 삭제·차단 미지원 상태를 단순 출시 문서나 로그아웃 버튼으로 해결할 수는 없다.

## 협의 기록

- coordinator: 현재 dispatch 유효 및 원본/배포 source 비교·두 작은 resolver 수정 범위를 확인했다. 후속 msg_811fc8531e76 및 같은 dispatch의 직접 terminal 지시로 certifyPet principal/owner 수정을 추가 승인했다. 새 account deletion/block API는 계약 제안만 허용했다.
- Challenge: 09:05 KST 최신 dev discovery200/native invalid_client 및 09:13 내부 삭제 source/잔존 route snapshot·block 필터 미지원 계약을 공유했다. 기존 web/admin-web에 challenge scope가 있다는 기록을 native 등록 증거로 사용하지 않는다.
- Payment: encrypted proof/refund/idempotency 자료를 일괄 삭제하지 않고 법적 잔존 및 mapping 분리 계약을 제안했고 전달했다. 보존 기간 미확정, 사용자 삭제 API 없음.
- Auth: 기존 담당 terminal의 read-only 최종 답변을 수신하고 payload·모바일 가입·최소권한 deprovision 부재·live 재조회 제한을 반영했다. 원격 적용 승인은 이번 범위 밖이며 payload는 준비 초안이다.
