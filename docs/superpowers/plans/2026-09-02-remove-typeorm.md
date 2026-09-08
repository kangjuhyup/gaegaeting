# Complete TypeORM Removal Implementation Plan

> Historical application design record (2026-09-02). Infrastructure setup and agent workflow instructions have been removed. Use the root README and current package scripts for executable commands; historical package names and verification results below are not current runtime guarantees.

**Goal:** Remove TypeORM completely while preserving the frozen PostgreSQL schema, existing data, migration history, domain ports, and the ORM-neutral transaction API.

**Architecture:** `DatabaseModule` becomes a MikroORM-only composition root and all persistence adapters use MikroORM behind existing domain ports. A small `pg`-based forward migration runner owns raw SQL baselines and adopts exact pre-existing schemas without replaying DDL.

**Tech Stack:** Node.js 24, TypeScript 5.8, native ESM, NestJS 11, MikroORM 7.1.14, PostgreSQL 16.15, `pg` 8.23, Jest 29, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-02-remove-typeorm-design.md`

## Global Constraints

- Run every command after `source /Users/kangjuhyup/.nvm/nvm.sh && nvm use 24`.
- Work only on `refactor/remove-typeorm` in `/Users/kangjuhyup/Documents/gaegaeting/.worktrees/remove-typeorm` until final local merge.
- Keep `DatabaseSchema` limited to entity-group selection.
- Keep handlers free of transaction-boundary, entity-manager, schema, and ORM constructor injection.
- Keep `@Transactional()` and `TransactionBoundary` ORM-neutral and keep REQUIRED propagation semantics.
- Preserve all application table DDL exactly.
- Preserve existing Account and Match migration timestamps, names, and history tables.
- Never use automatic schema synchronization in an application runtime.
- Do not delete or rewrite application data.
- Do not create runnable ORM-owned migrations.

---

### Task 1: Add the removal and module composition contracts

**Files:**
- Create: `scripts/orm-removal-contract.test.mjs`
- Create: `packages/core/database/src/database.module.spec.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: repository files and package manifests as inputs to the contract.
- Produces: `pnpm test:orm-removal-contract` and a failing MikroORM-only `DatabaseModule` expectation.

- [ ] **Step 1: Write the failing repository removal contract**

Create a Node test that recursively scans active `.ts`, `.js`, `.mjs`, `.cjs`, `.json`, `.yml`, and `.yaml` files outside `docs`, `dist`, `.git`, and `.worktrees`. It must inspect package manifests and `pnpm-lock.yaml`, report every forbidden case, and fail on case-insensitive occurrences of the retired package name or Nest integration package. Ignore only the removal test file itself so its forbidden literals do not self-match.

- [ ] **Step 2: Write the failing module contract**

Test that `DatabaseModule.forRootAsync()` imports a MikroORM dynamic module, exports `DEFAULT_TRANSACTION_BOUNDARY`, provides `MikroOrmTransactionAdapter` as that token, rejects an empty schema list, and never exposes an alternative adapter selector.

- [ ] **Step 3: Verify RED**

Run:

```sh
pnpm exec node --test scripts/orm-removal-contract.test.mjs
pnpm --filter @core/database test database.module.spec.ts --runInBand
```

Expected: the repository contract reports current TypeORM paths and the module test reports the current TypeORM composition.

- [ ] **Step 4: Add the root script only**

Add `"test:orm-removal-contract": "node --test scripts/orm-removal-contract.test.mjs"` to the root scripts. Do not weaken scan exclusions to make the test pass.

- [ ] **Step 5: Commit the red contracts**

```sh
git add package.json scripts/orm-removal-contract.test.mjs packages/core/database/src/database.module.spec.ts
git commit -m "test: require complete TypeORM removal"
```

### Task 2: Promote MikroORM into the core composition root

