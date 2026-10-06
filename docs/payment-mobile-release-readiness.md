# 모바일 첫 출시: 결제 준비 인계

확인일: 2026-10-06. **결제 비활성 상태의 준비를 완료했으며 앱 출시 또는 판매 개시를 완료한 것은 아니다.** 현재 Doppler `gaegaeting/stg`, Kubernetes `gaegaeting-dev`에서 Apple·Google 모두 disabled다. 이번 작업은 로컬 준비와 읽기 검증만 수행했다. 커밋·push·merge·배포·스토어 설정 변경·결제·키 발급/회전/비활성화·계약 체결은 수행하지 않았다.

Flutter 담당은 `/Users/kangjuhyup/orca/workspaces/gaegaeting/플러터앱`의 coordinator다. 앱 파일을 수정하지 않았다. 증거는 해당 저장소 `packages/integration-ui/{README.md,CHALLENGE.md,SOCIAL.md,PAYMENT.md}`와 결제 controller/screen/SDK wrapper를 읽어 확인했다. 담당 터미널 `term_d0391ad1-b52b-452f-89c6-e699725b2efd`는 외부 사용자 소유이므로 **완료 후 닫지 않는다**.

## 첫 출시의 합격 기준과 현재 증거

| 항목           | 기준                                                                      | 현재 증거 / 남은 작업                                                                                                                                               |
| -------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 판매 중단      | 앱 `STORE_PURCHASES_ENABLED=false`, 서버 양 플랫폼 `false`                | source: 앱 SDK 조회/구매/restore 호출 없음. live: Doppler와 runtime Secret 일치, 두 catalog 조회 `STORE_UNAVAILABLE`                                                |
| 잔액 조회      | 인증된 사용자에게 서버 잔액·사용 가능 잔액·보류 상태 표시                 | source/mock: 구현 확인. live: 합성 내부 principal로 조회 성공. **실제 native 로그인·사용자 API E2E 미검증**                                                         |
| 사용자 표시    | 구매 불가 안내, 성공/유료 판매 가능으로 오인시키지 않음                   | source: 구매불가 안내·버튼 비활성. coordinator가 “간식 잔액” / “간식 잔액을 확인하세요”로 수정했으며 현재 source에서도 확인함                                       |
| 동기화         | 서버 잔액 조회, 로컬 지급/완료된 소모성 상품 재지급 없음                  | source/mock: disabled에서 SDK 호출 없이 journal 보존·서버 조회. 실제 다른 기기 복구는 미검증                                                                        |
| 인증·계정 수명 | native Auth client에 `payment:read payment:write`, 삭제 후 접근 차단 정책 | 외부 Auth client 허용 여부 미검증. Account 담당 확인: 실제 삭제 handler/mutation 없음, command 선언만 존재                                                          |
| 앱 제출        | 서명·스토어 메타데이터·개인정보/삭제 정책·업로드 SDK 충족                 | coordinator 소유. Flutter 168 tests/결제 30 tests, Android/web/iOS simulator Xcode 16.2 통과는 전달받은 증거. Xcode 26/iOS 26 SDK 업로드 요구 확인과 실제 제출 별도 |

결제 키·계약·스토어 상품 활성화는 비활성 첫 출시의 결제 기능 준비 합격 조건이 아니다. 실제 로그인 조회 및 계정 삭제/개인정보 정책은 앱 출시 담당에게 남은 조건이다. mock 테스트를 스토어 결제 또는 사용자 E2E 증거로 사용하지 않는다.

coordinator 추가 증거: 비활성 화면 수정 후 결제 30 tests 및 Android emulator의 Retrofit fixture 잔액 조회/동기화가 통과했고 SDK query/restore/buy 호출은 0회다. 이는 emulator/mock 증거이며 실제 사용자 로그인이나 스토어 Sandbox 결과가 아니다. 통합 인계는 Flutter 저장소 `packages/integration-ui/RELEASE_PREPARATION.md`에서 관리한다.

## live 읽기 결과

