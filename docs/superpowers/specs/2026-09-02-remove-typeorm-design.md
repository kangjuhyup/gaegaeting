# TypeORM Removal Design

> Historical application design record (2026-09-02). Infrastructure setup and agent workflow instructions have been removed. Use the root README and current package scripts for executable commands; historical package names and verification results below are not current runtime guarantees.

## Status

Approved in conversation on 2026-09-02.

## Context

The repository currently runs TypeORM in Account, Auth, and Match while a complete MikroORM 7.1.14 entity model and an ORM-neutral transaction boundary already exist in `@core/database`. The coexistence phase is complete. The next state removes TypeORM from active code, dependencies, build output, tests, and runtime configuration without changing the frozen application schema or losing compatibility with databases that were migrated by the existing runners.

The repository remains on Node.js 24, NestJS 11, native ESM, pnpm workspace, PostgreSQL 16.15, and MikroORM 7.1.14.

## Goals

- Use MikroORM as the only runtime ORM.
- Preserve the ORM-neutral `TransactionBoundary` and argumentless `@Transactional()` API.
- Keep database schema selection separate from transaction selection.
- Move all Account, Auth, and Match persistence adapters and Match batch jobs to MikroORM.
- Replace ORM-owned migrations with an ORM-neutral PostgreSQL migration runner.
- Preserve existing data and recognize existing `account_migrations` and `match_migrations` history.
- Keep every application table, column, constraint, index, generated expression, default, and PostgreSQL type unchanged.
- Remove TypeORM packages, imports, exports, entities, helpers, tests, and generated runtime paths.
- Complete the work in `refactor/remove-typeorm`, verify it, merge it locally into `infra/feat/auth-service-app`, and remove the temporary worktree and branch.

## Non-goals

- Renaming domain ports or application handlers.
- Changing API, GraphQL, Kafka, Redis, storage, or authentication behavior.
- Changing business data or application table schemas.
- Introducing a generic repository abstraction over MikroORM.
- Supporting automatic migration rollback.
- Deleting unused legacy metadata tables from already-existing databases. They are left untouched because the database schema is frozen; no active code may read or write them, and fresh databases do not create them.

## Chosen Approach

Use MikroORM for runtime persistence and use `pg` directly for migrations. This is a single repository-wide cutover: the merge is not allowed to retain a temporary TypeORM runtime path.

Alternatives were rejected:

- A service-by-service cutover would leave TypeORM installed and active at merge time.
- Rewriting every repository as raw SQL would maximize portability but discard the completed MikroORM entity model and cause unnecessary domain-facing change.
- MikroORM's migration package would remove TypeORM but keep DDL ownership coupled to the current ORM, conflicting with the requirement that a later ORM replacement remain possible.

## Target Architecture

### Core database module

`DatabaseModule.forRootAsync(options, schemas)` becomes the single application-facing database module. Internally it configures `@mikro-orm/nestjs`, selects entities using `DatabaseSchema`, enables request contexts, and binds `DEFAULT_TRANSACTION_BOUNDARY` to `MikroOrmTransactionAdapter`.

`DatabaseSchema` only selects entity groups. It never selects a transaction adapter and is never injected into handlers.

The root `@core/database` export surface contains the ORM-neutral module configuration, schema selector, transaction API, and migration API. MikroORM-specific entities and persistence helpers are exported only from `@core/database/mikro`. There is no TypeORM subpath.

The temporary `MikroDatabaseModule` name is removed after its implementation is promoted into `DatabaseModule`; applications keep the stable `DatabaseModule` call site.

### Transaction boundary

The existing API remains unchanged:

```ts
export interface TransactionBoundary {
  run<T>(work: () => Promise<T>, options?: TransactionOptions): Promise<T>;
}
```

`@Transactional()` continues to resolve the hidden boundary property injected by Nest. Handlers do not constructor-inject a transaction manager, entity manager, schema, or ORM adapter.