**Files:**
- Modify: `packages/core/database/src/database.module.ts`
- Modify: `packages/core/database/src/database-options.ts`
- Modify: `packages/core/database/src/database-options.spec.ts`
- Create: `packages/core/database/src/database-schema.ts`
- Modify: `packages/core/database/src/datasource/index.ts`
- Modify: `packages/core/database/src/index.ts`
- Modify: `packages/core/database/src/mikro/index.ts`
- Modify: `packages/core/database/src/mikro/mikro-database-options.ts`
- Modify: `packages/core/database/src/mikro/mikro-database-options.spec.ts`
- Delete: `packages/core/database/src/mikro/mikro-database.module.ts`
- Delete: `packages/core/database/src/typeorm.ts`
- Delete: `packages/core/database/src/typeorm/transaction/typeorm-transaction-context.ts`
- Delete: `packages/core/database/src/typeorm/transaction/typeorm-transaction.adapter.ts`
- Delete: `packages/core/database/src/typeorm/transaction/typeorm-transaction.adapter.spec.ts`
- Delete: `packages/core/database/src/repository/base.repository.ts`
- Delete: `packages/core/database/src/transformer/bigint.transformer.ts`
- Delete: `packages/core/database/src/transformer/boolean.transformer.ts`
- Delete: `packages/core/database/src/transformer/enum.transformer.ts`
- Delete: `packages/core/database/src/transformer/enum.transformer.spec.ts`
- Delete: `packages/core/database/src/transformer/value-enum.transformer.ts`
- Delete: `packages/core/database/src/transaction/transaction-context.ts`

**Interfaces:**
- Consumes: `DatabaseModuleAsyncOptions`, `DatabaseSchema[]`, `DatabaseConfigReader`, `buildMikroPostgresOptions`, and `MikroOrmTransactionAdapter`.
- Produces: the stable `DatabaseModule.forRootAsync(options, schemas)` application API backed only by MikroORM, plus an ORM-neutral `DatabaseSchema` definition.

- [ ] **Step 1: Implement the green module composition**

Use `MikroOrmModule.forRootAsync` in `DatabaseModule`. Await the existing config-reader factory, call `getMikroEntitiesBySchema`, set `registerRequestContext: true`, provide the shared ownership context, provide `MikroOrmTransactionAdapter`, bind `DEFAULT_TRANSACTION_BOUNDARY` with `useExisting`, and export the Mikro module plus the boundary token.

Move `DatabaseSchema` to the root `database-schema.ts`. Reduce `database-options.ts` to the `DatabaseConfigReader` contract and PostgreSQL connection-value parsing shared by the Mikro runtime and raw migration entry points; remove the TypeORM options builder. Update Mikro datasource imports and tests to use the root schema definition.

- [ ] **Step 2: Remove the retired core runtime surface**

Delete the old adapter, context, base repository, and value transformers. Remove their root exports and the `./typeorm` package export. Keep entity exports only under `@core/database/mikro`.

- [ ] **Step 3: Verify GREEN**

Run:

```sh
pnpm --filter @core/database test database.module.spec.ts mikro-transaction.adapter.spec.ts transaction-injection.spec.ts --runInBand
pnpm --filter @core/database build
```

Expected: the module and transaction contracts pass and the core package builds.

- [ ] **Step 4: Commit**

```sh
git add packages/core/database
git commit -m "refactor(database): make MikroORM the sole runtime"
```

### Task 3: Build the ORM-neutral PostgreSQL migration runner

**Files:**
- Replace: `packages/core/database/src/migration/run-migrations.ts`
- Replace: `packages/core/database/src/migration/run-migrations.spec.ts`
- Create: `packages/core/database/src/migration/sql-migration.ts`
- Create: `packages/core/database/src/migration/schema-manifest.ts`
- Modify: `packages/core/database/src/index.ts`

**Interfaces:**
- Consumes: `pg.ClientConfig`, a history table name, advisory lock key, ordered migrations, and frozen manifests.
- Produces: `runSqlMigrations(options): Promise<void>`, `SqlMigration`, `SqlStatement`, `SchemaManifest`, and deterministic adoption failures.

- [ ] **Step 1: Replace runner tests and verify RED**

