# ![개개팅 로고](./docs/logo.png) 개개팅

개개팅 애플리케이션과 공통 모듈을 관리하는 pnpm workspace입니다. 인프라와 중앙 인증 서비스의 배포·운영은 별도 저장소에서 관리합니다.

## 시작하기

Node는 `.nvmrc`의 **24.13.1**, pnpm은 `package.json`의 **10.34.5**를 사용합니다.

```bash
nvm use
corepack enable
pnpm install --frozen-lockfile
```

외부에서 PostgreSQL, Redis, Kafka와 OIDC 인증 서비스를 준비한 뒤 `packages/account/.env`, `packages/match/.env`, `packages/gateway/.env`에 각 애플리케이션의 연결 설정을 넣습니다. 파일 대신 실행 환경에서 주입해도 됩니다. `pnpm dev`에서는 셸 환경변수가 서비스별 `.env`보다 우선합니다.

- account·match: 서비스별 `DATABASE_*`, Redis/Kafka 설정과 `INTERNAL_AUTH_ASSERTION_SECRET`을 구성합니다. account의 외부 API·스토리지 기능에는 해당 자격증명이 필요합니다.
- gateway: OIDC issuer·introspection 자격증명, 내부 assertion secret과 account·match 주소를 구성합니다. [인증 연동 계약](./docs/central-auth-client-integration.md)을 참고하세요.
- 변수 이름과 필수 여부는 각 서비스의 환경 설정 코드가 기준입니다. 실제 비밀은 커밋하지 않습니다. [비밀정보 보안 지침](./docs/security/environment-and-secrets.md)을 따릅니다.

### 데이터베이스 마이그레이션

마이그레이션은 자동 실행되지 않습니다. 먼저 빌드하고, 각 서비스의 대상 DB에 맞는 `DATABASE_*` 환경변수를 비밀 저장소 등으로 **프로세스에 주입한 상태에서** 명시적으로 실행합니다. 마이그레이션 명령 자체는 서비스별 `.env`를 읽지 않습니다.

```bash
pnpm build:workspaces
# account DB 환경변수가 주입된 셸에서
pnpm --filter account migration:run
# match DB 환경변수가 주입된 셸에서
pnpm --filter match migration:run
```

### 로컬 서비스 실행

```bash
pnpm dev                # 빌드 → account·match 병렬 실행 → gateway 시작
pnpm dev account match  # 선택한 서비스만 실행
pnpm dev gateway        # 이미 실행 중인 account·match에 연결
```

Gateway는 `ACCOUNT_SERVICE_URL`, `MATCH_SERVICE_URL`의 GraphQL 준비 상태를 기다립니다. 기본 주소는 아래와 같습니다.

| 서비스 | GraphQL 주소 |
| --- | --- |
| account | `http://localhost:2800/account/graphql` |
| match | `http://localhost:2801/match/graphql` |
| gateway | `http://localhost:4000/gateway/graphql` |

현재 소스를 빌드한 결과로 실행하므로 소스를 수정한 뒤에는 Ctrl+C 후 다시 실행합니다. Ctrl+C 또는 자식 서비스 종료 시 함께 시작한 로컬 프로세스도 종료합니다.

## 검증

```bash
pnpm build:workspaces
pnpm test:workspaces
pnpm test:local-dev
```

DB를 사용하는 테스트는 별도로 준비한 테스트 DB 연결이 필요합니다.

## 공통 모듈

내부 패키지는 `workspace:*` 의존성으로 선언하고 package export를 통해 가져옵니다.

```typescript
import { DatabaseModule } from '@core/database';
```

## 문서

- [API 문서](https://kangjuhyup.github.io/gaegaeting/docs/#/)
- [중앙 인증 클라이언트 계약](./docs/central-auth-client-integration.md)
- [보안 취약점 신고](./SECURITY.md)
