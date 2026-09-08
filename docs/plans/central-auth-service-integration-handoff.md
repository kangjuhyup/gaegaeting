# 중앙 인증서비스 연동 작업 인수인계

> Historical application design record (2026-09-02). Infrastructure setup and agent workflow instructions have been removed. Use the root README and current package scripts for executable commands; historical verification results below are not current runtime guarantees.

## 문서 목적

이 문서는 `gaegaeting`의 중앙 인증서비스 연동을 구현할 애플리케이션의 설계 기준, 보안 경계와 검증 기준을 기록한다.

현재 저장소 상태, 현재 브랜치, 기준 브랜치, 기존 미커밋 변경의 내용은 이 문서 작성 시점에 확인되었다고 가정하지 않는다. 구현에 앞서 반드시 실제 상태를 읽기 전용으로 조사해야 한다. 기존 작업과 미커밋 변경을 보존하고, 다른 작업자의 변경을 되돌리거나 덮어쓰지 않는다.

권장 작업 브랜치 이름은 `feat/central-auth-integration`이다. 다만 이 이름과 별도 worktree 사용 여부는 권장 기본값일 뿐이며, 실제 `git status`, 현재 브랜치, worktree 구성, remote 및 적절한 base branch를 먼저 확인한 뒤 결정한다. 현재 작업 디렉터리에 미커밋 변경이 있으면 변경의 성격과 연동 작업과의 의존성을 조사하고, 독립적인 작업이라면 확인된 base branch에서 별도 worktree를 만들어 변경을 격리한다.

## 1. 관리 경계

중앙 인증 서버의 이미지, 배포, DB/Redis, tenant/client provisioning과 비밀 공급은 별도 인프라 저장소에서 관리한다. 이 저장소는 Gateway의 introspection, 내부 assertion, account 식별자 매핑과 애플리케이션 인가 계약을 관리한다. 현재 실행 방법과 환경변수 공급 방식은 루트 README를 따른다.

## 2. Tenant와 issuer

- 기존 `acme` tenant를 재사용하지 말고 `gaegaeting` 전용 tenant를 생성한다.
- Base issuer origin: `https://auth.gaegaeting.app`
- Tenant issuer: `https://auth.gaegaeting.app/t/gaegaeting/oidc`
- Discovery URL: `https://auth.gaegaeting.app/t/gaegaeting/oidc/.well-known/openid-configuration`
- endpoint URL은 가능한 한 discovery 문서에서 읽고 직접 조합하지 않는다.
- `bootstrap-admin`은 master 관리자만 생성하며 `bootstrap-acme`는 `acme`만 생성한다.
- `gaegaeting` tenant와 client/resource server는 관리 API 또는 별도의 idempotent provisioning Job으로 생성한다.

## 3. 권장 client 구성

### Flutter 앱

- Flutter 앱은 별도의 public client로 구성한다.
- grant는 `authorization_code`와 `refresh_token`을 사용한다.
- `token_endpoint_auth_method=none`이어야 한다.
- PKCE S256을 필수로 한다.
- 실제 app/universal-link redirect URI와 `post_logout_redirect_uri`를 등록한다.
- scope는 `openid profile email offline_access`부터 시작한다.

### Next.js Web/BFF

- Next.js Web/BFF가 있다면 Flutter와 별도 client를 사용한다.
- 서버가 secret을 안전하게 보관할 수 있을 때만 confidential client를 사용한다.
- browser bundle에는 secret을 넣지 않는다.

### API resource/audience

- 두 사용자 client의 `allowedResources`에는 canonical HTTPS origin인 `https://api.gaegaeting.app` 하나를 등록한다.
- path 또는 query가 붙은 resource를 사용하지 않는다.
- 요청, grant 및 access-token `aud` 전 구간에서 origin을 동일하게 유지한다.
- API용으로 `gaegaeting-api` 같은 별도의 confidential resource-server client를 등록한다.
- resource-server client는 `client_secret_basic`으로 introspection한다.
- 해당 client의 `introspectionResources`에 `https://api.gaegaeting.app`을 등록한다.
- resource-server client secret은 승인된 비밀 저장소에만 저장하고 public/mobile client와 공유하지 않는다.

## 4. Resource server 인증 표준 경로

- 현재 인증 서버의 기본 운용 방식은 opaque access token + RFC 7662 introspection이다.
- access token을 JWT라고 가정해 decode하거나 로컬 `JWT_SECRET`으로 검증하지 않는다.
- 우선 권장 경로는 Gateway가 `Authorization: Bearer` token을 받아 tenant introspection endpoint로 `POST application/x-www-form-urlencoded` 요청을 보내고, `client_secret_basic`으로 인증하는 방식이다.
- introspection 결과에서 `active=true`뿐 아니라 `iss`, `aud`, `exp`, `nbf`, `tenant_id`, `sub`를 검증한다.
- `aud`는 정확히 `https://api.gaegaeting.app`, `iss`는 `https://auth.gaegaeting.app/t/gaegaeting/oidc`여야 한다.
- refresh token, unknown/revoked token 및 다른 tenant/audience token은 거부한다.
- 인증 실패와 inactive token은 HTTP 401, 인증 서버 연결 실패 또는 비정상 응답은 HTTP 503으로 구분한다.
- token과 secret은 로그에 절대 남기지 않는다.
- 검증된 principal의 최소 식별자는 `tenant_id + sub`다.
- 기존 gaegaeting user ID와 `sub`가 같다고 가정하지 않는다. account 쪽에 unique `tenant_id/sub` 외부 식별자 매핑을 둔다.
- 역할과 권한은 token에 임의로 존재한다고 기대하지 않는다. scope 또는 gaegaeting의 권한 read model에서 해석한다.

