# ![개개팅 로고](./docs//logo.png) 개개팅



## 📚 API 문서

[API Document 보러가기](https://kangjuhyup.github.io/gaegaeting/docs/#/)

## 🏗️ 바운디드 컨텍스트 구조
```mermaid
graph TD
  direction LR

  %% 공유 버스(유저 키/캐시)
  BUS[[UserId / Profile Cache]]

  %% Account 내부
  subgraph Account[Account]
    direction TB
    A[Account]
    A2[user]
    A1[auth]
    A3[pet]
  end

  %% Match
  subgraph Match[Match]
    direction TB
    B[Match]
    B1[location]
    B2[feed]
    B3[like]
    B4[pair]
  end

  %% Chat
  subgraph Chat[Chat]
    direction TB
    C1[room]
    C2[talk]
  end

  %% Account(User) → BUS 동기화
  A2 -. "publish UserUpdated" .-> BUS

  %% 각 컨텍스트는 BUS를 통해 식별자/프로필 캐시 사용
  BUS --> Match
  BUS --> Chat
  B4 --> C1
```
## 로그인
### 🔄 로그인 플로우

> 현재 본인인증을 제공하지 않습니다.  
> 각 소셜로 로그인 할 경우 각각 계정이 생성됩니다.
```
sequenceDiagram
  autonumber
  actor User as 사용자(앱/웹 브라우저)
  participant API as Accounts API
  participant SOCIAL as Social Provider

  %% 1) 로그인 시작: 우리 API가 소셜 /authorize 로 리다이렉트
  User->>API: GET /accounts/auth/{provider}
  API-->>User: 302 Location: SOCIAL /oauth/authorize?client_id&redirect_uri&response_type=code&scope&state&code_challenge

  %% 2) 사용자는 소셜에서 로그인 후, 소셜이 우리 콜백으로 리다이렉트
  User->>SOCIAL: GET /oauth/authorize ... (로그인/동의)
  SOCIAL-->>User: 302 Location: /accounts/auth/{provider}/callback?code=...&state=...

  %% 3) 콜백: 표준은 GET (code, state)
  User->>API: GET /accounts/auth/{provider}/callback?code&state

  %% 4) 서버-서버 토큰 교환 (PKCE면 code_verifier 포함)
  API->>SOCIAL: POST /oauth/token { grant_type=authorization_code, code, redirect_uri, client_id, (client_secret|code_verifier) }
  SOCIAL-->>API: 200 { access_token, id_token?, refresh_token? }

  %% 5) (OIDC 또는 provider API) 사용자 정보 조회
  API->>SOCIAL: GET /userinfo (또는 /me)
  SOCIAL-->>API: 200 { sub/providerId, name?, email?, ... }

  %% 6) 우리 서비스 토큰 발급 및 응답
  API-->>User: 200 { accessToken, refreshToken, expiresIn, isNew? }

  %% 7) 내 프로필 조회/생성 절차
  User->>API: GET /accounts/users/me (Authorization: Bearer)
  alt 가입/프로필 존재
    API-->>User: 200 UserProfile
  else 미가입 또는 미완료 프로필
    API-->>User: 403 (또는 404/204 정책에 따라)
    User->>API: POST /accounts/users/me { 필수 프로필 필드 }
    API-->>User: 201 UserProfile
    User->>API: GET /accounts/users/me
    API-->>User: 200 UserProfile
  end

  %% 오류 분기 (참고)
  alt state 불일치(CSRF 방어)
    API-->>User: 400 Invalid state
  else 토큰 교환 실패
    API-->>User: 502 Token exchange failed
  end
```