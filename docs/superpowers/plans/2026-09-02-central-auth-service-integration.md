# Central Auth Service Integration Implementation Plan

> Historical application design record (2026-09-02). Infrastructure setup and agent workflow instructions have been removed. Use the root README and current package scripts for executable commands; historical package names and verification results below are not current runtime guarantees.

**Goal:** Make the central auth-service the only active user-token issuer and protect the Gateway/account/match path with opaque-token introspection, signed internal principals, and `tenant_id + sub` account mapping.

**Architecture:** The public Gateway removes caller-supplied identity headers, introspects the bearer token through discovery with the `gaegaeting-api` confidential client, validates the complete token contract, resolves the external subject to an application user ID through an internal account endpoint, and signs a short-lived audience-bound internal assertion for each subgraph. Account and match accept only that assertion, while external network policy limits direct subgraph access.

**Tech Stack:** TypeScript, Node.js 20 crypto/fetch, Express, Apollo Gateway, NestJS, TypeORM/MySQL, Jest, external OIDC.

**Spec:** `docs/plans/central-auth-service-integration-handoff.md`

## Global Constraints

- Central issuer: `https://auth.gaegaeting.app/t/gaegaeting/oidc`.
- Discovery URL: `https://auth.gaegaeting.app/t/gaegaeting/oidc/.well-known/openid-configuration`; endpoints come from discovery.
- API audience/resource: exactly `https://api.gaegaeting.app`.
- Never log or persist access tokens, authorization codes, refresh tokens, client secrets, database URLs, or passwords.
- Existing uncommitted files belong to the user and must not be reset, stashed, checked out, deleted, or overwritten without integrating their content.
- No commit, push, or PR in this task.

---

### Task 1: Pure signed internal assertion contract

**Files:**

- Create: `packages/core/auth-assertion/package.json`
- Create: `packages/core/auth-assertion/tsconfig.json`
- Create: `packages/core/auth-assertion/src/index.ts`
- Create: `packages/core/auth-assertion/src/internal-auth-assertion.ts`
- Test: `packages/core/auth-assertion/src/internal-auth-assertion.spec.ts`
- Modify: `packages/gateway/package.json`
- Modify: `packages/core/auth/package.json`

**Interfaces:**

- Produces `createInternalAuthAssertion(principal, { secret, issuer, audience, ttlSeconds, now? }): string`.
- Produces `verifyInternalAuthAssertion(assertion, { secret, issuer, audience, now? }): AuthenticatedPrincipal`.
- `AuthenticatedPrincipal` contains `tenantId`, `subject`, `userId`, `scopes`, `issuedAt`, and `expiresAt`; it contains no raw OAuth token.

- [ ] Write tests that reject altered signatures, expired/future assertions, wrong issuer/audience, missing `tenant_id`/`sub`/`user_id`, and accept a valid short-lived assertion.
- [ ] Run `pnpm --filter @core/auth-assertion test --runInBand` and confirm RED because the package/API does not exist.
- [ ] Implement deterministic JSON base64url encoding and HMAC-SHA256 verification using `timingSafeEqual`; enforce a maximum 60-second lifetime.
- [ ] Run the package tests and build until GREEN.

### Task 2: Gateway RFC 7662 boundary

**Files:**

- Create: `packages/gateway/src/auth/oidc-discovery.ts`
- Create: `packages/gateway/src/auth/introspection-client.ts`
- Create: `packages/gateway/src/auth/authentication-middleware.ts`
- Create: `packages/gateway/src/auth/account-subject-client.ts`
- Test: `packages/gateway/src/auth/oidc-discovery.spec.ts`
- Test: `packages/gateway/src/auth/introspection-client.spec.ts`
- Test: `packages/gateway/src/auth/authentication-middleware.spec.ts`
- Test: `packages/gateway/src/auth/account-subject-client.spec.ts`
- Modify: `packages/gateway/src/main.ts`
- Modify: `packages/gateway/src/gateway.ts`
- Modify: `packages/gateway/jest.config.js`

**Interfaces:**

