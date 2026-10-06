# Central auth client contract

This repository does not contain Flutter or Web/BFF application source. OIDC client provisioning belongs to the separate infrastructure repository; each client repository implements the runtime contract below.

## Shared endpoints and resource

- Proposed production issuer: `https://auth.rvkang.app/t/gaegaeting/oidc`. The production tenant and clients have not yet been provisioned; verify the deployed Auth metadata before enabling this issuer. A DNS alias does not change the OIDC issuer.
- Discover authorization, token, revocation, UserInfo, and end-session endpoints from the issuer metadata.
- API resource/audience: `https://api.gaegaeting.app` (origin only; never add a path or query).
- Scopes: `openid profile email offline_access account:read account:write match:read match:write payment:read payment:write`.
- Request the six API scopes explicitly in the initial authorization request. A refresh request may retain or narrow the originally granted scopes, but must never be used to add a scope that was not granted to that session. Existing mobile sessions need a new authorization grant for Payment scopes.

## API scope policy

| Scope | Service capability |
| --- | --- |
| `account:read` | Read account and pet data |
| `account:write` | Create or change account and pet data |
| `match:read` | Read feed, location, like, and pair data |
| `match:write` | Create or change feed, location, like, and pair data |
| `payment:read` | Read snack products, own wallet, and own purchase history |
| `payment:write` | Prepare and confirm own iOS/Android snack purchases |

Scopes only authorize these broad API capabilities. Account, Match, and Payment services still enforce roles, permissions, ownership, and resource-level rules independently. Payment uses `payment:read` on `snackProducts`, `mySnackWallet`, and `mySnackTransactions`, and `payment:write` on `prepareSnackPurchase` and `confirmSnackPurchase`.

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
| `OIDC_ISSUER` | Required in production; set to the exact issuer in Auth discovery metadata (proposed: `https://auth.rvkang.app/t/gaegaeting/oidc`) |
| `OIDC_ALLOW_INSECURE_HTTP` | `true` only for a loopback HTTP issuer in development |
| `OIDC_INTROSPECTION_CLIENT_ID` | Required in production; registered service client ID (proposed: `gaegaeting-gateway`, once provisioned) |
| `OIDC_INTROSPECTION_CLIENT_SECRET` | That client's secret supplied by the infrastructure owner |
| `INTERNAL_AUTH_ASSERTION_SECRET` | Separate secret shared with Account/Match/Payment, at least 32 characters |
| `ACCOUNT_SUBJECT_RESOLUTION_URL` | Account service's internal subject-resolution endpoint |
| `ACCOUNT_SERVICE_URL` | Account GraphQL endpoint |
| `MATCH_SERVICE_URL` | Match GraphQL endpoint |
| `PAYMENT_SERVICE_URL` | Optional Payment GraphQL endpoint (`http://127.0.0.1:2802/payment/graphql` locally); absent means Payment is not composed |

Do not enable insecure HTTP in production. Runtime validation rejects non-loopback HTTP issuers and discovery/introspection endpoints even with the development flag.

Infrastructure bootstrap, client registration, credential distribution, and full-stack environment provisioning belong to the infrastructure repository. Application guards, introspection, signed assertions, and account subject mapping remain tested here.

Register and permit `payment:read` and `payment:write` for the mobile client's API resource in that external infrastructure before requesting them. This repository change does not provision or modify remote Auth clients. Gateway forwards the granted scopes in a signed internal assertion with audience `payment` and issuer `gaegaeting-gateway`; Payment verifies both and enforces its resolver scopes.

## Mobile purchase connection

iOS and Android purchase UI and StoreKit/Play Billing integration belong to the separate Flutter repository. Request the new Payment scopes during login, fetch `snackProducts` through Gateway, and display the store's actual localized price. Send the purchaser link returned by `prepareSnackPurchase` as Apple's `appAccountToken` or Google's `obfuscatedAccountId`. Submit the store evidence to `confirmSnackPurchase`, and finish the Apple transaction only after the server confirms fulfillment. Google consume is a server-side follow-up. Retry unfinished confirmations after app restart; do not grant snacks from a client callback alone.

Payment notifications are separate provider-authenticated endpoints: `/payment/notifications/apple` and `/payment/notifications/google`. They do not use mobile bearer tokens or user GraphQL scopes. Apple payload signature verification and Google Pub/Sub identity verification are performed by Payment. Expose only those exact paths to providers; keep `/payment/graphql` and other Payment endpoints internal.

## Production rollout gate

The proposed `gaegaeting` tenant, `gaegaeting-web`, `gaegaeting-flutter`, and `gaegaeting-gateway` clients are not yet confirmed to exist in production. Do not enable the proposed issuer until discovery returns that exact `issuer`, the service client has introspection permission for `https://api.gaegaeting.app`, and its secret has been delivered through Doppler. Production Gateway startup requires explicit `OIDC_ISSUER` and `OIDC_INTROSPECTION_CLIENT_ID`; local defaults remain for development only.

Confirm exact HTTPS web login/logout callbacks, Flutter callbacks, and whether the web client remains public before registration. Confirm the external Interaction UI release before configuring its URL. Auth must not call Account during signup; Account remains the signup owner.

Account now uses Auth's tenant-scoped `POST /t/{tenantCode}/oidc/token` (`client_credentials`, scope `auth.user.provision`) and `POST /t/{tenantCode}/provisioning/users` contract. Provision a dedicated service client such as `gaegaeting-account-provisioner`; do not reuse the Gateway introspection client or distribute an Auth administrator credential. Set `AUTH_BASE_URL`, `AUTH_TENANT_CODE`, `AUTH_PROVISIONING_CLIENT_ID`, and `AUTH_PROVISIONING_CLIENT_SECRET` only on the Account server. The secret belongs in Doppler. The Auth request contains only `username`, `password`, and an opaque stable `Idempotency-Key`; identity verification and contact fields stay with Account. Production rollout still requires a real identity verification provider, because mock verification is disabled there.

Account also requires `AUTH_ISSUER` matching the exact discovery issuer. Signup stores its verified identity digest, terms version and Auth provisioning state locally; after provisioning it links `(AUTH_ISSUER, subject)` to its own user ID. An Auth subject without this completed connection is rejected at Gateway rather than creating an implicit Account user. Local setup and the Gaegaeting-only bootstrap are documented in [Gaegaeting Auth 연결](../ops/local-auth/README.md).
