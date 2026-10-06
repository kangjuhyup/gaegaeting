# 로컬 Envoy 인증 경로

운영의 `Istio Envoy → ext_authz → Auth introspection → Gateway` 경계를 로컬에서 재현합니다. UI는 `http://localhost:8080/gateway/graphql`을 사용하고, Envoy가 인증한 요청에만 서명된 edge assertion을 Gateway로 전달합니다. Gateway는 assertion을 검증한 뒤 Account에서 `issuer + sub`에 해당하는 내부 사용자를 찾습니다. Auth는 Account를 호출하지 않습니다.

## 준비

- Node와 pnpm은 저장소 루트의 `.nvmrc`, `package.json` 버전을 사용합니다.
- Docker와 실행 중인 Auth, Account, Match가 필요합니다.
- Gateway와 edge-authz 프로세스에 `OIDC_ISSUER`, `OIDC_DISCOVERY_URL`, `OIDC_INTROSPECTION_CLIENT_ID`, `OIDC_INTROSPECTION_CLIENT_SECRET`, `EDGE_AUTH_ASSERTION_SECRET`(32자 이상), `INTERNAL_AUTH_ASSERTION_SECRET`, `ACCOUNT_SERVICE_URL`, `MATCH_SERVICE_URL`, `ACCOUNT_SUBJECT_RESOLUTION_URL`을 주입합니다. `EDGE_AUTH_ASSERTION_SECRET`은 Gateway↔subgraph용 secret과 다른 값이어야 합니다. 로컬 HTTP issuer를 사용하는 경우에만 기존 `OIDC_ALLOW_INSECURE_HTTP` 설정을 적용합니다.
- Gateway에는 `GATEWAY_AUTH_MODE=edge`를 설정합니다. 운영용 issuer·client 정보와 secret을 저장소나 브라우저 번들에 넣지 않습니다.

## 실행

저장소 루트에서 빌드한 뒤, 각 명령을 별도 터미널에서 실행합니다. 아래 `env`는 실제 비밀 저장소가 주입하는 환경을 뜻하며 예시 secret 값은 의도적으로 생략했습니다.

```bash
pnpm --filter gateway build
GATEWAY_AUTH_MODE=edge node packages/gateway/dist/src/main.js
pnpm --filter gateway start:edge-authz
docker run --rm --name gaegaeting-local-envoy \
  -p 127.0.0.1:8080:8080 \
  -v "$PWD/ops/local-envoy/envoy.yaml:/etc/envoy/envoy.yaml:ro" \
  envoyproxy/envoy:v1.36.9
```

Gateway는 `:4000`, edge-authz는 `127.0.0.1:4010`, Envoy는 `127.0.0.1:8080`을 사용합니다. macOS Docker의 `host.docker.internal`로 호스트 프로세스에 연결합니다. 다른 OS에서는 Envoy 설정의 호스트 주소를 조정해야 합니다.

결제를 사용할 때는 Payment를 `:2802`에서 실행하고 Gateway에 `PAYMENT_SERVICE_URL=http://127.0.0.1:2802/payment/graphql`을 설정합니다. `pnpm dev account match payment gateway`도 같은 연결을 구성합니다. Payment의 DB 마이그레이션·스토어 설정은 [결제 서비스](../../packages/payment/README.md)를 참고하세요.

Envoy는 정확히 `/payment/notifications/apple`, `/payment/notifications/google` 두 경로만 Payment로 전달합니다. 제공자 알림은 사용자 OIDC 인증 대신 Payment의 Apple 서명·Google Pub/Sub 인증 검증을 사용하므로 해당 두 경로에서만 ext_authz가 비활성화됩니다. Gateway GraphQL의 ext_authz는 계속 적용되며 `/payment/graphql`은 외부에 노출하지 않습니다. 로컬 알림 테스트는 제공자 테스트 설정과 접근 가능한 HTTPS 전달 주소를 별도로 준비해야 합니다.

## 확인

```bash
curl -i http://localhost:8080/health
curl -i -X POST http://localhost:8080/gateway/graphql \
  -H 'Content-Type: application/json' \
  --data '{"query":"{__typename}"}'
```

첫 요청은 `200`, 토큰 없는 GraphQL 요청은 `401`이어야 합니다. UI에서 OIDC 로그인한 후 프로필·추천 요청은 `:8080`을 거쳐야 합니다. Gateway `:4000`에 직접 Bearer 토큰만 보내도 edge assertion이 없어 `401`이어야 합니다.

이 구성은 ext_authz 판정·헤더 전달·Gateway 검증을 재현하지만 Istio `AuthorizationPolicy`, mesh mTLS, 운영 DNS/TLS 자체는 검증하지 않습니다. 배포 시에는 edge-authz를 별도 서비스로 실행하고 Gateway에 대한 직접 외부 접근을 차단해야 합니다.
