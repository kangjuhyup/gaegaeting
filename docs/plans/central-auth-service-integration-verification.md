# Central auth service integration verification

> Historical application design record (2026-09-02). Infrastructure setup and agent workflow instructions have been removed. Use the root README and current package scripts for executable commands; historical verification results below are not current runtime guarantees.

Date: 2026-09-02 (Asia/Seoul)

Design and acceptance source: `docs/plans/central-auth-service-integration-handoff.md`.

## Repository and baseline findings

- The active branch was `infra/feat/auth-service-app` at `eb2ba49`, exactly aligned with `origin/develop`; the local `develop` ref was stale. This was the sole worktree.
- The pre-existing uncommitted auth-service, ingress, Argo CD, and plan files were the same central-auth effort, so the existing branch/worktree was reused. No reset, checkout, stash, commit, push, or PR was performed.
- `packages/core/auth` accepted `excludeAuth=true` and unsigned payload headers and could validate a shared-secret JWT. Account/match required `JWT_SECRET`; the legacy auth package issued its own access/refresh JWTs and logged token material.
- No `(tenant_id, sub)` mapping existed in account. Existing profile comments assumed an auth identifier was the application identifier.
- No Flutter, Next.js, Web, or BFF source exists in this repository. Only their deploy-time client contract can be provisioned and documented here.

## Local implementation evidence

- `@core/auth-assertion`: 10 tests passed; build passed.
- Gateway: 28 tests passed; build passed. Tests cover exact issuer/audience (string and array), timestamps, inactive/malformed responses, 401/503 classification, strict bearer parsing, caller-header removal, discovery endpoint origin binding, and account subject resolution.
- `@core/auth`: 9 tests passed; build passed. `excludeAuth`, local Authorization, unsigned payload, altered assertion, expiry, and wrong service audience fail closed.
- Account mapping/migration: 7 focused tests passed; account and `@core/database` builds passed.
- The legacy in-repository auth workspace and its deployment manifests were removed after the central service became the only issuer.
- Match build passed.

The complete account suite still has three unrelated pre-existing compile-failing suites (`register-pet`, `update-pet`, and `create-user-profile`). The complete match suite still has four database-backed `feed-expired` integration failures because the required database is unavailable. Both failure sets were present in the baseline; the central-auth focused tests and builds pass.

## Handoff Section 8 matrix

| Criterion | Status | Evidence / remaining requirement |
| --- | --- | --- |
| Tenant discovery endpoints are exact | PASS (local) | The real pinned auth image returned the expected local tenant issuer plus authorization, token, introspection, revocation, and end-session endpoints. Production DNS/TLS remains outside the requested local scope. |
| Flutter/browser authorization code + PKCE S256 only | PARTIAL | The provisioned browser public client completed a real code + PKCE S256 flow. Flutter runtime is absent and negative grant-method cases remain unverified. |
| Reject plain PKCE, unregistered redirect, production HTTP redirect | NOT VERIFIED | Requires the deployed issuer and registered production redirect set. Redirect registration belongs to the external issuer. |
| Code exchange and confidential Basic introspection return exact claims | PASS (local) | A generated test identity exchanged a code for an opaque token. `gaegaeting-api` introspected it with `client_secret_basic`; `active`, exact issuer/audience, non-empty tenant/sub, numeric exp/iat, and requested account/match scopes were asserted without printing credential values. |
| Audience string/array is handled exactly | PASS (unit) | Gateway accepts only the canonical origin in either form and rejects mixed/wrong audiences. |
| Refresh without resource preserves audience | NOT VERIFIED | Requires a live authorization and refresh flow. |
| Wrong audience/cross-tenant/expired/revoked/unknown/refresh tokens are inactive | PARTIAL | The real local server returned inactive for an unknown token and Gateway returned 401. Unit tests cover wrong issuer/audience, expiry, future timestamps, and missing tenant/sub; cross-tenant, revoked, and refresh-token live cases remain. |
| Simultaneous rotating refresh has exactly one winner and no losing chain | NOT VERIFIED | Requires a live concurrency test against the deployed pinned image. |
| RFC 7009 revocation invalidates the token family | NOT VERIFIED | Requires live tokens and the discovered revocation endpoint. |
| RP logout/back-channel SLO works | NOT VERIFIED | Client source/runtime is absent; optional BFF back-channel URI is not known. |
| API token is not used for UserInfo; ID token creates UI session | NOT VERIFIED | Contract is recorded in `docs/central-auth-client-integration.md`; client source is absent. |
| Forged `x-jwt-payload` and `excludeAuth=true` cannot bypass | PASS (unit/static) | Gateway strips caller identity headers; subgraphs only verify signed, short-lived, audience-bound assertions; direct routes and old ext-auth are removed. Live ingress check remains pending. |
| Gateway account/match succeeds with a valid token | PASS (local) | One authenticated federated query reached account (`pets`) and match (`getDailyFeed`) twice through Gateway with the real opaque token. |
| Inactive is 401; auth-service timeout/malformed response is 503 | PASS (unit) | Gateway middleware tests assert both responses without exposing input token material. Live fault injection remains pending. |
| Sensitive values do not appear in output/logs | PASS (local scope) | New code emits only generic errors/status labels; tests were run silently where legacy code was involved. Cluster logs require post-deploy audit. |

## Final transition criteria

- The historical local integration path used a real auth image; its provisioning and harness are no longer maintained in this repository. It is not yet acceptable as a completed production cutover: production is outside the current scope, Doppler keys and real redirect URIs are not confirmed, Section 8 refresh/revocation/race/logout and negative PKCE cases have not run, and Flutter/Web session code is outside this repository.
