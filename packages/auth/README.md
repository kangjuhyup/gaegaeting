# Auth 모듈

인증 및 사용자 관리 기능을 담당하는 모듈입니다.

## 주요 기능

### 인증
- **소셜 로그인**: 카카오, 애플 로그인 지원
- **OTP 인증**: 네이버 클라우드 SMS v2를 통한 전화번호 인증
- **JWT 토큰**: Access Token 및 Refresh Token 발급 및 관리
- **세션 관리**: 사용자 세션 조회 및 종료

### 사용자 관리 (Admin API)
- 사용자 CRUD 작업
- 사용자 상태 관리 (활성/비활성/정지)
- 비밀번호 강제 리셋
- 사용자 세션 관리

### 테넌트 관리 (Admin API)
- 멀티 테넌트 지원

## 아키텍처

이 모듈은 **Hexagonal Architecture (Ports & Adapters)** 패턴과 **Domain-Driven Design (DDD)** 원칙을 따릅니다.

### 구조

```
src/
├── domain/              # 도메인 레이어
│   ├── model/          # 도메인 모델 (User, Tenant, Role 등)
│   └── port/           # 도메인 포트 (Repository 인터페이스)
├── application/         # 애플리케이션 레이어
│   ├── usecase/        # 비즈니스 로직 (UseCase)
│   └── port/           # 애플리케이션 포트 (외부 서비스 인터페이스)
└── adapter/            # 어댑터 레이어
    ├── in/             # 인바운드 어댑터 (GraphQL, REST)
    └── out/            # 아웃바운드 어댑터 (DB, 외부 API)
```

### 포트 (Ports)

모든 포트는 **abstract class**로 구현되어 있습니다:

- **도메인 포트**:
  - `UserRepositoryPort`: 사용자 영속성 관리
  - `UserIdentityRepositoryPort`: 사용자 소셜 연동 정보 관리

- **애플리케이션 포트**:
  - `KakaoIdpPort`: 카카오 인증 API
  - `AppleIdpPort`: 애플 인증 API
  - `NaverCloudApiPort`: 네이버 클라우드 SMS API
  - `OtpRepositoryPort`: OTP 코드 저장소
  - `TokenServicePort`: JWT 토큰 발급

### 어댑터 (Adapters)

- **인바운드**:
  - `AuthResolver`: GraphQL API
  - `UserAdminController`: REST Admin API
  - `TenantAdminController`: REST Admin API
  - `HealthController`: 헬스 체크

- **아웃바운드**:
  - `UserRepositoryAdapter`: TypeORM 기반 사용자 저장소
  - `KakaoIdpAdapter`: 카카오 API 통신
  - `AppleIdpAdapter`: 애플 API 통신
  - `NaverCloudApiAdapter`: 네이버 클라우드 SMS API 통신
  - `InMemoryOtpRepository`: 인메모리 OTP 저장소

## API 엔드포인트

### GraphQL API

GraphQL 엔드포인트: `/graphql`

#### 주요 Mutation

```graphql
# 소셜 로그인
mutation {
  kakaoSignin(authCode: "xxx", redirectUri: "xxx") {
    accessToken
    refreshToken
    expiresIn
  }
  
  appleSignin(idToken: "xxx", authorizationCode: "xxx") {
    accessToken
    refreshToken
    expiresIn
  }
  
  # OTP 인증
  requestOtp(phoneNumber: "01012345678")
  verifyOtp(phoneNumber: "01012345678", code: "123456")
}
```

#### 주요 Query

```graphql
query {
  me {
    id
    username
    email
    status
    identities {
      provider
      providerSub
    }
  }
  
  myPermissions(clientId: "xxx")
}
```

### REST Admin API

#### 사용자 관리 (`/admin/v1/users`)

- `POST /admin/v1/users` - 사용자 생성
- `GET /admin/v1/users` - 사용자 목록 조회
- `GET /admin/v1/users/:userId` - 사용자 상세 조회
- `PUT /admin/v1/users/:userId` - 사용자 수정
- `DELETE /admin/v1/users/:userId` - 사용자 삭제
- `PATCH /admin/v1/users/:userId/status` - 사용자 상태 변경
- `POST /admin/v1/users/:userId/reset-password` - 비밀번호 강제 리셋
- `GET /admin/v1/users/:userId/sessions` - 사용자 세션 조회
- `DELETE /admin/v1/users/:userId/sessions` - 모든 세션 종료

#### 헬스 체크

- `GET /health` - 서비스 상태 확인

### API 문서

- Swagger UI: `http://localhost:{PORT}/docs`

## 환경 변수

필수 환경 변수는 `src/config/env.config.ts`에 정의되어 있습니다.

### 필수 설정