The only concrete runtime implementation is `MikroOrmTransactionAdapter`. REQUIRED nesting, isolation forwarding, read-only behavior, error propagation, and shared ownership checks retain their existing contract tests.

### Entity ownership

The MikroORM entity tree under `packages/core/database/src/mikro/entity` becomes the only entity model. Persistence adapters import these entities from `@core/database/mikro` so ORM-specific types do not leak through domain ports.

The former TypeORM entity tree under `packages/core/database/src/entity` is deleted. TypeORM-only value transformers and `BaseRepository` are deleted. Domain mappers continue converting between domain objects and persistence entities, but are updated for MikroORM relation references and collections where required.

The frozen entity groups remain:

- USER: 6 entities
- AUTH: 16 entities
- MATCH: 6 entities
- CHAT: 6 entities

### Service repositories

Account, Auth, and Match repository adapters use MikroORM `EntityManager` or `EntityRepository`. The ORM dependency remains inside infrastructure adapters. Application services and domain ports keep their current signatures and null/error semantics.

Repository behavior is translated explicitly:

- TypeORM `save` becomes MikroORM create/assign plus `persist` and `flush`.
- TypeORM `findOne` relations become MikroORM `populate` options.
- TypeORM `Like` becomes a MikroORM `$like` condition.
- TypeORM `findAndCount`, ordering, pagination, delete, and count operations use their MikroORM equivalents.
- Relation arrays become initialized MikroORM collections before domain mapping.
- Updates load the managed entity, assign mutable fields, and flush; they do not replace relation identity accidentally.

Repository class names may retain the neutral `OrmRepository` suffix. No class name contains the removed implementation name.

### Match batch jobs

Batch readers, processors, writers, steps, schedulers, and integration fixtures use MikroORM managers and transactions. Keyset pagination and bulk operations preserve ordering, page size, and update semantics. Native PostgreSQL queries are allowed through MikroORM's connection only inside batch infrastructure when the ORM query builder cannot express the existing bulk operation without changing behavior.

Batch transactions use the same MikroORM fork for a step. No TypeORM manager, query runner, data source, or repository object remains.

## ORM-neutral PostgreSQL Migrations

### Migration model

The core package provides a small forward-only runner based on `pg`:

```ts
export interface SqlMigration {
  readonly timestamp: number;
  readonly name: string;
  readonly statements: readonly SqlStatement[];
  readonly expectedTables: readonly string[];
}

export interface SqlStatement {
  readonly text: string;
  readonly values?: readonly unknown[];
}
```

The runner receives connection options, a history table name, an advisory-lock key, and an ordered migration list. It does not import an ORM package.

For each run it:

1. opens one PostgreSQL client;
2. acquires a session advisory lock;
3. inspects the configured history table and existing application tables;
4. applies or adopts each migration in timestamp order;
5. runs each migration and its history insert in one transaction;
6. always releases the advisory lock and closes the client.

Concurrent runners serialize on the advisory lock. Any failed statement rolls back that migration and leaves later migrations unapplied.

### Existing history compatibility

Account continues using `account_migrations`; Match continues using `match_migrations`. Their existing rows use `timestamp` and `name`, so the raw runner reads them directly. The converted migrations retain these exact identifiers:

- `1788347565485 / InitialAccountSchema1788347565485`
- `1788347664586 / InitialMatchSchema1788347664586`

If the matching row already exists, the runner skips its DDL. Existing data is not read, rewritten, or copied.

Auth and Chat receive frozen initial baselines and use `auth_migrations` and `chat_migrations`. A database without application tables receives the raw baseline DDL. A database that already has all expected application tables but has no new history row enters adoption mode:

1. query the PostgreSQL catalog;
2. compare tables, columns, types, nullability, defaults, primary keys, unique constraints, foreign keys, indexes, and generated expressions with the committed frozen manifest;
3. abort without schema or history changes on any mismatch or partial schema;
4. create the history table and record the baseline only after an exact match.

Account and Match use the same adoption rule if their history table is absent but their application tables already exist.

### Fresh database DDL

