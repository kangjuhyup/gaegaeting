# 개개팅 (GaeGaeTing) 서비스 문서

![개개팅 로고](./flow/logo.png)

## 🏗️ 바운디드 컨텍스트 구조

### 🔐 Account
| 모듈 | 설명 |
|------|------|
| **auth** | 소셜 로그인 및 인증 관리 |
| **user** | 사용자 프로필 및 계정 관리 |
| **pet** | 반려동물 정보 관리 |

### 💞 Match
| 모듈 | 설명 |
|------|------|
| **feed** | 매칭 피드 표시 및 관리 |
| **like** | 좋아요 기능 |
| **report** | 다시보지 않기 기능 |

### 💬 Chat
> 현재 구성 중입니다

### 💰 Payment
> 현재 구성 중입니다

## 🔄 로그인 플로우

> 현재 본인인증을 제공하지 않습니다.  
> 각 소셜로 로그인 할 경우 각각 계정이 생성됩니다.

![로그인 플로우](./flow/login.drawio)

## 🔗 로그인 API 흐름

| 순서 | 작업 | 엔드포인트 | 설명 |
|:---:|------|------|------|
| 1 | **로그인 요청** | `GET /accounts/auth/{provider}` | 사용자를 소셜 로그인 페이지로 리다이렉트합니다. |
| 2 | **콜백 처리** | `POST /accounts/auth/{provider}/fallback` | 소셜 로그인 후 콜백을 처리하여 토큰을 발급합니다. |
| 3 | **사용자 정보 조회** | `GET /accounts/users/me` | 현재 로그인한 사용자 정보를 조회합니다.<br>**주의**: 403 에러 반환 시 계정 생성이 필요합니다. |
| 4 | **계정 생성** | `POST /accounts/users/me` | 사용자 계정을 생성합니다. |

### 예시: 카카오 로그인 흐름

```mermaid
sequenceDiagram
    참가자->>+서버: GET /accounts/auth/kakao
    서버-->>-참가자: 302 리다이렉트 (카카오 로그인 페이지)
    참가자->>+카카오: 로그인 정보 제공
    카카오-->>-참가자: 인증 코드 전달
    참가자->>+서버: POST /accounts/auth/kakao/fallback
    서버-->>-참가자: JWT 토큰 발급
    참가자->>+서버: GET /accounts/users/me
    alt 기존 사용자
        서버-->>-참가자: 200 OK (사용자 정보)
    else 신규 사용자
        서버-->>-참가자: 403 Forbidden
        참가자->>+서버: POST /accounts/users/me (프로필 정보)
        서버-->>-참가자: 201 Created (생성된 사용자 정보)
    end
```