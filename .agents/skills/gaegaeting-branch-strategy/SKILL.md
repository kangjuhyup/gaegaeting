---
name: gaegaeting-branch-strategy
description: Gaegaeting에서 작업 브랜치 생성, 도메인별 dev·release 흐름, core 공통 코드 통합, main squash 릴리즈를 계획하거나 수행할 때 사용한다. 일반 코드 수정만으로 브랜치 변경이나 배포를 시작하지 않는다.
---

# Gaegaeting 브랜치 전략

GitHub에서 강제할 PR 조합과 적용 절차는 [브랜치 머지 규칙](../../../docs/branch-policy.md)을 따른다. 활성화 여부는 원격 Ruleset에서 확인하며, 스킬이나 로컬 설정 파일의 존재만으로 차단이 적용됐다고 판단하지 않는다.

## 브랜치와 배포 단위

| 용도 | 이름 | 역할 |
| --- | --- | --- |
| 개발 작업 | `<type>/<domain>/<description>` | 해당 도메인의 작업과 리뷰 |
| 개발 통합 | `dev/<domain>` | 해당 도메인의 개발 배포 기준 |
| 릴리즈 검증 | `release/<domain>/<version>` | 운영 배포 전 테스트 배포 기준 |
| 운영 기준 | `main` | 검증한 release를 반드시 squash로 병합 |

- type은 `feat`, `fix` 및 작업에 맞는 `refactor`, `chore`, `docs`, `test`를 사용한다.
- domain은 `account`, `match`, `gateway`, 공통 라이브러리는 `core`를 사용한다. 새 도메인은 실제 프로젝트 구조를 확인한다.
- description은 짧은 kebab-case, version은 `1.2.0` 같은 형식을 사용한다.
- 예: `feat/account/profile-image`, `fix/core/transaction-boundary`, `release/account/1.2.0`.
- 인프라와 배포 실행 설정은 별도 저장소가 관리한다. 이 규칙을 작성하거나 브랜치를 만드는 것만으로 자동 배포가 설정되지는 않는다.

## 도메인 작업과 릴리즈

1. 작업 브랜치는 해당 `dev/<domain>`에서 분기하고 같은 dev를 대상으로 PR을 만든다. dev가 처음 필요하면 main을 기준으로 생성한다.
2. dev에서 도메인 변경을 통합하고 개발 환경에서 검증한다. 다른 도메인의 미출시 작업을 dev 간 직접 병합으로 가져오지 않는다.
3. 검증할 dev 커밋에서 `release/<domain>/<version>`을 생성한다. release에는 배포 차단 버그 수정만 반영하고 해당 수정을 dev에도 전달한다.
4. release의 테스트 배포를 검증한 뒤 main 대상 PR의 전체 diff를 확인한다. Git 브랜치는 저장소 전체 스냅샷이므로 브랜치 이름이 도메인별 변경을 격리해 주지는 않는다.
5. 최신 main을 release에 반영하고 충돌을 해결한다. 다른 릴리즈가 먼저 병합되면 변경된 후보를 다시 검증한다. 해당 서비스와 변경된 공통 코드의 소비 서비스에 필요한 검증을 수행한다.
6. **release → main은 예외 없이 squash merge한다.** 일반 merge commit이나 rebase merge로 대체하지 않는다. 권장 제목은 `release(account): 1.2.0`이다.
7. 운영 산출물은 병합 후 main의 정확한 커밋을 기준으로 식별·검증한다. 태그를 사용할 때는 그 squash 커밋에 `account/v1.2.0`처럼 도메인별로 붙인다. 별도 인프라 저장소에는 대상 도메인, 버전, 커밋 및 산출물 식별자를 전달한다.
8. main을 해당 dev에 일반 merge로 동기화한다. squash는 기존 dev 커밋의 조상 관계를 보존하지 않으므로 다음 release의 실제 diff를 확인한다. 진행 중 작업이 있는 공유 dev를 reset하거나 강제 push하지 않는다. 릴리즈 후속 작업이 끝나면 release 브랜치를 정리한다.

main 병합으로 모든 서비스를 일괄 배포한다고 가정하지 않는다. 서비스별 운영 버전과 커밋을 구분한다. PR 병합·태그·push·배포·브랜치 삭제는 현재 사용자가 요청한 범위에서만 수행한다.

## Core 공통 코드

`packages/core`는 공통 라이브러리이며 독립 서버 배포 대상이 아니다.

```text
feat/core/<description> 또는 fix/core/<description>
  → dev/core
  → 소비 서비스 검증
```

- dev/core에서는 변경한 패키지와 전이 의존성을 포함한 소비 서비스의 빌드·테스트를 확인한다. 인증·DB 등 서비스 경계를 건드리면 해당 통합 검증도 포함한다.
- 현재 workspace 의존성을 사용하는 동안 별도 npm 게시나 패키지 버전 체계 도입을 전제하지 않는다.
- core 변경마다 main에 반영할 릴리즈 경로를 하나 정하고 PR에 기록한다. 다음 두 경로로 동일 변경을 중복 출시하지 않는다.

### 특정 서비스와 함께 출시하는 작은 변경

검증한 core 변경만 해당 `dev/<domain>`에서 분기한 도메인 작업 브랜치로 가져와 PR을 만들고 도메인 release에 포함한다. dev/core 전체를 소비 도메인 dev에 직접 병합하지 않는다. main에 반영된 뒤 main을 dev/core와 다른 소비 도메인의 dev에 동기화한다.

예: account가 먼저 필요한 호환 가능한 공통 유틸리티 추가는 account 릴리즈가 그 변경의 main 반영을 담당한다.

### 여러 서비스에 영향을 주는 공통 변경

```text
dev/core → release/core/<version> → main (squash)
                                      ↓
                              dev/<소비 도메인>
                                      ↓
                           각 도메인 release → main (squash)
```

release/core는 영향을 받는 서비스 조합으로 검증한다. main 병합은 공통 코드의 확정이며 서비스 운영 배포를 의미하지 않는다. 필요하면 `core/v1.2.0`으로 코드 기준을 식별한다. 서비스는 main의 공통 코드를 가져온 뒤 각자 릴리즈하고 배포한다.

하위 호환성이 깨지는 변경은 `새 API 추가 → 소비 서비스 전환·배포 → 구 API 제거`로 나눈다. 아직 전환하지 않은 서비스가 있는 동안 기존 계약을 제거하지 않는다.

## 실제 작업 시 확인

- 현재 브랜치·upstream·작업 트리와 사용자가 요청한 도메인 및 작업 범위를 확인한다. 기존 변경을 임의로 옮기거나 폐기하지 않는다.
- 작업 시작 요청에는 작업 브랜치까지, 릴리즈 계획 요청에는 계획까지 수행한다. 이 스킬 호출 자체는 원격 변경이나 배포 권한을 추가하지 않는다.
- 릴리즈에서는 변경 도메인, 포함된 core 변경의 출시 담당 경로, 검증 결과, 대상 커밋을 보고한다. 실행하지 않은 배포나 원격 보호 규칙을 적용했다고 보고하지 않는다.