Committed raw SQL migrations define all four frozen entity groups. Account and Match are exact translations of their current migration DDL, except that fresh Match databases do not create an ORM-internal generated-column metadata table. Auth and Chat baselines are derived once from the approved frozen schema and then committed as ordinary SQL; runtime generation and automatic synchronization are forbidden.

Migration entry points remain native ESM and expose named functions for smoke tests. They do not run when imported.

## Removal Scope

The implementation deletes or replaces:

- `typeorm` and `@nestjs/typeorm` from every package manifest and the lockfile;
- the `@core/database/typeorm` export;
- TypeORM database options and module wiring;
- the former TypeORM entity tree;
- TypeORM transaction adapter and context;
- TypeORM `BaseRepository` and value transformers;
- TypeORM migration interfaces, data sources, and query runners;
- TypeORM-specific logger integration;
- TypeORM-based live parity and metadata-normalization tests;
- obsolete coexistence design and plan documents after this design and its implementation plan supersede them.

Active TypeScript, JavaScript, JSON, YAML, package manifests, and the lockfile must contain no imports, dependencies, module names, classes, decorators, or runtime references to TypeORM. Removal-design documentation may name the retired technology to explain the change. Git history remains unchanged.

## Error Handling and Safety

- Missing database configuration fails before a connection attempt.
- Empty schema selection fails during module construction.
- Migration drift or a partial pre-existing schema fails closed before history adoption.
- Migration history with a known timestamp but a different name fails as corruption.
- Migration history with an unknown newer timestamp is not modified and causes a clear compatibility failure.
- Cross-adapter nesting is no longer possible at runtime because only the MikroORM adapter is registered, but ownership checks remain to protect tests and future adapters.
- Automatic schema synchronization remains disabled.
- The disposable PostgreSQL verification retains randomized database names, loopback-only hosts, non-default ports, database markers, and checked container cleanup.

## Testing Strategy

### Contract-first removal test

Add a repository-level Node test before production changes. It scans active sources, package manifests, exports, scripts, and the lockfile and fails while any TypeORM dependency or runtime reference remains. Documentation and Git metadata are excluded.

### Core tests

- `DatabaseModule` selects MikroORM entity groups and binds the default transaction boundary.
- MikroORM transaction adapter contracts remain green.
- Raw runner tests cover ordering, advisory locking, commit, rollback, cleanup, matching history, mismatched history, empty database application, exact-schema adoption, partial-schema refusal, and drift refusal.
- Frozen metadata tests validate all 34 MikroORM entities without comparing against another ORM.

### Repository and batch tests

Each converted repository keeps or gains tests for its public port behavior. Batch tests validate cursor progression, page boundaries, transactional writes, and expired-feed updates using MikroORM test managers or focused fakes at infrastructure seams.

### Live PostgreSQL tests

For USER, AUTH, MATCH, and CHAT on randomized disposable databases:

1. apply raw migrations to an empty database;
2. initialize MikroORM with `synchronize: false`;
3. require an empty MikroORM update-schema diff;
4. verify insert/update timestamp behavior uses the database clock;
5. insert sentinel application data, remove only the new baseline history where applicable, rerun the migration runner, and verify adoption preserves the sentinel row;
6. verify a deliberately partial schema and a deliberately drifted schema are rejected without being modified.

### Final verification

Run under `nvm use 24`:

```sh
pnpm install --frozen-lockfile
pnpm build:workspaces
pnpm test:workspaces
pnpm test:esm-contract
pnpm test:esm-dist
pnpm test:postgresql-contract
```

Also run the new removal contract and confirm the worktree is clean, no disposable containers remain, and the merged base branch passes the same verification.

## Delivery

All implementation commits are created in `/Users/kangjuhyup/Documents/gaegaeting/.worktrees/remove-typeorm` on `refactor/remove-typeorm`. After green verification, the branch is merged locally into `infra/feat/auth-service-app`. The merged tree is verified again, then the temporary worktree is removed and the feature branch is deleted. No remote push is part of this task.
