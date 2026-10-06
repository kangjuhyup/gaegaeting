# Payment 서비스

인앱결제 검증과 간식 충전을 담당하는 NestJS Federation 서비스다. GraphQL은 `/payment/graphql`, 내부 상태 확인은 `/payment/health`, 기본 포트는 2802다. 모바일 앱은 별도 저장소에서 연동한다.

## 모듈

| 경로          | 책임                                                                  |
| ------------- | --------------------------------------------------------------------- |
| `src/item`    | 간식 상품, 기본·이벤트 판매 조건, 스토어 상품 연결, 상품 조회         |
| `src/wallet`  | 사용자 잔액, 구매 건별 잔량, FIFO 사용, 사용 배분·충전·회수 원장      |
| `src/payment` | 구매 준비, Apple·Google 검증, 거래·환불·환불 취소, 알림과 재시도 작업 |
| `src/common`  | 실행 설정, 공유 DB 연결·트랜잭션, 인증, 공통 전달 타입                |

각 모듈은 application 포트·서비스와 infrastructure 저장소를 갖는다. 결제 저장소는 같은 DB 트랜잭션에서 지갑의 인프라 연산을 호출하여 거래 저장과 지급을 함께 커밋한다. 네트워크 호출은 트랜잭션 밖에서 수행한다. Payment의 PostgreSQL 어댑터와 마이그레이션은 서비스 내부에 두며 다른 서비스의 테이블을 수정하지 않는다.

## 상품과 정책

| 상품         | 간식  | 기본 가격 |
| ------------ | ----- | --------- |
| `snacks-10`  | 10개  | 2,000원   |
| `snacks-50`  | 50개  | 6,000원   |
| `snacks-100` | 100개 | 10,000원  |

Apple·Google 기본 판매 조건 ID는 `apple-snacks-10`, `google-snacks-10` 형식이다. 기본 스토어 상품 ID는 `app.gaegaeting.snacks.10`, `.50`, `.100`이다. 실제 스토어에 같은 ID의 소모성 상품을 등록하거나 판매 시작 전에 스토어 매핑을 맞춘다. 스토어 상품의 지급 수량과 상품 연결은 변경하지 않는다.

간식에는 유효기간이 없다. 실제 구매 시각, 같은 시각이면 결제 ID 순으로 사용한다. 해당 구매 건에서 1개라도 사용하면 서비스의 환불 예약 요청을 거절한다. 이후 재충전해도 사용 기록은 유지한다. 사용 기능과 서비스 환불 예약은 내부 application 기능이며 사용자에게 임의 차감·환불 GraphQL API를 노출하지 않는다. 미사용 환불의 실제 승인·요청 화면은 스토어와 모바일 앱에서 별도 연동한다.

스토어 확정 환불은 중복 없이 남은 간식을 회수한다. 이미 사용했다면 환불 검토 상태를 남기고 지갑 사용을 보류한다. 부족분을 자동으로 음수로 만들거나 다른 구매의 간식을 회수하지 않는다. 운영자가 스토어 사실관계와 서비스 정책에 따라 검토해야 하며 자동 보류 해제 API는 제공하지 않는다. 검증된 Apple 환불 취소는 해당 회차에 회수한 수량만 복원하며 다른 환불 검토 건이 있으면 보류를 유지한다.

## 이벤트 판매

`payment_product`의 지급 수량과 `payment_offer`의 판매 조건을 분리했다. 새 이벤트는 가격·기간·활성 여부·이벤트 이름·스토어 상품 및 Google offer ID를 담은 판매 조건 행으로 등록한다. 스토어에서 실제 할인 가격을 먼저 설정한 뒤 해당 판매 조건을 활성화한다. 서버 행만 변경해 스토어 가격이 바뀌지는 않는다.

- Apple: 기간별 스토어 가격 변경 또는 별도 이벤트 소모성 상품.
- Google: 스토어 할인 offer 또는 별도 이벤트 상품. 같은 SKU의 할인이라면 `store_offer_id`를 일치시킨다.
- 새 SKU는 `payment_store_product`에 기존 간식 상품과 연결한 후 `payment_offer`에 등록한다. 실행 설정의 스토어 SKU 허용 목록에도 추가한다.
- 기본 판매 조건을 유지하고 기간이 있는 이벤트 판매 조건을 추가한다. 앱은 서버 판매 조건과 스토어의 현재 구매 가능 상품·offer를 맞춰 표시하고 실제 가격은 스토어에서 가져온다.
- 구매 준비 내역에는 당시 조건을 저장한다. 이벤트가 끝나거나 판매 가격이 바뀌어도 이미 결제된 거래는 원래 조건으로 처리한다.