```env
# 서비스
AUTH_SERVICE_API_PORT=3000
NODE_ENV=development

# 데이터베이스
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USERNAME=root
DATABASE_PASSWORD=password
DATABASE_NAME=gaegaeting
DATABASE_LOG=true
DATABASE_SYNCHRONIZE=false

# JWT
JWT_SECRET=your-secret-key
JWT_ACCESS_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=30d

# 네이버 클라우드 SMS v2
NAVER_CLOUD_ACCESS_KEY=your-access-key
NAVER_CLOUD_SECRET_KEY=your-secret-key
NAVER_CLOUD_SMS_SERVICE_ID=your-service-id
NAVER_CLOUD_SMS_SENDER=01012345678
```

### 선택적 설정 (소셜 로그인)

```env
# 카카오
KAKAO_CLIENT_ID=your-client-id
KAKAO_CLIENT_SECRET=your-client-secret
KAKAO_REDIRECT_URI=https://your-app.com/auth/kakao/callback

# 애플
APPLE_TEAM_ID=your-team-id
APPLE_KEY_ID=your-key-id
APPLE_PRIVATE_KEY=your-private-key
APPLE_CLIENT_ID=your-client-id
```

## 실행 방법

### 개발 환경

```bash
# 의존성 설치
yarn install

# 개발 서버 실행
yarn dev

# 또는 직접 실행
yarn start:dev
```

### 프로덕션 빌드

```bash
# 빌드
yarn build

# 프로덕션 실행
yarn start:prod
```

## 테스트

### 단위 테스트

```bash
yarn test
```

### E2E 테스트

```bash
yarn test:e2e
```

### 특정 테스트 실행

```bash
yarn test user-admin.controller.e2e-spec
```

## 데이터베이스

이 모듈은 `@core/database` 패키지의 `DatabaseModule`을 사용합니다.

- **스키마**: `AUTH`
- **주요 엔티티**: `User`, `UserIdentity`, `Tenant`, `Role`, `Permission`, `Group`, `Client`, `Session`

TypeORM 설정은 `DatabaseModule`에서 중앙 관리되며, 애플리케이션 레이어에서는 별도 설정이 필요하지 않습니다.

## 주요 UseCase

- `SocialSigninUseCase`: 소셜 로그인 처리
- `OtpUsecase`: OTP 발송 및 검증
- `UserUsecase`: 사용자 관리 (CRUD, 상태 변경, 비밀번호 리셋)
- `TenantUsecase`: 테넌트 관리
- `RoleUsecase`: 역할 관리
- `PermissionUsecase`: 권한 관리
- `GroupUsecase`: 그룹 관리
- `ClientUsecase`: 클라이언트 관리
- `SessionUsecase`: 세션 관리
- `AuditLogUsecase`: 감사 로그

## 소셜 로그인 프로세스

### 카카오 로그인

1. 클라이언트가 카카오 인증 코드를 받아 `kakaoSignin` mutation 호출
2. `KakaoIdpAdapter`가 인증 코드를 액세스 토큰으로 교환
3. 액세스 토큰으로 사용자 프로필 조회
4. 기존 사용자 조회 또는 신규 사용자 생성
5. `UserIdentity` 생성 (소셜 연동 정보 저장)
6. JWT 토큰 발급 및 반환

### 애플 로그인

1. 클라이언트가 Apple ID 토큰을 받아 `appleSignin` mutation 호출
2. `AppleIdpAdapter`가 ID 토큰 검증 (JWKS)
3. 사용자 정보 추출
4. 기존 사용자 조회 또는 신규 사용자 생성
5. `UserIdentity` 생성
6. JWT 토큰 발급 및 반환

## OTP 인증 프로세스

1. 클라이언트가 `requestOtp` mutation 호출
2. 6자리 인증번호 생성 (3분 유효)
3. 네이버 클라우드 SMS v2 API를 통해 SMS 발송
4. OTP 코드를 저장소에 저장 (TTL: 3분)
5. 클라이언트가 `verifyOtp` mutation 호출
6. 저장된 코드와 비교하여 검증
7. 검증 성공 시 코드 소비 (재사용 불가)

## 비밀번호 해싱

Node.js 내장 `crypto` 모듈의 SHA-256을 사용합니다.

```typescript
import * as crypto from 'crypto';

const hash = crypto.createHash('sha256').update(password).digest('hex');
```

## 참고사항

- 모든 포트는 abstract class로 구현되어 있어 타입 안정성과 확장성이 보장됩니다.
- 도메인 모델은 `PersistenceEntity`를 상속받아 영속성 관련 속성을 관리합니다.
- ORM 엔티티와 도메인 모델 간 변환은 Mapper를 통해 수행됩니다.
- 테스트 환경에서는 실제 로컬 데이터베이스에 연결됩니다.