- `OidcDiscoveryCache.get(): Promise<OidcDiscovery>` only accepts HTTPS discovery and HTTPS introspection endpoints and caches discovery, never token results.
- `OpaqueTokenIntrospector.introspect(token): Promise<ExternalPrincipal>` returns only validated claims or throws `InactiveTokenError`/`AuthServiceUnavailableError`.
- `AccountSubjectClient.resolve({ tenantId, subject }): Promise<{ userId: string }>` calls the internal account endpoint without forwarding the bearer token.
- Express auth middleware deletes `x-jwt-payload` and `x-gaegaeting-principal`, returns 401 for missing/malformed/inactive/invalid claims, and 503 for discovery/introspection transport, non-2xx, timeout, or malformed response.
- Apollo context carries the resolved principal; each RemoteGraphQLDataSource signs `x-gaegaeting-principal` with audience equal to the subgraph name and never forwards the original authorization or identity headers.

- [ ] Write focused RED tests for strict Bearer parsing, header stripping, inactive 401, wrong issuer/audience/expiry/not-before/tenant/subject 401, timeout/malformed response 503, string and array audience handling, and non-disclosure in errors.
- [ ] Implement discovery and introspection with `application/x-www-form-urlencoded`, `client_secret_basic`, `AbortController`, and exact issuer/audience validation.
- [ ] Implement account subject resolution and verify transport failures are 503 without sensitive response-body logging.
- [ ] Wire middleware before both GraphQL routes and sign an audience-bound assertion in `willSendRequest`; remove the `auth` subgraph from composition.
- [ ] Run `pnpm --filter gateway test --runInBand` and `pnpm --filter gateway build` until GREEN.

### Task 3: Account `tenant_id + sub` mapping and migration

**Files:**

- Create: `packages/core/database/src/entity/account/external-user-subject.ts`
- Modify: `packages/core/database/src/entity/account/index.ts`
- Modify: `packages/core/database/src/datasource/database-schema.ts`
- Create: `packages/account/src/user/infrastructure/port/external-user-subject-repository.port.ts`
- Create: `packages/account/src/user/infrastructure/adapter/outbound/persistence/external-user-subject-orm.repository.ts`
- Create: `packages/account/src/user/application/service/resolve-external-user-subject.service.ts`
- Create: `packages/account/src/user/infrastructure/adapter/inbound/http/user/external-user-subject.controller.ts`
- Modify: `packages/account/src/user/infrastructure/infrastructure.module.ts`
- Create: `packages/account/src/migrations/central-auth-subject.migration.ts`
- Test: `packages/account/test/user/resolve-external-user-subject.service.spec.ts`
- Test: `packages/account/test/migrations/central-auth-subject.migration.spec.ts`

**Interfaces:**

- Table `external_user_subject` has an application ULID primary key/reference `user_id`, non-empty `tenant_id`, non-empty `subject`, timestamps, and unique key `(tenant_id, subject)`.
- `resolve(tenantId, subject): Promise<string>` returns the same ULID for repeated and concurrent requests and never treats `subject` as the application user ID.
- `POST /account/internal/subjects/resolve` accepts `{ tenant_id, sub }` and returns `{ user_id }`; mesh policy makes it Gateway-only.
- The account init container runs only the idempotent account mapping DDL before the account container starts; it does not run auth-service migrations.

- [ ] Write RED unit tests for stable mapping, cross-tenant separation, blank identifiers, and duplicate-key race recovery.
- [ ] Implement the entity, repository port/adapter, resolver service, and internal controller.
- [ ] Write a RED migration contract test asserting `CREATE TABLE IF NOT EXISTS`, the composite unique key, and no secret/URL logging.
- [ ] Implement the one-shot account migration entrypoint with TypeORM/mysql2 parameters sourced only from environment and add it as an init container.
- [ ] Run the new focused account tests and `pnpm --filter account build` until GREEN; record unrelated baseline suite failures separately.

### Task 4: Remove local JWT and unsigned-header trust from subgraphs

**Files:**