관리자 상품·이벤트 편집 화면 및 쿠폰·개인별 할인 규칙은 이번 구현에 포함하지 않는다. 운영 데이터 변경은 검토된 DB 작업으로 진행한다.

## 서버 설정

비밀은 서비스별 환경 파일 또는 비밀 저장소로 주입한다. `pnpm dev payment gateway`는 `packages/payment/.env`를 읽으며 셸 환경변수가 우선한다. 실제 키·토큰은 커밋하지 않는다.

스토어 상품이 등록된 경우 [설정 예제](.env.example)를 `packages/payment/.env`로 복사하고 빈 설정을 실제 값으로 채운다. 예제는 양 스토어를 활성화하므로 설정이 누락되면 서버 시작을 거절한다. 한 플랫폼만 연동하려면 다른 플랫폼의 `PAYMENT_*_ENABLED`를 `false`로 설정한다. `PAYMENT_PROOF_ENCRYPTION_KEY`는 `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`로 최초 생성할 수 있다.

| 변수                                                                                        | 설정                                                                 |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `PAYMENT_SERVICE_API_PORT`                                                                  | 기본 2802                                                            |
| `INTERNAL_AUTH_ASSERTION_SECRET`                                                            | Gateway와 공유하는 32자 이상 비밀                                    |
| `PAYMENT_PROOF_ENCRYPTION_KEY`                                                              | 독립적인 32바이트 키를 표현한 64자리 hex                             |
| `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `DATABASE_NAME` | Payment 전용 PostgreSQL 연결                                         |
| `DATABASE_SSL_MODE`                                                                         | 공통 DB 계약: `disable`, `require`, `verify-full`                    |
| `PAYMENT_DATABASE_URL`                                                                      | 위 연결 대신 사용할 선택적인 PostgreSQL URI                          |
| `PAYMENT_STORE_ENVIRONMENT`                                                                 | 로컬·테스트 기본 `Sandbox`, 운영 `Production`; 운영에서 Sandbox 거절 |
| `PAYMENT_WORKER_ENABLED`                                                                    | 기본 `true`; 알림·consume 재시도와 환불 대조 작업                    |
| `PAYMENT_APPLE_ENABLED`, `PAYMENT_GOOGLE_ENABLED`                                           | 각 스토어를 설정한 뒤 `true`; 미설정 스토어는 판매·결제 불가         |

양 플랫폼 판매를 시작하려면 두 스토어를 모두 활성화한다. 암호화 키를 교체하면 기존 구매 증거와 미완료 작업을 재암호화해야 한다. 단순히 키를 덮어쓰면 복구·환불 처리가 실패하므로 기존 키를 유지한다.

Apple 활성화 설정:

- `PAYMENT_APPLE_BUNDLE_ID`, `PAYMENT_APPLE_KEY_ID`, `PAYMENT_APPLE_ISSUER_ID`.
- `PAYMENT_APPLE_APP_ID`: 운영 App Store 숫자 ID.
- `PAYMENT_APPLE_SIGNING_KEY_PATH`: 서버에 마운트한 `.p8` 키 파일.
- `PAYMENT_APPLE_ROOT_CERT_PATHS`: Apple 공개 루트 인증서 DER 파일 경로들을 쉼표로 구분.
- `PAYMENT_APPLE_PRODUCT_IDS`: 허용할 소모성 SKU들을 쉼표로 구분.

Google 활성화 설정:

- `PAYMENT_GOOGLE_PACKAGE_NAME`, `PAYMENT_GOOGLE_PRODUCT_IDS`.
- `PAYMENT_GOOGLE_PUSH_AUDIENCE`: Pub/Sub push OIDC 토큰의 audience; 운영 HTTPS.
- `PAYMENT_GOOGLE_PUSH_SERVICE_ACCOUNT_EMAIL`: push 인증용 서비스 계정 이메일.
- Android Publisher API 권한을 가진 서버 ADC 또는 `GOOGLE_APPLICATION_CREDENTIALS`. push 인증 계정과 Play 조회 계정의 역할을 구분한다.

Gateway에 `PAYMENT_SERVICE_URL=http://127.0.0.1:2802/payment/graphql`을 설정한다. 새 로그인은 `payment:read payment:write`를 요청해야 한다. 외부 Auth 클라이언트에도 두 스코프를 허용한다. [중앙 인증 계약](../../docs/central-auth-client-integration.md)을 참고한다.

## 빌드·실행·마이그레이션

저장소의 Node 24.13.1 / pnpm 10.34.5를 사용한다.

```sh
nvm use
pnpm install --frozen-lockfile
pnpm --filter payment... build
# Payment DB 설정이 프로세스 환경에 주입된 상태에서 실행한다.
pnpm --filter payment migration:run
pnpm dev payment gateway
```