Write tests around a specific fake PostgreSQL client that exercise real runner control flow. Literal expected event sequences must cover successful ordered application, existing matching row skip, timestamp/name corruption, unknown newer history, advisory unlock on failure, transaction rollback, exact-schema adoption, partial-schema refusal, and catalog-drift refusal.

Run `pnpm --filter @core/database test run-migrations.spec.ts --runInBand`. Expected: compile failure because `runSqlMigrations` does not exist.

- [ ] **Step 2: Implement minimal runner**

Define statement and migration data interfaces. Validate the history-table identifier against `/^[a-z][a-z0-9_]*$/`, use parameterized values, acquire and release a session advisory lock, and wrap each migration plus history insert in `BEGIN`/`COMMIT`. On failure issue `ROLLBACK`, release, close, and rethrow the original error.

- [ ] **Step 3: Implement exact adoption**

When the history row is absent, classify expected tables as none, complete, or partial. Apply DDL only for none. For complete, load a normalized PostgreSQL catalog description and deep-compare it with the committed manifest before creating/inserting history. Refuse partial or drifted schemas without writing history.

- [ ] **Step 4: Verify GREEN**

Run `pnpm --filter @core/database test run-migrations.spec.ts --runInBand`. Expected: all runner behavior tests pass.

- [ ] **Step 5: Commit**

```sh
git add packages/core/database/src/migration packages/core/database/src/index.ts
git commit -m "feat(database): add ORM-neutral SQL migrations"
```

### Task 4: Convert frozen schema migrations and live parity

**Files:**
- Replace: `packages/account/src/migrations/0001-account-schema.ts`
- Replace: `packages/account/src/migrations/data-source.ts`
- Modify: `packages/account/src/migrations/migrate.ts`
- Replace: `packages/match/src/migrations/1788347664586-match-schema.ts`
- Replace: `packages/match/src/migrations/data-source.ts`
- Modify: `packages/match/src/migrations/migrate.ts`
- Create: `packages/auth/src/migrations/0001-auth-schema.ts`
- Create: `packages/auth/src/migrations/migrate.ts`
- Create: `packages/core/database/src/migration/chat/0001-chat-schema.ts`
- Create: `packages/core/database/src/migration/frozen-schema-manifests.ts`
- Replace: `packages/core/database/src/mikro/testing/live-schema-parity.ts`
- Modify: `scripts/esm-dist-smoke.test.mjs`

**Interfaces:**
- Consumes: `SqlMigration`, `runSqlMigrations`, database environment variables, and four frozen entity groups.
- Produces: raw SQL migrations for USER/AUTH/MATCH/CHAT and live verification with no second ORM.

- [ ] **Step 1: Write failing live assertions**

Change the live runner to apply raw migrations before MikroORM initialization, require empty update SQL, exercise database-clock timestamps, remove a baseline history row after inserting a sentinel row, rerun adoption, and verify the sentinel survives. Add partial and drifted schema cases that must fail without mutation.


- [ ] **Step 2: Translate Account and Match migrations**

Represent every current `up` statement as `SqlStatement`. Preserve exact names and timestamps. Omit the fresh-database insert into the unused generated-column metadata table; keep the generated expression `point(longitude, latitude)` unchanged.

- [ ] **Step 3: Add Auth and Chat baselines**

Commit explicit SQL for all frozen tables, constraints, and indexes described by the MikroORM entity metadata. Use deterministic constraint and index names. Commit literal frozen catalog manifests used for adoption.

- [ ] **Step 4: Replace migration entry points**

Construct `pg` configuration directly from environment values and call `runSqlMigrations`. Keep named ESM exports and `import.meta.url` main guards. Add Auth and Chat entries to the dist smoke test when build outputs exist.

- [ ] **Step 5: Verify GREEN**

Run:

```sh
pnpm build:workspaces
pnpm test:esm-dist
```

Expected: all four raw schemas have zero MikroORM update SQL; adoption and safety cases pass.

- [ ] **Step 6: Commit**

```sh
git add packages/account/src/migrations packages/auth/src/migrations packages/match/src/migrations packages/core/database/src/migration packages/core/database/src/mikro/testing scripts
git commit -m "refactor(database): replace ORM migrations with raw SQL"
```

