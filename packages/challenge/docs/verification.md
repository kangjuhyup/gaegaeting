# 산책·코스·일기 백엔드 검증 기록

2026-10-05, Node 24.13.1 / pnpm 10.34.5 / TypeScript 5.8.3. 임시 로컬 PostgreSQL 16 DB에서 실행했으며 운영 DB·계정·버킷을 변경하지 않았다.

| 검증 | 명령/방법 | 결과 |
| --- | --- | --- |
| 전체 workspace 빌드 | `pnpm build:workspaces` | exit 0 |
| 최종 Challenge 빌드 | `pnpm --filter challenge build` | exit 0 |
| 테스트 포함 타입 검사 | `pnpm --filter challenge exec tsc -p tsconfig.spec.json --noEmit` | exit 0 |
| Challenge 전체 | 아래 DB 환경변수 + `pnpm --filter challenge test --runInBand` | exit 0, 6개 suite / **96개 통과**, 건너뛴 테스트 없음 |
| 전체 workspace 기본 회귀 | `pnpm test:workspaces` | exit 0. 별도 외부 DB가 필요한 Account/Match 테스트는 기본 설정대로 skip. Challenge DB 테스트는 위에서 별도 수행 |
| 루트 계약/스크립트 | `node --test scripts/*.test.mjs` | exit 0, 84개 통과 |
| 기존 UI 계약 | `pnpm test:ui` | exit 0, 14개 통과. 이번 작업에서 앱 UI를 변경하지 않음 |
| Challenge 포맷 | `pnpm --filter challenge format` | exit 0 |
| 변경 whitespace | `git diff --check` | exit 0 |
| 배포 의존성 패키지 | `pnpm --filter challenge deploy --legacy --prod <임시 디렉터리>` | exit 0 |
| 배포 패키지 실제 기동 | 개발 의존성이 없는 위 디렉터리에서 AppModule 기동, 임시 PostgreSQL 연결 | 마이그레이션 재실행, health, 인증 GraphQL, Federation SDL, 저장한 schema.graphql과의 일치 통과 |

통합 테스트 환경은 `CHALLENGE_INTEGRATION_TESTS=1`, `DATABASE_HOST=127.0.0.1`, 임시 공개 포트, `DATABASE_USERNAME=challenge_test`, `DATABASE_PASSWORD=challenge_test`, `DATABASE_NAME=challenge_test_walking`을 사용했다. 테스트는 전용 DB 데이터를 지우므로 공유 DB에 실행하지 않는다. CI에서도 기존 Challenge API 테스트와 새 Walking API 테스트를 실행하도록 연결했다.

## 정책 및 경계별 증거

- [챌린지 정책 31개](../test/challenge-policy.spec.ts): 한국 날짜 기간·유예·중복·수정/삭제·보상 판정.
- [GPS 정책 13개](../test/walking-geometry.spec.ts): 편도/순환 정방향 완주, 역방향·일부 반복·단절·과속·정지 경계·낮은 정확도 제외, 공개 구간만 반환, 밀집 샘플과 1초 간격 작은 걸음, 제자리 흔들림, 날짜 변경선.
- [사진 6개](../test/walking-photo.spec.ts): 실제 PNG 디코딩, 픽셀 유지와 텍스트/gamma 메타데이터 제거, 위장·잘림·크기·해상도·CRC 오류 거부.
- [Account 경계 4개](../test/walking-account.spec.ts): 실제 로컬 HTTP 서버에 최소 account:read assertion 전달, 보호자 신원 보존·관리자 역할 제외, 프로필 없음/신원 불일치/Account 오류 거부.
- [기존 인증 API 21개](../test/challenge-api.integration.spec.ts): 실제 PostgreSQL·서명 인증·동시 참여·실적 수신·삭제·탈퇴·마이그레이션 재실행.
- [원본 기능 API 21개](../test/walking-api.integration.spec.ts): 산책 중복 시작·배치/종료 재시도, 반려견 소유권, GPS/일기 비공개 경계, 승인·검토 버전·관리자 권한·주변 검색·저장/신고·중단, 실제 산책의 챌린지/여권 자동 반영, 원본/실적 롤백, 일기 최신 후기·버전, 사진 확정/불변성·실적 회수·정리 재시도, 산책 삭제와 탈퇴, 사진 확정 중 탈퇴, 저장소 설정 오류의 503 보존.

GPS 배치와 코스 생성의 재전송 비교에서 PostgreSQL JSON 키 순서가 바뀌는 문제를 수정하고 재전송 테스트로 확인했다. 사진 테스트 준비 단계의 큰 Buffer를 Jest 파라미터 객체로 넘겨 실행기가 종료되던 문제는 테스트 데이터를 지연 생성하도록 수정했다. 최종 실행은 런타임 변경이나 검증 우회 플래그 없이 통과했다. 공통 HTTP 로그의 내부 인증 assertion 헤더 비노출도 추가하고 기존 로거 테스트 및 전체 회귀를 통과했다.

## 실제 환경에서 이어서 확인할 항목

- Flutter의 지도·백그라운드 GPS·권한 철회·오프라인 큐·기기 시각·배터리·사진 변환 UI. 현재 검증은 서버가 받은 좌표의 일관성 판정이며 단말 GPS 진위 검증은 아니다.
- 운영 S3 호환 버킷의 비공개 정책, 자격증명, 실제 PUT/GET/삭제와 URL 만료, 필요 시 Flutter web CORS. 이번 사진 API 테스트는 저장소 테스트 어댑터를 사용했다. 공통 Storage의 스냅샷 읽기·쓰기 회귀는 전체 workspace 테스트에서 수행했다.
- 실제 Account 배포와의 네트워크 연결·Auth scope 설정, Account 탈퇴 확정 작업에서 내부 삭제 API 호출. Account의 전체 탈퇴 워크플로는 이번 변경 범위 밖이다.
- Docker 이미지 빌드·운영 마이그레이션/배포는 실행하지 않았다. 이번 기동 확인은 production 의존성만 포함한 로컬 패키지다.

[Flutter 연동 계약](flutter-integration.md)과 [서비스 README](../README.md)에 필요한 API·운영 설정을 정리했다.
