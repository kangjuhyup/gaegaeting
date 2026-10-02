# Central auth client contract

This repository contains the Gaegaeting consumer Web UI; Flutter and BFF application source are external. OIDC client provisioning belongs to the separate infrastructure repository; each client implements the runtime contract below.

## Shared endpoints and resource

- Proposed production issuer: `https://auth.rvkang.app/t/gaegaeting/oidc`. The production tenant and clients have not yet been provisioned; verify the deployed Auth metadata before enabling this issuer. A DNS alias does not change the OIDC issuer.
- Discover authorization, token, revocation, UserInfo, and end-session endpoints from the issuer metadata.
- API resource/audience: `https://api.gaegaeting.app` (origin only; never add a path or query).
- Scopes: `openid profile email offline_access account:read account:write match:read match:write`.
- Request the four API scopes explicitly in the initial authorization request. A refresh request may retain or narrow the originally granted scopes, but must never be used to add a scope that was not granted to that session.

## API scope policy

| Scope | Service capability |
| --- | --- |
| `account:read` | Read account and pet data |
| `account:write` | Create or change account and pet data |
| `match:read` | Read feed, location, like, and pair data |
| `match:write` | Create or change feed, location, like, and pair data |

Scopes only authorize these broad API capabilities. Account/match services still enforce roles, permissions, ownership, and resource-level rules independently.

## Flutter (`gaegaeting-flutter`)

- Use Authorization Code with PKCE S256 through the system browser. The client is public and must not contain a client secret.
- Send the complete shared scope list in the authorization request.
- Require `state` and `nonce`, validate the ID token signature/issuer/audience/expiry/nonce, and build the login session only from the validated ID token.
- Keep the API access token only for Gateway calls. Do not send that token to UserInfo.
- Serialize refresh per session and atomically replace both the access token and rotated refresh token before releasing waiters.
- On logout, revoke the refresh token using RFC 7009, clear protected local credentials, then invoke the discovered end-session endpoint with an exact registered post-logout URI.

## Web/BFF (`gaegaeting-web`)

- The browser client contract is public: use Authorization Code with PKCE S256 and keep no client secret in browser assets.
- Send the complete shared scope list in the authorization request.
- Validate the ID token server-side when a BFF exists, store only a server-side session identifier in an `HttpOnly`, `Secure`, `SameSite` cookie, and keep API/refresh tokens server-side.
- Serialize refresh per server session and atomically persist the rotated token pair.
- Logout must revoke the refresh token, delete the local session, and use the discovered end-session endpoint. Register a back-channel logout URI with the external issuer when a BFF endpoint is available.

The current public consumer UI keeps access and verified ID tokens in memory; it does not request or store refresh tokens and has no application session cookie. Logout clears that memory and client-specific PKCE data, revokes the access token when advertised, and redirects the **current window** to the discovered end-session endpoint. It sends the verified ID token, client ID, unchanged registered post-logout URI and a fresh client-specific `state`. The returned state is accepted once at the configured callback; missing, mismatched, duplicate and replayed states are rejected. Login and other clients' state remain separate. A matching callback correlates the response with the request; it is not independent proof that the OP session ended.

This preserves **Auth SSO logout**, rather than silently changing to app-only logout. There is no `window.open`, silent iframe or consumer confirmation dialog. Auth's own confirmation form can remain: removing it while retaining SSO logout requires Auth to automatically approve only a valid hint matching the current tenant/client/user/session. Gaegaeting does not bypass that check or submit the Auth confirmation form. App-only logout would leave the SSO session available for automatic sign-in and is not the selected behavior. See [RP-Initiated Logout](https://openid.net/specs/openid-connect-rpinitiated-1_0.html#RPLogout).

Redirect and post-logout URI registration is managed in the separate infrastructure repository. Production `http:` redirect URIs must not be added.

## Application connection settings

Run the issuer externally and supply the Gateway settings through `packages/gateway/.env` or process environment variables. See [Environment and secrets](security/environment-and-secrets.md).

| Variable | Value or source |
| --- | --- |
| `NODE_ENV` | `development` for local development |
| `OIDC_ISSUER` | Required in production; set to the exact issuer in Auth discovery metadata (proposed: `https://auth.rvkang.app/t/gaegaeting/oidc`) |
| `OIDC_ALLOW_INSECURE_HTTP` | `true` only for a loopback HTTP issuer in development |
| `OIDC_INTROSPECTION_CLIENT_ID` | Required in production; registered service client ID (proposed: `gaegaeting-gateway`, once provisioned) |
| `OIDC_INTROSPECTION_CLIENT_SECRET` | That client's secret supplied by the infrastructure owner |
| `INTERNAL_AUTH_ASSERTION_SECRET` | Separate secret shared with account/match, at least 32 characters |
| `ACCOUNT_SUBJECT_RESOLUTION_URL` | Account service's internal subject-resolution endpoint |
| `ACCOUNT_SERVICE_URL` | Account GraphQL endpoint |
| `MATCH_SERVICE_URL` | Match GraphQL endpoint |

Do not enable insecure HTTP in production. Runtime validation rejects non-loopback HTTP issuers and discovery/introspection endpoints even with the development flag.

Infrastructure bootstrap, client registration, credential distribution, and full-stack environment provisioning belong to the infrastructure repository. Application guards, introspection, signed assertions, and account subject mapping remain tested here.

## Production rollout gate

The proposed `gaegaeting` tenant, `gaegaeting-web`, `gaegaeting-flutter`, and `gaegaeting-gateway` clients are not yet confirmed to exist in production. Do not enable the proposed issuer until discovery returns that exact `issuer`, the service client has introspection permission for `https://api.gaegaeting.app`, and its secret has been delivered through Doppler. Production Gateway startup requires explicit `OIDC_ISSUER` and `OIDC_INTROSPECTION_CLIENT_ID`; local defaults remain for development only.

Confirm exact HTTPS web login/logout callbacks, Flutter callbacks, and whether the web client remains public before registration. Confirm the external Interaction UI release before configuring its URL. Auth must not call Account during signup; Account remains the signup owner.

Account now uses Auth's tenant-scoped `POST /t/{tenantCode}/oidc/token` (`client_credentials`, scope `auth.user.provision`) and `POST /t/{tenantCode}/provisioning/users` contract. Provision a dedicated service client such as `gaegaeting-account-provisioner`; do not reuse the Gateway introspection client or distribute an Auth administrator credential. Set `AUTH_BASE_URL`, `AUTH_TENANT_CODE`, `AUTH_PROVISIONING_CLIENT_ID`, and `AUTH_PROVISIONING_CLIENT_SECRET` only on the Account server. The secret belongs in Doppler. The Auth request contains only `username`, `password`, and an opaque stable `Idempotency-Key`; identity verification and contact fields stay with Account. Production rollout still requires a real identity verification provider, because mock verification is disabled there.

Account also requires `AUTH_ISSUER` matching the exact discovery issuer. Signup stores its verified identity digest, terms version and Auth provisioning state locally; after provisioning it links `(AUTH_ISSUER, subject)` to its own user ID. An Auth subject without this completed connection is rejected at Gateway rather than creating an implicit Account user. Local setup and the Gaegaeting-only bootstrap are documented in [Gaegaeting Auth 연결](../ops/local-auth/README.md).