### Task 5: Convert Account persistence adapters

**Files:**
- Modify: `packages/account/src/user/infrastructure/adapter/outbound/persistence/user-profile-orm.repository.ts`
- Modify: `packages/account/src/user/infrastructure/adapter/outbound/persistence/user-attachment-orm.repository.ts`
- Modify: `packages/account/src/user/infrastructure/adapter/outbound/persistence/external-user-subject-orm.repository.ts`
- Modify: `packages/account/src/pet/infrastructure/adapter/outbound/persistence/pet-profile-orm.repository.ts`
- Modify: `packages/account/src/pet/infrastructure/adapter/outbound/persistence/pet-attachment-orm.repository.ts`
- Modify: `packages/account/src/user/infrastructure/adapter/outbound/persistence/mapper/user-profile-orm.ts`
- Modify: `packages/account/src/user/infrastructure/adapter/outbound/persistence/mapper/user-attachment-orm.ts`
- Modify: `packages/account/src/pet/infrastructure/adapter/outbound/persistence/mapper/pet-profile-orm.ts`
- Modify: `packages/account/src/pet/infrastructure/adapter/outbound/persistence/mapper/pet-orm.ts`
- Modify: Account repository port type imports that expose persistence-only option types.

**Interfaces:**
- Consumes: existing Account domain ports and USER entities from `@core/database/mikro`.
- Produces: behavior-equivalent MikroORM repository adapters.

- [ ] **Step 1: Add focused failing repository tests**

For save/find/update/delete and attachment ordering, use explicit MikroORM repository fakes with complete return shapes. Assert returned domain values and not the fake itself. Run Account tests and observe failures from the current constructor and persistence calls.

- [ ] **Step 2: Convert repositories and mappers**

Inject MikroORM `EntityManager`, obtain typed repositories, use `create`, `findOne`, `find`, `assign`, `persist`, `flush`, and `nativeDelete`, and preserve current null/error behavior. Import persistence entities from `@core/database/mikro`.

- [ ] **Step 3: Verify GREEN**

Run `pnpm --filter account test --runInBand && pnpm --filter account build`. Expected: all Account tests and build pass.

- [ ] **Step 4: Commit**

```sh
git add packages/account
git commit -m "refactor(account): move repositories to MikroORM"
```

### Task 6: Convert Auth persistence adapters

**Files:**
- Modify: `packages/auth/src/adapter/out/repository/user-repository.adapter.ts`
- Modify: `packages/auth/src/adapter/out/repository/user-identity-repository.adapter.ts`
- Modify: `packages/auth/src/adapter/out/repository/tenant-repository.adapter.ts`
- Modify: `packages/auth/src/adapter/out/repository/role-repository.adapter.ts`
- Modify: `packages/auth/src/adapter/out/repository/permission-repository.adapter.ts`
- Modify: `packages/auth/src/adapter/out/mapper/user.mapper.ts`
- Modify: `packages/auth/src/adapter/out/mapper/tenant.mapper.ts`
- Modify: `packages/auth/src/adapter/out/mapper/role.mapper.ts`
- Modify: `packages/auth/src/adapter/out/mapper/permission.mapper.ts`
- Modify: `packages/auth/src/application/service/tenant.service.ts`
- Modify: `packages/auth/src/common/service/init.service.ts`
- Modify: affected Auth unit tests.

**Interfaces:**
- Consumes: existing Auth domain ports and AUTH entities from `@core/database/mikro`.
- Produces: MikroORM Auth adapters preserving tenant-scoped lookup, population, pagination, uniqueness, and role/permission semantics.

- [ ] **Step 1: Add failing behavior tests**

Cover tenant-scoped user lookup, `$like` username search, pagination/count, identity lookup with populated user, tenant config upsert, role inheritance, permission assignment, and initialization idempotency. Run the focused Auth tests and confirm current persistence APIs fail the desired MikroORM seam.

- [ ] **Step 2: Convert adapters and service persistence calls**

Replace repository decorators and TypeORM types with MikroORM managers/repositories. Load required relations using `populate`; initialize and mutate collections deliberately; flush once per public operation; keep domain mapper outputs unchanged.

