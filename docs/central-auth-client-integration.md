# Central auth client contract

This repository does not contain Flutter or Web/BFF application source. OIDC client provisioning belongs to the separate infrastructure repository; each client repository implements the runtime contract below.

## Shared endpoints and resource

- Issuer: `https://auth.gaegaeting.app/t/gaegaeting/oidc`
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

Redirect and post-logout URI registration is managed in the separate infrastructure repository. Production `http:` redirect URIs must not be added.

## Application connection settings

Run the issuer externally and supply the Gateway settings through `packages/gateway/.env` or process environment variables. See [Environment and secrets](security/environment-and-secrets.md).

| Variable | Value or source |
| --- | --- |
| `NODE_ENV` | `development` for local development |
| `OIDC_ISSUER` | External tenant issuer URL |
| `OIDC_ALLOW_INSECURE_HTTP` | `true` only for a loopback HTTP issuer in development |
| `OIDC_INTROSPECTION_CLIENT_ID` | Registered confidential resource-server client ID |
| `OIDC_INTROSPECTION_CLIENT_SECRET` | That client's secret supplied by the infrastructure owner |
| `INTERNAL_AUTH_ASSERTION_SECRET` | Separate secret shared with account/match, at least 32 characters |
| `ACCOUNT_SUBJECT_RESOLUTION_URL` | Account service's internal subject-resolution endpoint |
| `ACCOUNT_SERVICE_URL` | Account GraphQL endpoint |
| `MATCH_SERVICE_URL` | Match GraphQL endpoint |

Do not enable insecure HTTP in production. Runtime validation rejects non-loopback HTTP issuers and discovery/introspection endpoints even with the development flag.

Infrastructure bootstrap, client registration, credential distribution, and full-stack environment provisioning belong to the infrastructure repository. Application guards, introspection, signed assertions, and account subject mapping remain tested here.
