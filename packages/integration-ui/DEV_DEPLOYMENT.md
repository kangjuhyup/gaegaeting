# 개발 API 실제 배포

## 2026-10-07 최신 반영 상태

이 절이 아래 2026-10-06 기록보다 우선한다. 사용자가 GitHub 기본 runner 전환과 Doppler 저장을 승인한 뒤 기존 k3s 담당자와 검토하고 실제 개발 배포를 완료했다.

- Auth PR39: 9개 job을 ubuntu-24.04로 전환. 공식 Release37573245396 성공, 서버1781 tests pass/24 skip, v0.3.2 service/UI/worker와 새 migration 실제 Ready/Complete. 기존 offline queued run은 취소했다.
- `gaegaeting-dev`의 공개 native `gaegaeting-mobile` 등록 완료. PKCE S256, client secret 없음, 기존 web client/다른 tenant 보존. 두 합성 QA의 실제 원격 UI→native callback→PKCE→ID token 검증·8 API scope introspection·refresh 성공. Android0.1.0+4 AppAuth 실제 동의/콜백/서버 프로필·강아지 표시 및 앱 재시작 세션 복원도 확인했다.
- 사용자 별도 승인으로 개발 QA subject mapping 정확히2건 생성(changed2). 기존 사용자 변경0, 본인인증 성공/정상 가입 증거를 만들지 않았다. 두 QA의 profile/pet은 이후 실제 authenticated Gateway로 생성했다.
- Chat PR27/29/30/31: Doppler `gaegaeting/stg`의 새 Chat 전용 credential, 제한 DB/role, TLS 및 타8 DB 로그인 거절 확인 후 migration2/serving/HTTP·WS 연결 반영. 전체10 dev Deployment Ready. aggregate Argo의 잔존 구 Job OutOfSync와 신규 workload 성공은 구분한다.
- 실제 live5 subgraphs와 배포 Gateway dependency로 새로 합성한 앱75문서:75 valid/0 invalid/0 unavailable. 이것은 public 사용자75건 모두 실행 성공이나 실행 중 Gateway 메모리 조회가 아니다.
- 실제 두 native Bearer의 Account/Match/Chat/Challenge 조회 및 Payment wallet/history 성공. Challenge 참여·동일 requestId 재시도·상세·외부 소유자 거절·취소 확인. Apple/Google은 runtime false이며 상품 조회 STORE_UNAVAILABLE은 의도된 비활성 응답이다.

실제 검사에서 Account 프로필 수정의 ORM enum 오류와 Chat 재동기화/WS 인증 문제를 발견했다. Account 담당 PR190/191 core1.0.14 및 GitOps33 실제Ready·QA14검사 통과, Chat의 retained loopback MATCH_SERVICE_HOST는 k3s 담당 리뷰 후 기존 Doppler 값을 교정하고 PR32로 Chat만 GitOps rollout하여 실제 동기화를 확인했다. Gateway direct/WS의 issuer 기반 subject lookup은 core1.0.15 공식 release 및 GitOps PR34(e0cfe415)로 교정·반영했다. 실제 Gateway Ready, 다른9 서비스 이미지와 완료6 Job UID/image 보존, QA2 WebSocket ack/보호 구독 및 Android 상대 메시지 실시간 수신·자동 읽음 반영을 확인했다. 공개 introspection 기준 앱75문서 모두 유효하며 전부 사용자 E2E 실행했다는 뜻은 아니다.

안전한 runtime 저장 위치: `gaegaeting/stg`의 `CHAT_DATABASE_NAME`, `CHAT_DATABASE_USERNAME`, `CHAT_DATABASE_PASSWORD`, `CHAT_SERVICE_API_PORT`, `MATCH_SERVICE_HOST`, `CHAT_KAFKA_ENABLED`, `CHAT_KAFKA_GROUP_ID`, `CHAT_SERVICE_URL`, `CHAT_WS_ALLOWED_ORIGINS`. 기존 Auth 관리자 설정은 `auth/prd`이며 값은 source/public define/log/argv/공개 결과에 넣지 않는다. QA 자료는 기존 보호 journal0600/부모0700에만 유지한다.

[최신 배포·검증 보고서](/Users/kangjuhyup/.codex/artifacts/gaegaeting-flutter/native-chat-dev-20261007/deployment-report.md) · [동료용 APK](INTERNAL_DISTRIBUTION.md)