- [ ] **Step 3: Verify GREEN**

Run `pnpm --filter auth test --runInBand && pnpm --filter auth build`. Expected: all Auth tests and build pass.

- [ ] **Step 4: Commit**

```sh
git add packages/auth
git commit -m "refactor(auth): move repositories to MikroORM"
```

### Task 7: Convert Match repositories

**Files:**
- Modify: `packages/match/src/feed/infrastructure/adapter/outbound/persistence/feed.orm.repository.ts`
- Modify: `packages/match/src/feed/infrastructure/adapter/outbound/persistence/feed-item.orm.repository.ts`
- Modify: `packages/match/src/like/infrastructure/adapter/outbound/persistence/like.orm.repository.ts`
- Modify: `packages/match/src/location/infrastructure/adapter/outbound/presistence/location.orm.repository.ts`
- Modify: `packages/match/src/location/infrastructure/adapter/outbound/presistence/main-area.ts`
- Modify: `packages/match/src/pair/infrastructure/adapter/outbound/persistence/pair.orm.repository.ts`
- Modify: mapper files adjacent to those repositories.
- Modify: affected Match repository and application tests.

**Interfaces:**
- Consumes: existing Match ports and MATCH entities from `@core/database/mikro`.
- Produces: behavior-equivalent feed, feed-item, like, location, main-area, and pair adapters.

- [ ] **Step 1: Add failing repository tests**

Cover feed item population, active inbox/outbox ordering, pair relation population, main-area upsert, location persistence including numeric conversion, and delete/update behavior. Run focused Match tests and verify failure against the current TypeORM seam.

- [ ] **Step 2: Convert repositories and mappers**

Use MikroORM repository conditions and population. Preserve unique-edge behavior, sort order, key types, generated location point behavior, and domain null semantics.

- [ ] **Step 3: Verify GREEN**

Run `pnpm --filter match test --runInBand && pnpm --filter match build`. Expected: all Match tests and build pass.

- [ ] **Step 4: Commit**

```sh
git add packages/match/src/feed packages/match/src/like packages/match/src/location packages/match/src/pair packages/match/test
git commit -m "refactor(match): move repositories to MikroORM"
```

### Task 8: Convert Match batch infrastructure

**Files:**
- Modify: `packages/match/src/batch/jobs/__test__/test-database.ts`
- Modify: `packages/match/src/batch/jobs/daily-feed/daily-feed.job.ts`
- Modify: `packages/match/src/batch/jobs/daily-feed/daily-feed.processor.ts`
- Modify: `packages/match/src/batch/jobs/daily-feed/daily-feed.reader.ts`
- Modify: `packages/match/src/batch/jobs/daily-feed/daily-feed.step.ts`
- Modify: `packages/match/src/batch/jobs/daily-feed/daily-feed.writer.ts`
- Modify: `packages/match/src/batch/jobs/feed-expired/feed-expired.job.ts`
- Modify: `packages/match/src/batch/jobs/feed-expired/feed-expired.reader.ts`
- Modify: `packages/match/src/batch/jobs/feed-expired/feed-expired.step.ts`
- Modify: `packages/match/src/batch/jobs/feed-expired/feed-expired.writer.ts`
- Modify: `packages/match/src/batch/jobs/feed-expired/__test__/feed-expired.intergration.spec.ts`
- Modify: `packages/match/src/batch/scheduler/feed.scheduler.ts`

**Interfaces:**
- Consumes: MikroORM `EntityManager`, current ItemReader/Processor/Writer interfaces, and raw test migrations.
- Produces: batch jobs with unchanged cursor, chunk, update, and scheduler behavior.

- [ ] **Step 1: Change batch tests to the MikroORM seam and verify RED**

Keep literal expected rows and page boundaries. Replace the test database bootstrap with raw migration plus MikroORM. Run the batch integration test and confirm compilation fails while production jobs still require TypeORM managers.

- [ ] **Step 2: Convert readers, writers, steps, and scheduler**

