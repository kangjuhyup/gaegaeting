# Gaegaeting Auth 연결

가입 화면은 Account의 `registerAccount`를 호출합니다. Account가 본인확인·성인·약관 정책을 확인하고, 전용 service client의 `auth.user.provision` 권한으로 Auth 사용자 생성 후 `(AUTH_ISSUER, subject)`를 자체 DB의 내부 사용자에 연결합니다. 사용자는 이후 별도 OIDC Authorization Code + PKCE 로그인을 시작합니다. Auth는 Account를 역호출하지 않습니다.

로그인 시 Auth가 `gaegaeting-web` client의 `externalInteractionUiUrl`인 `/interaction`으로 위임합니다. 브라우저는 fragment credential을 주소에서 즉시 제거하고 메모리에만 보관한 뒤 Auth interaction API에 직접 제출합니다. 비밀번호·interaction token은 Account나 UI 서버로 전달하지 않습니다.

## 로컬 설정

- Auth 3010은 provisioning과 외부 Hosted UI를 모두 지원하는 이미지여야 합니다. Auth DB에 `Migration20260910000000`, `Migration20260911000000`을 적용합니다. Vote가 현재 고정한 9월 9일 이미지는 두 기능을 지원하지 않으므로 그대로 공유할 수 없습니다.
- Auth의 `gaegaeting` tenant에 public `gaegaeting-web`, introspection 전용 `gaegaeting-api`, provisioning 전용 `gaegaeting-account-provisioner`를 둡니다. `e-vote` tenant/client는 수정하지 않습니다.
- 웹 설정 예시는 [UI .env.example](../../packages/integration-ui/.env.example)입니다. Account 서버에는 `AUTH_BASE_URL`, 정확한 `AUTH_ISSUER`, `AUTH_TENANT_CODE=gaegaeting`, `AUTH_PROVISIONING_CLIENT_ID`, `AUTH_PROVISIONING_CLIENT_SECRET`을 비밀 저장소로 주입합니다. secret을 UI·Flutter·Git에 넣지 않습니다.
- 로컬 Auth는 `EXTERNAL_INTERACTION_UI_ALLOW_HTTP_LOCALHOST=true`가 필요합니다. 운영은 HTTPS이고 exact UI origin에 credentialed CORS와 cross-site cookie가 허용돼야 합니다. 응답에는 `Referrer-Policy: no-referrer`와 엄격한 CSP를 배포 프록시에서 설정합니다.

## 멱등 부트스트랩

필요한 관리자 자격증명과 두 service secret을 일회성 부트스트랩 환경에만 공급한 뒤 저장소 루트에서 실행합니다. 스크립트는 `gaegaeting`만 생성·확인하며, 기존 client 설정이 기대값과 다르면 덮어쓰지 않고 중단합니다.

```bash
AUTH_BASE_URL=http://localhost:3010 \
GAEGAETING_WEB_REDIRECT_URI=http://localhost:5173/login \
GAEGAETING_INTERACTION_URL=http://localhost:5173/interaction \
node scripts/bootstrap-gaegaeting-auth.mjs
```

추가로 `AUTH_ADMIN_USERNAME`, `AUTH_ADMIN_PASSWORD`, `GAEGAETING_INTROSPECTION_CLIENT_SECRET`, `GAEGAETING_PROVISIONING_CLIENT_SECRET`이 실행 환경에 있어야 합니다. 예시 명령에는 비밀값을 넣지 않았습니다. 부트스트랩 후 UI를 실행해 가입→로그인→프로필 흐름을 확인합니다. Account DB 마이그레이션은 `pnpm --filter account migration:run`을 실행 환경의 Account DB 연결값으로 별도 수행합니다.

운영 Auth 이미지 digest, redirect/logout URI, UI HTTPS origin, 본인인증 공급자와 cookie 정책은 배포 전에 확정해야 합니다. 로컬 mock 본인인증은 운영에서 비활성입니다.

로그인 후 UI 상단의 **로그아웃**은 메모리의 인증 정보를 지우고, discovery의 토큰 폐기 주소가 있으면 access token을 폐기한 뒤 `end_session_endpoint`로 이동합니다. Auth 로그아웃 후 UI origin의 `/`로 돌아와 로그인 화면을 표시합니다. 이 UI는 refresh token을 요청하거나 보관하지 않습니다. Auth 연결 실패 시 로컬 로그아웃은 유지하며 화면에 오류를 표시합니다.

웹 client의 `postLogoutRedirectUris`에는 UI origin의 `/`를 정확히 등록합니다(로컬 `http://localhost:5173/`). 부트스트랩은 신규 client에 이 주소를 등록합니다. 이미 생성된 client 설정이 다르면 Auth 관리자 UI에서 해당 주소를 추가한 뒤 확인합니다. 기존 설정을 덮어쓰지 않는 부트스트랩 정책은 유지됩니다.