Chat PR32 실제 Argo 반영 후 공개 native Bearer `syncChatRooms`가 HTTP200/GraphQL 오류없음으로 성공했다. Chat 기존 image/migrationUID/타9 template를 보존했다. 에뮬레이터 실제 자유 산책 시작과 GPS22점/일시정지 서버 상태도 확인했다(virtual GPS, 실기기 증거 아님).


추가 실제 시험: 같은 좌표로 복구하던 지도 camera fit의 무한 확대를 상한으로 교정하고 2개 UI 회귀를 추가했다. 새 APK에서 복구→구간1 GPS 추가→종료(FINISHED31점)→나만 보기 일기 저장을 확인했다. QA2명 간 관심/수락/방 생성/메시지 동일ID 재시도/읽음과 별도 인증 없는 사진 PUT/검증/조회/새 미사용 사진 정리를 실제 공개 개발 API로 확인했다. 장시간 background·실기기·iOS 및 사진 선택기의 앱 변환 E2E는 별도 미검증이다.

## 2026-10-06 당시 기록

아래 차단 사유는 당시 상태이며 위 최신 결과로 해소된 항목을 현재 미완료로 해석하지 않는다.

2026-10-06 사용자 지시로 기존 담당자가 개발 API의 source 통합·이미지 발행·GitOps rollout을 진행한다. 이전 위임은 구현·검증·배포 준비 범위였으므로 준비한 변경은 서버에 내보내지 않았다. 이번에는 실제 개발 반영이 승인되었으며, 운영 Gaegaeting·스토어 활성화·유료 구매·신규 키 발급은 제외한다.

## 확인된 상태

| 담당 | 실제 결과 | 남은 작업 |
| --- | --- | --- |
| Challenge | 최신 core1.0.11, Ready1·migration 성공·35/35 live SDL 문서 유효 | 정상 native 사용자·GPS/사진 E2E |
| Payment | Payment1.0.0 실제 dev rollout, Ready1·health200·Argo Synced/Healthy·109/109 tests·기존 키/migration 보존·양 스토어 false | native Bearer 조회·별도 승인 스토어 시험 |
| Match | Match1.0.4 실제 dev rollout, 새7 root·앱11개 문서 유효·기존 다른8 workload/4 migration 보존 | native 사용자 mutation·소유자 거절 E2E |
| Gateway | core1.0.12 실제 dev rollout·Ready1·public health200/미인증401/위조401/WS403 | 정상 native 사용자 resolver·Chat 연결 |
| Account/UI | core1.0.13 PR188 main `ea4d9c5c210b543ba8e6893ca4a0b337cc0c1f4f`. 공식 이미지 검증·GitOps PR26 반영, 새 Account/UI Ready1·updated1·new migration Complete1을 coordinator가 독립 확인. 담당자 health200·Account17/17 SDL·public401/위조401·UI 가용성 확인 | native QA·프로필 연결된 시험 계정 |
| Auth | native URI 최소 수정 PR38 main 반영. 전체1781/집중70 tests, 24 skipped, scanner 통과 | 공식0.3.2 workflow queued: 기존 self-hosted runner offline. 이후 GitOps·dev native 등록 |
| Chat | core1.0.12 소스 main·dev 동기화/공식 multiarch image 검증 완료. 실제 local PG/Kafka/GraphQL15개 ULID 계약 통과 | 전용 DB credential 부재: migration/serving/Gateway URL/WS 미배포 |

Match source는 `e63169712e594183335bc79016c16b5dbd2b8905`, index digest는 `sha256:b25d15763216a78571cc49c28f72ca55d2dc087a6c376d222012c529b256dbf0`, GitOps PR24 revision은 `8f3d149d2c25b39a3776cbcdfa6290237955af98`다.

Gateway/Chat source는 `6aee44544e7db298be6ac756b7083a6214344e50`이다. Gateway index는 `sha256:212f126afabf44dc609afa9eeefd620c6a09092c369b492fde4fd84efcdd4715`, GitOps PR25 revision은 `58b0de1d5c762814c4ae82ea9e5a3a1ac0b5f85d`다. Chat index `sha256:db5e36ac0707088c6da37e015ed796c82dea6a18b6d1f7a0597304a84cc9fac2`는 registry 검증까지이며 dev 실행 증거는 없다.