마이그레이션 명령은 `.env`를 자동으로 읽지 않는다. DB는 먼저 준비하고 마이그레이션을 명시적으로 적용한다. `pnpm dev payment gateway`는 이미 실행 중인 Account·Match도 필요하다. 전체 로컬 실행은 `pnpm dev account match payment gateway`를 사용한다. 기존 인프라가 없으면 이 명령만으로 DB·Auth·스토어가 생성되지는 않는다.

## 모바일 연동

실제 요청 문서는 [모바일 GraphQL 연산](examples/mobile-operations.graphql)을 사용한다. 모바일 bearer token은 Gateway에만 전달하고 Payment에 내부 인증 값을 직접 생성해 보내지 않는다.

1. `snackProducts(provider: APPLE | GOOGLE)`에서 판매 조건과 스토어 ID를 조회한다.
2. 스토어 상품·offer를 조회하여 실제 가격과 통화를 표시한다.
3. `prepareSnackPurchase(input: {provider, offerId})`를 호출하여 준비 ID와 `accountToken`을 받는다.
4. Apple `appAccountToken` / Google `obfuscatedAccountId`에 서버 값을 전달해 구매한다. Google 할인 offer는 스토어가 반환한 현재 offer token을 사용한다.
5. `confirmSnackPurchase(input: {preparedId, proof})`를 호출한다. Apple proof는 signed transaction JWS 또는 transaction ID, Google proof는 purchase token이다. 지급 수량·사용자·금액을 입력하지 않는다.
6. `PURCHASED` 지급 성공 후 Apple 거래를 finish한다. Google consume은 서버 작업이 처리하므로 앱이 먼저 consume하지 않는다. 대기·실패 응답은 지급 성공으로 표시하지 않는다.
7. `mySnackWallet { balance availableBalance frozen }` 및 `mySnackTransactions`를 조회한다. 다음 페이지의 `after`는 이전 목록 마지막 ID다.

앱 재실행 시 미완료 거래를 같은 준비 ID로 재제출한다. 재시도·다른 기기·서버 알림이 겹쳐도 지급은 한 번이다. 서버 알림은 기존 구매 준비와 정확히 매칭할 수 있을 때만 충전을 복구한다. 매칭되지 않는 거래는 지급하지 않고 작업에 보존한다.

## 알림과 운영 복구

- Apple Server Notifications V2: `POST /payment/notifications/apple`.
- Google 인증된 Pub/Sub RTDN: `POST /payment/notifications/google`.
- 사용자 내부 assertion으로 스토어 알림을 인증하지 않는다. 각 제공자의 서명·OIDC 인증을 검증하며 저장 실패 시 수신 성공을 반환하지 않는다.
- 알림 작업과 Google consume 작업은 암호화된 증거, 임대, 재시도 시각을 DB에 보존한다. 완료 행도 유지하여 같은 알림의 재지급을 방지한다.
- 환불 대조는 제공자별 성공 시각을 DB에 저장한다. 재시작·일시 장애 이후 저장한 시각부터 겹치는 구간을 다시 읽는다. 첫 실행은 28일 범위다.
- 복구 공백이 제공자 보존 범위를 넘으면 `refund_reconciliation_requires_review` 로그를 남기고 체크포인트를 진행하지 않는다. 운영 모니터링에서 이 이벤트와 반복 `jobs_retry_scheduled`를 확인한다.
- 스토어 최종 처리 작업 중 이미 환불된 거래는 회수를 반영하고 종료한다. 환불 취소는 검증된 이벤트와 최신 스토어 구매 상태가 모두 확인된 경우만 복원한다.

## 검증

```sh
pnpm --filter payment test --runInBand
# 임시 스키마를 만들고 삭제할 수 있는 전용 PostgreSQL 테스트 DB를 사용한다.
PAYMENT_TEST_DATABASE_URL=postgresql://user:password@127.0.0.1:5432/payment_test \
  pnpm --filter payment test --runInBand
```

DB 환경변수가 없으면 PostgreSQL·실제 HTTP API 통합 테스트는 건너뛴다. SDK 어댑터 테스트는 스토어 응답을 주입해 검증 경계를 확인하며 실제 자격증명을 사용한 Sandbox 결제를 대신하지 않는다. 운영 판매 전에 별도 모바일 앱과 실제 스토어 테스트 계정으로 구매·재시도·재구매·환불을 확인한다.

2026-10-05 검증: PostgreSQL 16.15를 포함한 결제 테스트 105개, 테스트 코드 TypeScript 검사, 전체 워크스페이스 빌드·테스트, 실행·인증·이미지 계약 테스트 88개가 통과했다. Payment 컨테이너 빌드와 비루트·읽기 전용 환경에서의 애플리케이션·마이그레이션 진입점 검사도 통과했다. 실제 스토어 Sandbox 구매와 운영 배포는 수행하지 않았다.
