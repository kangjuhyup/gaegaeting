# 브랜치 머지 규칙

## 적용 상태

기본 브랜치는 `main`을 사용한다. 초기 기준은 `infra/feat/auth-service-app`의 작업 내용이며, 인프라 분리·DB 부팅 수정·브랜치 검사 워크플로를 함께 포함한다. 이후에는 이 문서의 도메인별 PR 흐름을 따른다.

GitHub에는 두 Ruleset을 active로 등록했다. [main squash 규칙](https://github.com/kangjuhyup/gaegaeting/rules/22536637)과 [통합 브랜치 규칙](https://github.com/kangjuhyup/gaegaeting/rules/22536639)이 main/dev/release 이름에 적용된다.

검사 결과는 PR의 `branch-policy` 체크에서 확인한다. 규칙을 변경하면 허용·거부 PR에서 실제 차단 상태까지 검증한다.

스킬은 작업 절차를 안내한다. 실제 GitHub 머지 차단은 다음 두 요소를 함께 적용해야 동작한다.

- [워크플로](../.github/workflows/branch-policy.yml): PR의 출발·대상 브랜치를 검사한다. 변경 파일 필터 없이 PR 생성, 커밋 추가, 재개, 대상 수정 시 실행한다.
- [통합 Ruleset](../.github/rulesets/integration.json): main, dev, release에 PR과 GitHub Actions의 `branch-policy` 성공을 요구하며 직접 push·강제 push를 막는다.
- [main Ruleset](../.github/rulesets/main.json): main에 squash만 허용하고 삭제를 막는다. dev와 release는 main 동기화를 위해 일반 merge를 사용할 수 있다.

두 Ruleset에 우회 주체를 등록하지 않는다. 관리자가 규칙 자체를 수정하는 권한까지 없애는 설정은 아니다. 필수 승인 수는 현재 0이며, 팀 리뷰 인원 정책은 별도로 정한다.

## 허용하는 PR

| 출발 | 대상 | 용도 |
| --- | --- | --- |
| `<type>/<domain>/<description>` | `dev/<같은 domain>` | 작업 통합 |
| `release/<domain>/<version>` | `main` | squash 릴리즈 |
| `fix/<domain>/<description>` | `release/<같은 domain>/<version>` | 배포 차단 버그 수정 |
| `release/<domain>/<version>` | `dev/<같은 domain>` | 릴리즈 수정 역반영 |
| `main` | `dev/<domain>` 또는 `release/<domain>/<version>` | 최신 main 동기화 |

나머지 조합은 거부한다. release는 dev의 특정 커밋에서 **브랜치를 생성**하며, dev에서 기존 release로 계속 PR을 병합하지 않는다.

도메인은 `account`, `match`, `gateway`, `core`이다. 작업 유형은 `feat`, `fix`, `refactor`, `chore`, `docs`, `test`이며 작업 설명은 kebab-case이다. 릴리즈 브랜치 버전은 `1.2.0` 형식만 허용한다. `v` 접두사와 `-rc.1` 등은 브랜치 이름에 사용하지 않는다.

core도 같은 규칙을 따른다. 특정 서비스와 함께 출시할 core 변경은 대상 `dev/<domain>`에서 만든 작업 브랜치로 필요한 커밋을 가져와 PR을 만든다. dev/core를 다른 도메인 dev에 직접 병합하지 않는다. 공통 릴리즈는 `release/core/<version> → main`을 사용한다.

fork의 `main`이나 `release/...`를 내부 통합 브랜치로 취급하지 않는다. 외부 기여를 반영할 때는 검토한 변경을 저장소 내부의 도메인 작업 브랜치로 가져온다.

이 검사는 브랜치 이름과 PR 조합을 강제한다. 브랜치가 실제로 어느 커밋에서 처음 분기했는지, 변경 파일이 해당 도메인에만 속하는지, 배포 테스트를 통과했는지는 별도 검증 대상이다.

## 활성화 순서

1. 초기 main 전환과 이후 PR 흐름을 구분한다. 초기 전환은 작업 브랜치의 내용을 보존하고, 다른 브랜치를 삭제하기 전에 복구 가능한 백업을 만든다. 이후 레거시 이름의 브랜치에서 main으로 여는 PR은 차단한다.
2. 워크플로, `.github/scripts/branch-policy.cjs`, `.nvmrc`를 기본 브랜치와 PR 대상 브랜치에 먼저 게시한다. 신규 dev/release는 이 설정을 포함한 커밋에서 생성한다. 대상 코드만 checkout하는 `pull_request_target`이므로 PR에서 검사 코드를 바꿔 해당 PR의 검사를 무력화하지 않는다.
3. 허용·거부 PR에서 `branch-policy` 체크의 성공·실패가 PR에 연결되는지 GitHub에서 확인한다. 로컬 테스트 성공을 원격 차단 검증으로 대신하지 않는다.
4. 기존 Ruleset을 다시 조회하고 같은 이름이 있으면 해당 ID를 업데이트한다. 이 저장소에는 이미 등록됐으므로 아래 PUT 명령을 사용한다. 파일을 수정하는 것만으로 원격 규칙이 업데이트되지는 않는다.

```sh
gh api --method PUT repos/kangjuhyup/gaegaeting/rulesets/22536639 --input .github/rulesets/integration.json
gh api --method PUT repos/kangjuhyup/gaegaeting/rulesets/22536637 --input .github/rulesets/main.json
```

5. main/dev/release에 적용된 규칙과 실제 PR의 차단 상태를 확인한다. main에는 squash만, dev에는 일반 merge가 가능한지 확인한다. 운영 배포나 기존 작업의 일괄 머지는 수행하지 않는다.

새 dev/release는 반드시 검사 워크플로와 스크립트를 포함한 커밋으로 시작한다. 검사 코드 없이 생성하면 정상 PR도 필수 검사를 통과할 수 없다. 배포 워크플로와 인프라 설정은 별도 저장소에서 관리한다.

## 검증

저장소의 `.nvmrc`로 Node를 활성화한 뒤 실행한다. 의존성 설치는 필요 없다.

```sh
node --test scripts/branch-policy.test.mjs
git diff --check
```

참고: [GitHub Ruleset API](https://docs.github.com/en/rest/repos/rules), [pull_request_target 이벤트](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request_target).