Fork a MikroORM manager per job/step, use it throughout the transaction, translate keyset queries, and use MikroORM connection execution for existing bulk updates when necessary. Flush before transaction completion.

- [ ] **Step 3: Verify GREEN**

Run the Match batch tests and full Match build. Expected: batch behavior and compilation pass.

- [ ] **Step 4: Commit**

```sh
git add packages/match/src/batch
git commit -m "refactor(match): move batch jobs to MikroORM"
```

### Task 9: Remove dependencies, legacy entities, logger integration, and obsolete docs

**Files:**
- Modify: `packages/account/package.json`
- Modify: `packages/auth/package.json`
- Modify: `packages/match/package.json`
- Modify: `packages/core/database/package.json`
- Modify: `packages/core/logger/src/database/database-logger.interface.ts`
- Modify or delete: `packages/core/logger/src/database/database-logger.ts`
- Delete: `packages/core/database/src/entity/**`
- Delete: `packages/core/database/src/datasource/database-schema.ts`
- Delete: `packages/core/database/src/postgresql-entity-metadata.spec.ts`
- Delete: `packages/core/database/src/mikro/testing/metadata-parity.spec.ts`
- Delete: `packages/core/database/src/mikro/testing/normalize-orm-metadata.ts`
- Delete: `docs/superpowers/specs/2026-09-02-mikroorm-v7-migration-design.md`
- Delete: `docs/superpowers/plans/2026-09-02-mikroorm-v7-migration.md`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: all previously converted imports.
- Produces: one ORM dependency graph and a green repository removal contract.

- [ ] **Step 1: Delete retired files and dependencies**

Remove TypeORM packages from dependencies, peers, and dev dependencies. Delete the old entity/datasource/test trees and obsolete logger implementation. Update remaining database imports to the Mikro schema selector.

- [ ] **Step 2: Regenerate the immutable dependency state**

Run `pnpm install`. Review `pnpm-lock.yaml` to ensure the removed packages are not retained directly or transitively through a retired Nest integration.

- [ ] **Step 3: Verify the original RED contract turns GREEN**

Run `pnpm test:orm-removal-contract`. Expected: zero forbidden active paths or dependencies.

- [ ] **Step 4: Build and test all workspaces**

Run `pnpm build:workspaces && pnpm test:workspaces`. Fix only removal-related compilation or behavior regressions.

- [ ] **Step 5: Commit**

```sh
git add -A
git commit -m "chore: remove TypeORM from the repository"
```

### Task 10: Final verification, review, local merge, and cleanup

**Files:**
- Modify only files required by verified review findings.

**Interfaces:**
- Consumes: the completed branch.
- Produces: a verified merge commit on `infra/feat/auth-service-app` and no temporary worktree.

- [ ] **Step 1: Run fresh branch verification**

Run:

```sh
pnpm install --frozen-lockfile
pnpm build:workspaces
pnpm test:workspaces
pnpm test:orm-removal-contract
pnpm test:esm-contract
pnpm test:esm-dist
pnpm test:postgresql-contract
git diff --check
```

Expected: every command exits 0, the live test removes its disposable containers, and `git status --porcelain` is empty after removing generated `tsconfig.tsbuildinfo` with `apply_patch`.

- [ ] **Step 2: Review the complete branch**

Review `1c922bd..HEAD` for schema drift, unsafe adoption, lost transaction propagation, incorrect relation population, data-loss paths, and any remaining dependency. Fix Critical and Important findings with tests and commit them.

- [ ] **Step 3: Merge locally**

From `/Users/kangjuhyup/Documents/gaegaeting`, verify the base is clean, merge `refactor/remove-typeorm` into `infra/feat/auth-service-app` with a merge commit, and do not push.

- [ ] **Step 4: Verify the merged tree**

Run the same full verification command on the merged base. Stop cleanup if any command fails.

- [ ] **Step 5: Clean up**

When the merged tree is green, remove `/Users/kangjuhyup/Documents/gaegaeting/.worktrees/remove-typeorm`, prune worktrees, and delete `refactor/remove-typeorm` with `git branch -d`.