- Replace: `packages/core/auth/src/jwt-auth.module.ts` with `packages/core/auth/src/internal-auth.module.ts`
- Replace: `packages/core/auth/src/service/jwt-token.service.ts` with `packages/core/auth/src/service/internal-auth.service.ts`
- Modify: `packages/core/auth/src/guard/access.guard.ts`
- Modify: `packages/core/auth/src/guard/graphql-access.guard.ts`
- Modify: `packages/core/auth/src/type/user-principal.type.ts`
- Modify: `packages/core/auth/src/index.ts`
- Modify: `packages/core/auth/src/service/index.ts`
- Modify: `packages/account/src/app.module.ts`
- Modify: `packages/account/src/config/env.config.ts`
- Modify: `packages/match/src/app.module.ts`
- Modify: `packages/match/src/config/env.config.ts`
- Test: `packages/core/auth/src/guard/access.guard.spec.ts`
- Test: `packages/core/auth/src/guard/graphql-access.guard.spec.ts`

**Interfaces:**

- `InternalAuthModule.forRootAsync` requires `INTERNAL_AUTH_ASSERTION_SECRET` and a fixed service audience; it has no default.
- Guards accept only `x-gaegaeting-principal`, verify its signature/issuer/audience/time, populate `UserPrincipal`, and never inspect `Authorization`, cookies, `x-jwt-payload`, or `excludeAuth`.
- `UserPrincipal` retains the application `userId` while explicitly carrying `tenantId`, `subject`, and `scopes`; roles/permissions are not inferred from token claims.

- [ ] Replace the existing bypass-positive tests with RED rejection tests for `excludeAuth=true`, unsigned `x-jwt-payload`, missing assertion, wrong-audience assertion, and valid assertion.
- [ ] Implement the internal auth module/service and both guards; remove local access/refresh JWT creation and verification exports from `@core/auth`.
- [ ] Remove `JWT_SECRET` and JWT expiration requirements/fallbacks from account and match configuration and wire fixed audiences `account`/`match`.
- [ ] Run `pnpm --filter @core/auth test --runInBand`, then account/match builds.

### External issuer boundary

Issuer deployment, provisioning and network policies are maintained in the separate infrastructure repository. The application contract is recorded in `docs/central-auth-client-integration.md`.

### Task 7: Legacy auth package transition safety

**Files:**

- Modify: `packages/gateway/src/gateway.ts`
- Modify: `packages/auth/src/application/service/token.service.ts`
- Test: `packages/auth/test/adapter/out/token-service.simple.spec.ts`

**Interfaces:**

- The old auth package is absent from Gateway composition and public routing, so it cannot act as a production issuer.
- Until the package is removed in a later repository cleanup, no token value or token-derived cache key/metadata is logged; production issuance is unreachable.

- [ ] Write/adjust tests that fail if token material is logged.
- [ ] Remove token-value, token-key, and token-metadata log calls.
- [ ] Verify no active Gateway reference exposes `packages/auth` as an issuer.
- [ ] Run focused auth tests silently and build the package; report any pre-existing failures without hiding them.

### Task 8: Section 8 application acceptance matrix

**Files:**

- Create: `docs/plans/central-auth-service-integration-verification.md`

**Interfaces:**

- Static verification exits non-zero for wrong issuer/audience, `excludeAuth`, unsigned header trust, JWT fallback,  or sensitive logging patterns.
- Live verification accepts secrets only through environment/stdin, disables shell tracing, prints pass/fail labels only, and never echoes credentials or token material.

- [ ] Write the static verification script first and observe failures against the pre-change tree.
- [ ] Make it cover every locally provable handoff section 8 item and all final transition criteria.
- [ ] Run focused unit tests, affected package builds, static verification.
- [ ] If cluster credentials and non-secret test identities are available, run discovery, PKCE, introspection, rotation race, revocation, logout, forged-header, Gateway account/match, and 401/503 live checks through a redacting harness.
- [ ] Record each section 8 criterion as PASS, FAIL, or NOT VERIFIED with the exact non-sensitive command/evidence; Flutter/Web runtime and cluster-only items remain NOT VERIFIED when their source/runtime is absent.

## Baseline Evidence

- `pnpm --filter gateway build`: exit 0 before changes.
- `pnpm --filter @core/auth test --runInBand --silent`: 7 failures / 14 tests; existing tests and implementation disagree on `req.auth` versus `req.user`, and GraphQL test contexts are incomplete.
- `pnpm --filter account test --runInBand --silent`: existing compile failures in pet registration and create-user-profile tests.
- `pnpm --filter match test --runInBand --silent`: 4 existing database-backed integration failures; 11 tests pass.
- Flutter and Next.js/Web/BFF source trees are absent from this repository.