현재 live subgraph SDL 및 배포 Gateway 패키지로 새로 합성한 결과는 앱75문서 중68valid/0invalid/7Chat unavailable다. 실행 중 Gateway 메모리 또는 public authenticated introspection을 직접 조회한 결과가 아니다.

75개 전체 문서 유효 결과는 로컬 새 소스 composition이며 배포된 Gateway 검증이 아니다. 실제 배포 contract 결과와 별도로 집계한다.

Payment serving digest는 `sha256:53822d4f371fa03e23755dbad60f7ba1c7da922ad48814913ace24a7ff9df48a`, GitOps revision은 `03aeb7689c8b11966b2fff2481f0f9dd8a192278`다. 새 실행 image 검증과 서버 내부 합성 조회를 정상 native Bearer 호출로 간주하지 않는다.

Account/UI index는 각각 `sha256:77f8843f7e05bb5957fe00d2fbcdcff72950f515acd871130531225f9cf5fdf1`, `sha256:bd0be17a34a615a3d3b5d37ae33b7428450fc758a8baa145d1675d016833802a`다. 현재 dev Argo revision은 `0a6bcba42f2c11949982bc2d23de86bca3fa9182`, operation Succeeded / health Healthy / sync OutOfSync다. 이전 완료 Job `account-migration-dd302efac42a`의 prune 잔존을 확인했으며 삭제·수동sync·RBAC/credential 변경은 하지 않았다. 새 `account-migration-ea4d9c5c210b`는 Complete1이고 전체9 deployments는 Ready/updated1이다. 이 결과를 전체 Argo Synced로 표시하지 않는다. 독립 readonly 증거는 공개 artifact의 `live-root-final.json`이다.

위 표는 최종 담당 보고서와 coordinator 독립 조회를 함께 검토한 결과다. Challenge·Payment·Match·Gateway·Account/UI의 실제 실행 이미지·migration·health·SDL을 확인했으며, Auth 공식 이미지/native 등록과 Chat serving은 미완료다. Account·Match/Chat/Gateway 담당은 이 외부 선행조건을 전체목표의 failed 결과로 보고했고 실제 완료된 개발 배포와 구분해 수락했다. 기존 담당 터미널은 모두 보존했다. Auth API는 공용 서비스지만 native 등록은 `gaegaeting-dev` tenant의 `gaegaeting-mobile`만 대상으로 하고 기존 Vote/web·다른 tenant·키·세션은 보존한다.

