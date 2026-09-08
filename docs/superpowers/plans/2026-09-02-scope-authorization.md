# OAuth Scope Authorization Implementation Plan

> Historical application design record (2026-09-02). Infrastructure setup and agent workflow instructions have been removed. Use the root README and current package scripts for executable commands; historical package names and verification results below are not current runtime guarantees.

**Goal:** Provision four gaegaeting API scopes and require the correct scope at every account/match service operation after Gateway token validation.

**Architecture:** The central auth-service remains responsible for issuing opaque access tokens and returning their granted `scope` from introspection. Gateway carries the parsed scopes in its audience-bound signed assertion; account and match use shared `@Scopes()` metadata plus their existing guards to enforce all required scopes, while keeping role, permission, ownership, and resource rules as independent service-side checks.

**Tech Stack:** Node.js, TypeScript, NestJS guards/decorators, Jest, Node test runner

**Spec:** `docs/plans/central-auth-service-integration-handoff.md`

## Global Constraints

- Use exactly `account:read`, `account:write`, `match:read`, and `match:write` for API authorization.
- Multiple values passed to `@Scopes()` use all-of semantics.
- Scope authorizes an API capability; it does not replace role, permission, ownership, or resource-level authorization.
- The Gateway-only subject mapping endpoint remains outside user OAuth scope checks.
- Never print token, authorization code, refresh token, client secret, database URL, or password values.
- Preserve all existing uncommitted changes; do not reset, checkout, stash, delete, commit, push, or open a PR.

---

### Task 1: Shared scope authorization primitive

**Files:**
- Create: `packages/core/auth/src/decorator/scopes.decorator.ts`
- Modify: `packages/core/auth/src/decorator/index.ts`
- Modify: `packages/core/auth/src/guard/access.guard.ts`
- Modify: `packages/core/auth/src/guard/graphql-access.guard.ts`
- Test: `packages/core/auth/src/guard/access.guard.spec.ts`
- Test: `packages/core/auth/src/guard/graphql-access.guard.spec.ts`

**Interfaces:**
- Consumes: `UserPrincipal.scopes: string[]` verified from the signed Gateway assertion.
- Produces: `SCOPES_KEY = 'scopes'` and `Scopes(...scopes: string[])`; both guards require `requiredScopes.every(scope => principal.scopes.includes(scope))`.

- [x] **Step 1: Write failing HTTP and GraphQL guard tests**

  Cover a principal with all required scopes, one missing required scope, and an empty/malformed scope list. Assert missing scope is `ForbiddenException`, not `UnauthorizedException`.

- [x] **Step 2: Run the focused tests and confirm RED**

  Run: `pnpm --filter @core/auth test --runInBand access.guard.spec.ts graphql-access.guard.spec.ts`

  Expected: tests fail because scope metadata is not enforced.

- [x] **Step 3: Add the decorator and minimal all-of enforcement**

  Add `Scopes` with Nest `SetMetadata`; read it alongside roles and permissions in each guard. Keep authorization groups conjunctive: required roles, permissions, and scopes must each pass.

- [x] **Step 4: Run focused tests and confirm GREEN**

  Run the same focused command and require all tests to pass.

### Task 2: Account and match operation policies

**Files:**
- Modify: `packages/account/src/user/infrastructure/adapter/inbound/gql/user.resolver.ts`
- Modify: `packages/account/src/pet/infrastructure/adapter/inbound/gql/pet.resolver.ts`
- Modify: `packages/account/src/user/infrastructure/adapter/inbound/http/user/user.admin.controller.ts`
- Modify: `packages/match/src/feed/infrastructure/adapter/inbound/gql/feed.resolver.ts`
- Modify: `packages/match/src/location/infrastructure/adapter/inbound/gql/location.resolver.ts`
- Modify: `packages/match/src/like/infrastructure/adapter/inbound/http/like.controller.ts`
- Modify: `packages/match/src/pair/infrastructure/adapter/inbound/http/pair.controller.ts`
- Test: `packages/account/test/auth/scope-authorization.spec.ts`
- Test: `packages/match/test/auth/scope-authorization.spec.ts`

**Interfaces:**
- Consumes: `Scopes()` from Task 1.
- Produces: query/GET operations require the service `:read` scope; mutation/POST/PUT/PATCH/DELETE operations require the service `:write` scope.

- [x] **Step 1: Write failing metadata policy tests**

  Reflect on each resolver/controller handler and assert the exact scope. Include previously unguarded account `profile` and `pet` reads so all Gateway-facing account operations have both `GraphqlAccessGuard` and a scope policy. Assert the internal subject resolver is not included in user scope policy.

- [x] **Step 2: Run account and match policy tests and confirm RED**

  Run each new Jest spec directly with its workspace command.

- [x] **Step 3: Apply endpoint decorators**

  Add `@Scopes('account:read')` or `@Scopes('account:write')` to account operations and `@Scopes('match:read')` or `@Scopes('match:write')` to match operations. Preserve `@Roles('ADMIN')` on admin operations so ADMIN and the relevant scope are both required.

- [x] **Step 4: Run policy tests and service builds and confirm GREEN**

  Run the two policy specs, then `pnpm --filter account build` and `pnpm --filter match build`.

### External scope registration

The external issuer must grant the four API scopes in the client contract; registration is managed in the infrastructure repository.

### Task 4: Client contract and verification

**Files:**
- Modify: `docs/central-auth-client-integration.md`
- Verify: `docs/plans/central-auth-service-integration-handoff.md`

**Interfaces:**
- Consumes: the provisioned scope names and service policy matrix.
- Produces: Flutter/Web authorization requests explicitly request all four API scopes in addition to OIDC identity/session scopes.

- [x] **Step 1: Update the client contract**

  Document the exact requested scope string and explain that refresh can only retain scopes granted in the original authorization grant.

- [ ] **Step 2: Run focused and aggregate verification**

  Run core auth tests, both endpoint policy tests, Gateway auth tests, account/match builds.

- [x] **Step 3: Recheck section 8 acceptance evidence**

  Record which section 8 items are covered by local automated checks and leave cluster-dependent OIDC, PKCE, introspection, rotation, revocation, logout, Gateway 200/401/503, and rollout/rollback checks explicitly unverified unless real non-secret cluster credentials are available.

- [x] **Step 4: Stop without repository publication**

  Report changed files and evidence. Do not commit, push, or create a PR.

## Verification record

- Local automated checks passed for shared assertion verification, scope all-of enforcement, account/match operation metadata, introspection response validation, Gateway authentication status mapping, tenant/client/scope reconciliation, and central-auth static security boundaries.
- `@core/auth`, account, and match builds passed.
- Full account tests retain three pre-existing compile-failing suites; the remaining four suites and all 30 runnable tests passed.
- Full match tests retain four database-dependent feed-expiration integration failures; the remaining five suites and 24 tests passed.
- Live section 8 checks remain unverified: discovery endpoint values, PKCE/redirect rejection, real authorization-code and opaque-token introspection claims, refresh resource retention/race behavior, revocation/logout/backchannel SLO, real Gateway account/match 200/401/503 behavior, and rollout/rollback readiness.