- Doppler `gaegaeting/stg`와 `gaegaeting-dev/gaegaeting-payment-runtime`: `PAYMENT_APPLE_ENABLED=false`, `PAYMENT_GOOGLE_ENABLED=false`; 원본 비밀과 runtime projection 비교는 값 출력 없이 수행했다.
- Payment/Gateway Deployment 각각 Ready 1, 내부 health 200. Argo `Synced/Healthy`, revision `1980c942981cb5a37e4fcc1ab7240f0a3777c4ed`.
- Payment image: `ghcr.io/kangjuhyup/gaegaeting/payment:sha-75c5a2564ff3d87f8585672cd86c4da7422eb5d0@sha256:1371157b93112cecb6e882a23b9528db91e567c2bc1a84db9d2b59cc57fb4d1e`.
- Gateway image: `ghcr.io/kangjuhyup/gaegaeting/gateway:sha-dfd6fca8b5297870fa9024622efd55b53c2a4488@sha256:184bf4cd4e74acaa9792b55bed86a6cea8e50c6d4c126b38027dc9ddf453bfe8`. 이전 Payment 배포와 같은 SHA라고 가정하지 않는다.
- 합성 내부 principal의 읽기: 잔액/사용 가능 잔액 0, 보류 false, 거래 목록 empty. 미인증 요청 `UNAUTHENTICATED`, 양 스토어 catalog `STORE_UNAVAILABLE`. prepare/confirm/알림 POST 등 mutation **0회**. native 로그인 증거가 아니다.
- ConfigMap `gaegaeting-dev/edge-proxy-start`에 Apple·Google 알림의 정확한 두 경로만 별도 ingress로 선언됨. 임의 `/payment/*` 사용자 인증 우회는 없음. 공급자가 보낸 실제 알림 수신은 미검증.
- Pod 환경에서 disabled preflight 16개 통과. 보호된 로컬 진단 요약: `/Users/kangjuhyup/Documents/k3s/.local/payment-readiness-live.json`. 조회용 임시 SSH 터널은 종료했다. 인프라 원본 checkout의 기존 수정은 보존했다.

이 문서의 로컬 환불 기간 수정과 준비 스크립트는 위 live image에 아직 배포되지 않았다.

## 상품·가격·지급 계약

| 소모성 상품 ID (양 스토어)  | 지급  | 기본 참고 가격 | Apple / Google offer ID                  |
| --------------------------- | ----- | -------------- | ---------------------------------------- |
| `app.gaegaeting.snacks.10`  | 10개  | 2,000원        | `apple-snacks-10` / `google-snacks-10`   |
| `app.gaegaeting.snacks.50`  | 50개  | 6,000원        | `apple-snacks-50` / `google-snacks-50`   |
| `app.gaegaeting.snacks.100` | 100개 | 10,000원       | `apple-snacks-100` / `google-snacks-100` |

Bundle/package 계약은 `app.gaegaeting`이다. 이 표는 source의 기본 매핑이며 콘솔 등록/가격/판매 국가 상태의 live 증거가 아니다. 활성화 전 서버 허용 SKU, `payment_store_product`, `payment_offer`, 앱에서 조회한 스토어 상품 ID·지급 수량을 대조한다. 기존 SKU의 지급 수량은 변경하지 않는다.

앱은 실제 구매 시 스토어 localized price/통화를 표시한다. `priceKrw` fallback은 “참고” 표기이며 구매 가능 근거가 아니다. Apple 검증에는 거래의 실제 가격/통화가 있지만 Google ProductPurchaseV2는 이 구현에서 실제 결제 금액을 확보하지 못하므로 `amountMinor/currency`가 null일 수 있다. 참고 가격을 실제 할인 후 결제 금액이나 영수증으로 표현하지 않는다.

이벤트는 승인된 스토어 가격 변경 또는 별도 이벤트 SKU + 서버 기간/offer 매핑으로 준비한다. 서버 `priceKrw`만 수정해 할인 판매할 수 없다. 현재 Flutter wrapper는 Google 할인 offer selector를 제공하지 않으며 `storeOfferId`가 있는 상품의 구매를 차단한다. 따라서 해당 Google offer를 출시 가능한 기능으로 안내하지 않는다. 별도 SKU도 스토어·서버·앱 확인이 필요하다.