Auth 담당은 sandbox의 GitHub DNS/Docker socket/Orca IPC EPERM 때문에 source handoff 후 작업을 종료했다. 기존 터미널을 보존하고 Flutter coordinator의 unrestricted 터미널에서 최신 main에 패치를 이관해 PR/공식release 요청을 수행했다. 소스 원본의 세 미커밋 파일은 보존했다. [Auth PR38](https://github.com/kangjuhyup/auth/pull/38), [공식 발행 workflow](https://github.com/kangjuhyup/auth/actions/runs/37417616355).

Auth의 기존 v0.3.1 service/UI/worker는 Ready1이고 최신migration도 성공했다. Argo Application의 aggregate OutOfSync/Degraded는 보존된 구 migration Job들의 prune 필요 상태를 포함한다. 최신 앱 Ready를 전체 Argo Healthy로 보고하지 않으며, 구 Job이나 키를 임의 삭제하지 않는다.

## 남은 외부 입력과 안전한 위치

기존 Auth runner `jhkangui-Macmini`의 실행/관리 경로가 필요하다. 현재 작업 호스트와 다르며 새 runner 등록·토큰 발급으로 우회하지 않는다. Chat DB 전용 credential은 Doppler `gaegaeting/dev`, `dev_personal`, `stg`의 이름 조회에서 발견되지 않았다. 기존 승인된 Chat 보안 설정 경로가 있으면 해당 위치를 사용한다. 다른 서비스 password를 재사용하거나 DB 권한을 확장하지 않는다.

Runtime 보안 설정은 기존 Doppler `gaegaeting/stg`, Auth 관리자 credential은 기존 `auth/prd`를 사용한다. 값은 메모리/STDIN으로만 주입하며 공개 앱 define에는 issuer/client/resource 등 비밀이 아닌 값만 둔다. Chat은 `CHAT_DATABASE_NAME`, `CHAT_DATABASE_USERNAME`, `CHAT_DATABASE_PASSWORD`의 기존 승인 저장 위치 또는 신규 dev 발급 승인이 필요하다.

두 합성 QA 사용자 credential과 사용자 Bearer는 접근제한0600 임시 파일/기존 승인 저장소에만 둔다. 값은 source·앱 define·명령 인자·메일·일반 artifact에 넣지 않는다. Account runtime의 기존 development/mockEnabled=true 설정은 보존됐으며 이번 배포에서 활성화하거나 변경하지 않았다. 실제 본인인증 provider 검증·정상 native 가입 성공 증거는 없다. 개발 mock 결과를 실제 본인인증 성공으로 표시하지 않는다.

Account 담당자가 승인된 `gaegaeting-dev` 합성 QA 사용자 두 명을 생성하고 관리자 세션 종료를 확인했다. private file0600/상위 directory0700와 synthetic/tenant/count를 검증했다. native 로그인·profile/pet 준비는 아직 미완료다. Auth subject는 내부 Account ULID가 아니며 기존 subject mapping이 없으면 Gateway 진입은404다. 정상 가입 provider/mock을 임의 활성화하지 않았다. 정확히 QA2명의 새 mapping만 생성하는 repository maintenance 제안·guard13개/로컬PG2개/READ ONLY changed0 검증을 준비했으나 live plan/write는 미실행이다. 기존 연결된 QA 보안 설정이나 별도 linking 승인 및 native 로그인 검증이 선행한다. 공개 native client를 사용하는 서버 PKCE QA와 Android AppAuth/보안 저장소 실제 기기 증거는 각각 구분해 기록한다.

## 앱과 검증 근거

2026-10-06 후속 사용자 지시로 기존 k3s 담당 세션을 재개해 협의했다. 담당자는 runner 관리 접속/설치 경로와 기존 연결 QA 저장 위치를 찾지 못했고, Chat 전용 dev DB·제한 role·Doppler `gaegaeting/stg` 보관안을 정리했다. 해당 세션의 네트워크/IPC 제한 때문에 Flutter 담당자가 제안된 읽기 전용 조회를 실행했다. GitHub의 Auth queued/offline runner, 실제 dev9 Ready/5 migration Complete/Argo Healthy·OutOfSync를 재확인했고, 세 Doppler config에서 Chat 키 이름 부재도 재확인했다. 신규 credential·QA mapping·runner 변경은 실행하지 않았다. [k3s 협의 결과](/Users/kangjuhyup/.codex/artifacts/gaegaeting-flutter/internal-distribution-20261006/k3s-deployment-discussion.md)와 같은 경로의 `k3s-consult-extended-readonly.json`에 근거를 보관한다.

- [동료용 APK와 설치 안내](INTERNAL_DISTRIBUTION.md)
- [이전 실제 device API 인증 경계·75개 계약 확인](DEV_API_VERIFICATION.md)
- [Challenge 실제 개발 배포 확인](../../../챌린지논의/docs/challenge-dev-api-deployment-verification.md)
- [Match/Gateway 실제 배포·Chat 차단·15개 실제 local 계약](/Users/kangjuhyup/.codex/artifacts/gaegaeting-dev-deploy-20261006-match-chat-gateway/deployment-report.md)
- [Account/UI 실제 배포·마이그레이션·검증 결과](../../../어카운트/docs/account-dev-deployment-2026-10-06.md)
- [QA mapping 제안 — 미실행](../../../어카운트/docs/account-qa-fixture-linking-proposal.md)
- [Payment 실제 rollout·이미지·109개 테스트·보존 검증](https://github.com/kangjuhyup/k3s/blob/main/gitops/clusters/oci-a1/gaegaeting-dev/payment-refund-history-rollout.md)

APK 준비 완료와 전체 API E2E 완료는 구분한다. 현재 실제 native 로그인·mutation·사진/GPS·WebSocket·스토어 구매의 통합 성공을 주장하지 않는다. 공개 결과는 민감값을 제외해 `/Users/kangjuhyup/.codex/artifacts/gaegaeting-flutter/internal-distribution-20261006/`에 보관한다.
