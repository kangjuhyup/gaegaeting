# Auth Service

Go + Gin 기반 인증 마이크로서비스

## 프로젝트 구조

```
packages/auth/
├── cmd/
│   └── server/
│       └── main.go              # 애플리케이션 진입점
├── internal/
│   ├── config/                  # 설정 관리
│   ├── handler/                 # HTTP 핸들러 (컨트롤러)
│   ├── middleware/              # 미들웨어 (인증, CORS 등)
│   ├── service/                 # 비즈니스 로직
│   ├── repository/              # 데이터 저장소 (Redis)
│   └── model/                   # 도메인 모델
├── pkg/
│   ├── jwt/                     # JWT 유틸리티
│   └── validator/               # 검증 유틸리티
├── Dockerfile
├── .env.example
└── go.mod
```

## 기능

### 1. 소셜 로그인
- Google, Kakao, Naver OAuth 지원
- PKCE 지원
- Native 앱 로그인 지원

### 2. 토큰 관리
- JWT 기반 액세스/리프레시 토큰
- 토큰 검증 및 갱신
- Redis 기반 리프레시 토큰 저장

### 3. 내부 API
- 다른 마이크로서비스와의 통신
- 사용자 매핑 관리
- API Key 기반 인증

## API 엔드포인트

### Public API

#### 소셜 로그인 (웹)
```
POST /api/v1/auth/login/:provider
Body: {
  "code": "authorization_code",
  "redirectUri": "callback_url",
  "codeVerifier": "pkce_verifier" (optional)
}
```

#### 소셜 로그인 (네이티브)
```
POST /api/v1/auth/login/:provider/native
Body: {
  "accessToken": "provider_access_token"
}
```

#### 토큰 갱신
```
POST /api/v1/auth/tokens/refresh
Body: {
  "refreshToken": "refresh_token"
}
```

#### 토큰 검증
```
POST /api/v1/auth/tokens/verify
Header: Authorization: Bearer {token}
```

#### 로그아웃
```
DELETE /api/v1/auth/tokens
Header: Authorization: Bearer {access_token}
```

### Internal API

#### 사용자 매핑 설정
```
POST /api/v1/internal/users/:userId/mapping
Header: X-Internal-API-Key: {api_key}
Body: {
  "providerType": 1,
  "providerId": "provider_user_id"
}
```

#### 사용자 조회
```
GET /api/v1/internal/users/:userId?providerType=1&providerId=xxx
Header: X-Internal-API-Key: {api_key}
```

## 설치 및 실행

### 1. 환경 변수 설정
```bash
cp .env.example .env
# .env 파일 수정
```

### 2. 의존성 설치
```bash
go mod download
```

### 3. 실행
```bash
# 개발 모드
go run cmd/server/main.go

# 빌드 후 실행
go build -o main cmd/server/main.go
./main
```

### 4. Docker 실행
```bash
docker build -t auth-service .
docker run -p 8080:8080 --env-file .env auth-service
```

## 개발 예정 사항

- [ ] 소셜 로그인 OAuth 플로우 구현
- [ ] Google, Kakao, Naver UserInfo API 연동
- [ ] 로깅 개선 (구조화된 로깅)
- [ ] 테스트 코드 작성
- [ ] Swagger/OpenAPI 문서화
- [ ] Rate limiting
- [ ] 에러 핸들링 개선
- [ ] Health check 상세화

## 기술 스택

- **언어**: Go 1.21+
- **프레임워크**: Gin
- **인증**: JWT (golang-jwt/jwt)
- **캐시/저장소**: Redis
- **환경 변수**: godotenv