서버는 준비 내역의 수량/조건을 보존하고 제공자 검증 후 한 번만 지급한다. `PURCHASED` 이후 Apple finish, Google 서버 consume 순서이며 앱 `autoConsume=false`다. 간식 유효기간 없음. 해당 구매 건에서 한 개라도 사용하면 **서비스 자체 환불 예약**을 거절하지만, 스토어가 확정한 환불은 별도로 회수/보류 처리한다. 사용자 약관의 “사용 후 환불 불가”를 모든 스토어 결정·법정 권리를 배제하는 절대 표현으로 확정하지 않는다.

## restore·preparedId 유실의 한계

완료된 소모성 구매를 스토어 restore만으로 다시 지급할 수 없다. 기존 계정의 서버 잔액을 조회하고, 미완료 거래는 원래 준비 ID로 검증해야 한다. Apple도 restore 대상과 완료된 소모성 구매를 구분한다. [Apple 구매 완료·복원 문서](https://developer.apple.com/documentation/storekit/offering-completing-and-restoring-in-app-purchases).

현재 journal은 계정·환경별로 분리되고 기존 preparedId를 유지한다. 서버에 준비 ID 목록 조회/재결합 API가 없다. journal이 유실된 다른 기기에서는 같은 계정에 이미 반영된 잔액 조회는 가능하지만 미확정 구매를 앱만으로 반드시 복구한다고 보장할 수 없다.

알림 복구는 provider/environment/accountToken/SKU/offer 조건에 맞는 기존 intent 중 구매 시각 이전의 가장 최근 intent를 선택한다. 같은 SKU 준비가 여러 번 있으면 원래 intent의 가격 snapshot까지 확실히 식별하는 계약이 아니다. 임의 새 prepare + 옛 proof로 소유권/조건을 재설정하지 않는다. 별도 승인 Sandbox에서 재설치·다른 기기·반복 prepare 시나리오를 검증하고, 매칭 불가 건은 지급 없이 운영 검토한다.

## 환경 설정 이름과 안전한 preflight

| 책임         | 현재 이름 / 경로                                                                                                                             | 조건                                                                                |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 앱           | `STORE_PURCHASES_ENABLED=false`                                                                                                              | 서버 키·영수증·내부 assertion 비밀을 dart-define에 넣지 않음                        |
| 서버 flag    | `PAYMENT_APPLE_ENABLED`, `PAYMENT_GOOGLE_ENABLED`, `PAYMENT_WORKER_ENABLED`                                                                  | 앞 둘 false, worker true 유지                                                       |
| 환경         | `PAYMENT_STORE_ENVIRONMENT`, `NODE_ENV`                                                                                                      | 현재 비활성 stg; 향후 Sandbox/Production 데이터를 분리. production에서 Sandbox 거절 |
| 인증·암호화  | `INTERNAL_AUTH_ASSERTION_SECRET`, `PAYMENT_PROOF_ENCRYPTION_KEY`                                                                             | 기존 키 보존. 값 출력/단순 교체 금지                                                |
| DB Doppler   | `PAYMENT_DATABASE_NAME`, `PAYMENT_DATABASE_USERNAME`, `PAYMENT_DATABASE_PASSWORD`                                                            | workload에 `DATABASE_NAME/USERNAME/PASSWORD`로 projection                           |
| DB 연결      | `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_SSL_MODE=verify-full`; 선택 `PAYMENT_DATABASE_URL`                                               | 실제 주소/이름/비밀번호는 Doppler 전용                                              |
| Gateway/edge | `PAYMENT_SERVICE_URL`, `PROXY_PAYMENT_HOST` → `PAYMENT_HOST`                                                                                 | 주소 값은 Doppler, 알림 ingress는 정확한 두 경로만                                  |
| Apple 향후   | `PAYMENT_APPLE_BUNDLE_ID`, `PAYMENT_APPLE_KEY_ID`, `PAYMENT_APPLE_ISSUER_ID`, `PAYMENT_APPLE_APP_ID`                                         | 숫자 APP_ID는 Production 필요. 현재 키 준비 안 됨                                   |
| Apple 파일   | `PAYMENT_APPLE_SIGNING_KEY_PATH`, `PAYMENT_APPLE_ROOT_CERT_PATHS`                                                                            | 아래 파일 projection 제안은 **미설치**                                              |
| Google 향후  | `PAYMENT_GOOGLE_PACKAGE_NAME`, `PAYMENT_GOOGLE_PUSH_AUDIENCE`, `PAYMENT_GOOGLE_PUSH_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_APPLICATION_CREDENTIALS` | 실제 SA/email/project는 Doppler, 현재 자격증명 준비 안 됨                           |
| SKU          | `PAYMENT_APPLE_PRODUCT_IDS`, `PAYMENT_GOOGLE_PRODUCT_IDS`                                                                                    | 기본 3 SKU 포함, 이벤트 SKU 추가 때 허용 목록도 반영                                |

향후 파일 projection 제안: Doppler `PAYMENT_APPLE_SIGNING_KEY_PEM` → `/etc/payment/apple/in-app-purchase.p8`, `PAYMENT_GOOGLE_SERVICE_ACCOUNT_JSON` → `/etc/payment/google/service-account.json`; 공식 Apple 루트 인증서는 `/etc/payment/apple/roots/` 아래 검증된 DER 파일로 제공한다. 이는 현재 설치된 Secret/mount가 아니라 후속 인프라 설계안이다. 실제 private key/JSON은 Doppler에만 저장하고 앱/소스/로그/질문에 붙이지 않는다. 공개 인증서는 공식 출처와 checksum을 대조한다.

저장소 루트, Node 24.13.1 / pnpm 10.34.5에서 실행:

```sh
source /Users/kangjuhyup/.nvm/nvm.sh
nvm use
node --test scripts/payment-environment-preflight.test.mjs
doppler run --project gaegaeting --config stg -- \
  node scripts/payment-environment-preflight.mjs --mode disabled
```

스크립트는 오프라인 환경/파일 형식 검사만 수행한다. 출력은 검사 이름과 boolean이며 값·파일 경로·parser exception을 숨긴다. 성공 exit 0, 실패 1, 잘못된 인자 2. false flag를 명시적으로 요구하며 배포 TLS, DB 별칭, 원래 암호화 키 형식, 기본 SKU를 검사한다. `.env.example`의 DB SSL disable은 로컬 전용이므로 배포 preflight 합격 예시가 아니다.

별도 승인 후 마운트된 Sandbox 환경에서 `--mode sandbox-apple`, `sandbox-google`, `sandbox-both`로 동일 스크립트를 실행할 수 있다. **이 명령은 flag를 변경하지 않으며 활성화하지 않는다.** EC P-256 Apple 키, 유효 CA 인증서, Google RSA 서비스 계정 JSON, HTTPS push audience 형식을 검사하지만 계약/상품/권한/공식 trust anchor 동일성/실제 네트워크를 증명하지 않는다. Google의 다른 ADC 방식은 이 파일 preflight로 입증할 수 없으므로 별도 권한 검증이 필요하다.

## 별도 승인 후 Sandbox 준비 순서

1. 소유자가 계약·테스트 계정·콘솔 등록 상태를 확인한다. Apple의 Paid Apps Agreement, 세금/정산 정보, 소모성 상품 metadata와 bundle/IAP capability를 확인한다. 첫 IAP 제출은 새 앱 버전과 함께 처리하는 요구를 확인한다. 일반 App Store Connect API key가 아니라 In-App Purchase API key를 사용한다. **이번에는 계약 체결/키 발급/설정 변경 안 함.** [Apple 설정](https://developer.apple.com/help/app-store-connect/configure-in-app-purchase-settings/overview-for-configuring-in-app-purchases/), [IAP 키 생성](https://developer.apple.com/help/app-store-connect/configure-in-app-purchase-settings/generate-keys-for-in-app-purchases/).
2. Sandbox Apple Account와 개발 서명 앱으로 무과금 Sandbox를 준비한다. Xcode 로컬 StoreKit fixture는 실제 서버 Sandbox와 별개의 증거다. Google은 license tester와 내부 테스트 트랙을 준비한다. 내부 트랙만으로 무과금이라고 판단하지 않는다. [Apple Sandbox](https://developer.apple.com/help/app-store-connect/test-in-app-purchases/overview-of-testing-in-sandbox), [Google 테스트](https://developer.android.com/google/play/billing/test).
3. 비밀은 Doppler, projected file/권한·network·DB 환경 분리는 검토된 GitOps 변경으로 준비한다. 서버 검증 identity, 앱 identity, SKU와 offer를 대조한다. native Auth client scope 허용과 실제 사용자 로그인/잔액 조회부터 확인한다.
4. Apple App Store Connect → App information → App Store Server Notifications의 **Sandbox Server URL / V2**를 설정한다. 현재 ingress 대상은 `https://test-ggt-api.rvkang.app/payment/notifications/apple`이다. 콘솔에 실제 등록됐다는 증거는 없다. Sandbox URL을 비워두면 Production URL로 양 환경 알림이 전달될 수 있으므로 환경을 혼합하지 않는다. 이후 RequestTestNotification/GetTestNotificationStatus로 전달 상태를 검증한다. [Apple URL 설정](https://developer.apple.com/help/app-store-connect/configure-in-app-purchase-settings/enter-server-urls-for-app-store-server-notifications), [Server API](https://developer.apple.com/documentation/appstoreserverapi).
5. Google Cloud에서 Android Publisher API 사용과 Play Console Users & permissions의 앱 범위 권한 **View financial data, orders, and cancellation survey responses**, **Manage orders and subscriptions**를 확인한다. API scope는 `https://www.googleapis.com/auth/androidpublisher`. project Owner/Editor를 편의상 부여하지 않는다. [Publisher 권한 안내](https://developers.google.com/android-publisher/getting_started).
6. 실제 Pub/Sub topic/subscription 이름은 담당자가 정하고 Doppler/인프라 설정에 기록한다. 현재 이름이 확인되지 않아 만들어 기재하지 않는다. `google-play-developer-notifications@system.gserviceaccount.com`에 topic Publisher를 부여하고 Play의 one-time product/voided 알림 설정을 확인한다. push 대상은 `https://test-ggt-api.rvkang.app/payment/notifications/google`이고 OIDC audience와 서버 값이 일치해야 한다. **payload unwrapping은 끈다**: 현재 서버는 `message.messageId/data` envelope를 요구한다. [RTDN 준비](https://developer.android.com/google/play/billing/getting-ready#configure-rtdn), [Push subscription](https://docs.cloud.google.com/pubsub/docs/create-push-subscription).
7. push 인증 계정과 Play API 계정을 구분한다. Pub/Sub service agent `service-{PROJECT_NUMBER}@gcp-sa-pubsub.iam.gserviceaccount.com`의 토큰 생성 권한은 push 인증 SA에 제한하고, 설정자는 `iam.serviceAccounts.actAs`가 필요하다. push SA는 subscription 프로젝트와 맞춘다. OIDC issuer/audience/email/email_verified를 확인한다. [Pub/Sub push 인증](https://docs.cloud.google.com/pubsub/docs/authenticate-push-subscriptions).
8. 위 준비와 별도 활성화 승인이 끝난 플랫폼만 Sandbox flag와 앱 테스트 flag를 변경한다. 이 dispatch에서는 변경하지 않는다. test notification 수신·서명/인증 실패 거절·DB 저장 실패 재전송·중복 알림을 먼저 확인한 뒤 실제 Sandbox 구매/중단/재실행/재구매/환불을 검증한다. RTDN payload만 믿지 않고 Publisher API 상태를 다시 확인한다. 구매 확정 후 서버 지급 → Google consume/Apple finish 순서를 확인한다. [RTDN 구조](https://developer.android.com/google/play/billing/rtdn-reference), [Google 구매 처리](https://developer.android.com/google/play/billing/integrate).

Sandbox 합격 기준: 3 SKU 수량과 localized price 일치, pending/실패에는 지급 없음, 동일 proof/알림/기기 재시도 한 번 지급, server-confirm 이전 Apple finish 없음, Google 서버 consume 성공 및 재구매 가능, 환불/환불 취소 중복 회수·복원 없음, 사용 후 환불은 frozen/검토 상태, 오류 로그에 proof/토큰/PII 없음. Google 확정 구매의 consume/ack 처리 기한과 재시도를 감시한다. 실제 Sandbox 결과와 source/mock 결과를 따로 기록한다.

## 환불 대조와 운영 공백

Apple 알림 history는 Production 180일 / Sandbox 30일, Google voided purchases는 30일이다. 이 차이를 로컬 adapter와 worker 양쪽에 반영했다. 저장 cursor가 범위를 넘으면 체크포인트를 앞으로 넘겨 누락을 숨기지 않고 운영 검토를 요구한다. 최초 조회 28일, 겹침 1시간, 내구성 job/cursor·재시도를 유지한다. [Apple history 요청](https://developer.apple.com/documentation/appstoreserverapi/notificationhistoryrequest), [Google voided purchases](https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.voidedpurchases/list).

`refund_reconciliation_requires_review`, `refund_reconciliation_failed`, 반복 `jobs_retry_scheduled`, 미완료 consume 증가/최종 처리 지연을 운영 알림 대상으로 정해야 한다. 실제 알림 rule/담당자 통보 경로는 이번에 확인하지 못했다. 복구 범위를 넘긴 때는 스토어 기록과 구매 원장을 대조하여 승인된 운영 처리로 보충한다. proof나 사용자 정보를 로그로 덤프하지 않는다.

Apple `CONSUMPTION_REQUEST`에 응답하는 SendConsumptionInformation 흐름은 현재 구현되지 않았다. 수신/재검증 job을 처리하는 것과 사용 정보를 Apple에 전송하는 것은 다르다. 판매 활성화 전에 필요한 범위·사용자 동의/데이터 제공 정책·운영 책임을 정하고 구현/검증 여부를 기록한다. [Apple Server API](https://developer.apple.com/documentation/appstoreserverapi).

## 삭제·법정 보관·PII

Account 담당 확인: `DeleteUserCommand` 선언은 있으나 실제 삭제 handler/mutation이 없다. DELETION_REQUESTED에서 새 API/구매/token 접근 차단, 재가입 계정에 과거 wallet 자동 연결 금지는 **제안이며 구현된 보장이 아니다**.

Payment 별도 DB에 intent/purchase/wallet/ledger/job의 `user_id`, `account_token`, store 거래 식별자, 암호화 proof가 남는다. 완료 job도 중복 처리 방지용으로 보존한다. Account foreign key/cascade 삭제, TTL, Payment 삭제 hook/가명화가 없다. ULID/UUID와 암호화 proof도 재결합 가능한 정보이므로 자동으로 익명정보가 되지 않는다. Apple JWS에도 account token/거래 식별자가 포함될 수 있다.

법적 보관 범위를 소유자/법무가 확정해야 한다. 전자상거래법 시행령 제6조는 계약/청약철회 및 대금결제/재화 공급 기록 5년 등 보존을 규정하지만, 서비스/스토어의 역할과 필드별 필요성을 판단해야 하며 **모든 원본 proof를 5년 보관해야 한다는 결론이 아니다**. 불필요한 개인정보는 파기하고 법령상 보존분은 분리 관리한다. [시행령 제6조](https://www.law.go.kr/lsLinkCommonInfo.do?lsJoLnkSeq=1018638379), [개인정보보호법 제21조](https://law.go.kr/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1029335625).

후속 계약: 삭제 요청의 접근 차단 시점 → 필드별 보관 목적/기간/분리 보관·조회 권한 → 계정 연결 제거/가명화와 중복 거래 tombstone 유지 → 기간 만료 파기·증거 → 삭제/재가입/환불/재시도 테스트 순서. 미완료 작업·환불/중복 지급 방지 증거를 일괄 삭제하거나 암호화 키를 폐기하지 않는다. 보존 정책 승인 전 임의 cleanup을 구현하지 않았다.

## 수정 파일·검증 결과·인계

로컬 수정 파일:

- `packages/payment/.env.example`: 두 스토어 false를 안전한 기본 예시로 변경.
- `packages/payment/README.md`: 준비 보고서/환경 검사와 알림 보존 기간 안내.
- `packages/payment/src/payment/infrastructure/stores/apple-store.ts` 및 `.spec.ts`: Sandbox 30일 / Production 180일 분기와 경계 테스트.
- `packages/payment/src/payment/application/payment.service.ts` 및 새 `refund-reconciliation.spec.ts`: worker 동일 기간 적용, 범위 초과 cursor를 진행하지 않는 테스트.
- `scripts/payment-environment-preflight.mjs` 및 `.test.mjs`: secret 출력 없는 오프라인 검사와 redaction/flag/TLS/credential 검증.
- `docs/payment-mobile-release-readiness.md`: 본 보고서.

| 검증 명령                                                                                                         | 이번 결과                                                                 |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `node --test scripts/payment-environment-preflight.test.mjs`                                                      | 6/6 통과                                                                  |
| `pnpm --filter payment test --runInBand`                                                                          | 65 통과, PostgreSQL/HTTP 44 skip: 전용 `PAYMENT_TEST_DATABASE_URL` 미주입 |
| `pnpm --filter payment... build`                                                                                  | 의존 패키지 포함 성공                                                     |
| `pnpm --filter payment exec tsc -p tsconfig.spec.json --noEmit`                                                   | 성공                                                                      |
| `node --test scripts/payment-edge-contract.test.mjs`                                                              | 1/1 통과                                                                  |
| disabled preflight in live Payment Pod                                                                            | 16/16 통과; store API 호출 없음                                           |
| `doppler run --project gaegaeting --config stg -- node scripts/payment-environment-preflight.mjs --mode disabled` | 16/16 통과; 오프라인 환경 검사                                            |
| 수정 TS/JS/Markdown 파일 `prettier --check`, `git diff --check`                                                   | 성공                                                                      |

이전 2026-10-05의 전용 PostgreSQL 16.15 테스트 105개 통과는 과거 증거다. 이번 로컬 수정의 PostgreSQL/HTTP 재검증을 했다고 표현하지 않는다.

남은 작업 순서: **coordinator의 실제 native 로그인/잔액 조회와 삭제 정책 확정 → 앱 제출 조건/표시 검토 → 비활성 첫 출시 판단**. 그 이후 별도 승인으로 **스토어 계약·상품/권한/파일 projection → Sandbox 활성화·알림/구매/환불/복구 E2E → 모니터링·삭제/보관 구현 검증 → Production 판매 승인**. 이번 준비 완료는 이 승인이나 실제 출시를 대신하지 않는다.

롤백 조건: 미인증 조회 허용, disabled에서 SDK 호출/구매 가능 표시, 검증 전 지급/finish, 중복 지급, 잘못된 금액 표시, proof/PII 노출, 알림 대조 누락/consume backlog이면 출시/판매 판단을 중단한다. 향후 판매 중단은 승인된 app/server flag 변경으로 새 구매부터 차단하되 기존 DB·proof 키·미완료 job·정산/환불 처리 경로를 보존한다. worker·consume을 무조건 함께 꺼서 확정 거래를 방치하지 않는다. 로컬 변경을 되돌려도 기존 거래/키를 삭제하지 않으며 인증 우회나 잘못된 환경 혼합으로 복구하지 않는다. 현재 상태는 계속 양 스토어 false다.