## 5. 현재 코드의 필수 보안 경계

- `packages/core/auth`의 `AccessGuard`에 있는 `excludeAuth=true` query bypass는 production 인증 경계에서 제거한다.
- `x-jwt-payload`는 단순 JSON/base64라 서명이 없고 현재 외부 요청이 위조할 수 있다.
- public ingress에서 `x-jwt-payload` 헤더를 반드시 제거한다.
- Gateway가 introspection으로 검증한 뒤에만 내부용 principal을 생성한다.
- 외부에서 관리하는 네트워크 정책으로 Gateway 이외의 직접 subgraph 접근을 제한한다.
- 가능하면 서명된 내부 assertion 또는 서비스별 재검증을 사용한다.
- subgraph는 임의의 외부 `x-jwt-payload`를 신뢰하면 안 된다.
- 전환 완료 후 `packages/core/auth`가 자체 access/refresh JWT를 발급하거나 공용 `JWT_SECRET` fallback으로 검증하는 이중 issuer 구조를 남기지 않는다.
- 중앙 인증 서버를 유일한 issuer로 정한다.
- 기존 `packages/auth`는 제거하고 계정 linking/application 기능은 `account`에 둔다.

## 6. UI와 세션

- API audience access token은 UserInfo 호출용이 아니다.
- UI/BFF는 검증된 ID token claims로 로그인 세션을 구성한다.
- API access token은 `api.gaegaeting.app` 호출에만 사용한다.
- refresh 응답을 받을 때 새 refresh token으로 원자적으로 교체한다.
- 동일한 refresh token의 동시 갱신을 serialize한다.
- 서버는 one-time rotation/reuse detection을 적용한다.
- logout은 로컬 cookie 삭제만으로 끝내지 않는다.
- refresh token에 RFC 7009 revocation을 적용하고 discovery의 `end_session_endpoint`를 사용한다.
- 여러 RP가 있으면 `backchannel_logout_uri`도 client에 등록해 SLO를 연결한다.

## 7. 외부 인증 서비스 연결

인프라 담당자가 제공한 tenant issuer와 confidential resource-server client 자격증명을 Gateway에 주입한다. client scope와 redirect URI 등록 계약은 `docs/central-auth-client-integration.md`를 따른다. account·match와 Gateway는 별도의 내부 assertion secret을 공유한다.

## 8. 구현 시 필수 검증

- Discovery 문서의 다음 값이 `gaegaeting` tenant 기준으로 정확한지 확인한다.
  - `issuer`
  - `authorization_endpoint`
  - `token_endpoint`
  - `introspection_endpoint`
  - `revocation_endpoint`
  - `end_session_endpoint`
- Flutter public client와 browser public client는 authorization code + PKCE S256만 허용해야 한다.
- plain PKCE, 미등록 redirect URI 및 production HTTP redirect URI를 거부해야 한다.
- `authorization_code` 교환으로 발급된 opaque access token을 `gaegaeting-api` confidential client가 `client_secret_basic`으로 introspection했을 때 `active=true`와 정확한 `iss`, `aud`, `tenant_id`, `sub`, `exp`, `iat`, `scope`를 반환해야 한다.
- `aud`는 문자열/배열 형태를 모두 안전하게 처리하되 값은 정확히 `https://api.gaegaeting.app`이어야 한다.
- resource가 생략된 `refresh_token` 교환도 기존 granted resource를 사용해 새 access token의 `aud=https://api.gaegaeting.app`을 유지해야 한다.
- wrong audience, cross-tenant, expired, revoked, unknown 및 refresh token introspection은 `active=false`여야 한다.
- 동일한 rotating refresh token을 정확히 동시에 2회 교환하면 정확히 하나만 HTTP 200이어야 하며 나머지는 `invalid_grant`여야 한다. 패배한 두 번째 token chain이 없어야 한다.
- refresh token RFC 7009 revocation 뒤 기존 access/refresh token이 비활성화되어야 한다.
- RP logout 및 필요한 경우 backchannel SLO가 작동해야 한다.
- API audience access token으로 UserInfo를 호출하지 않아야 한다.
- UI/BFF는 검증된 ID token claims를 세션에 사용해야 한다.
- 외부 요청의 `x-jwt-payload`는 ingress/gateway에서 제거되어야 하며 직접 위조 요청은 HTTP 401이어야 한다.
- `excludeAuth=true` query parameter로 보호 API를 우회할 수 없어야 한다.
- 실제 Gateway 경유 account/match API는 정상 token일 때 HTTP 200이어야 한다.
- invalid/inactive token은 HTTP 401, introspection timeout 또는 비정상 응답은 HTTP 503이어야 한다.
- token, authorization code, refresh token, client secret, DB URL/비밀번호가 테스트 출력이나 로그에 노출되지 않아야 한다.

## 최종 전환 수용 기준

- 중앙 auth-service를 유일한 issuer로 사용한다.
- 자체 JWT 발급 및 공용 `JWT_SECRET` fallback을 제거한다.
- `tenant_id + sub`를 외부 사용자 식별자로 매핑한다.
- public client, resource-server introspection client 및 provisioning secret을 분리한다.
- immutable multi-arch image digest를 사용한다.
- migration 자동 entrypoint와 admin/gaegaeting provisioning Job의 책임을 구분한다.
- 위 1~8절의 설계·보안·운영 기준을 구현하고 8절의 필수 검증을 통과해야 최종 전환으로 수용한다.
