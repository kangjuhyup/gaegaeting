# Shared local Auth and PostgreSQL

Vote owns the single local Auth and PostgreSQL containers. Logical boundaries
remain explicit:

- Auth tenants: `e-vote`, `gaegaeting`
- Auth clients: project-specific; never reuse the Vote login or resource client
- PostgreSQL databases: `vote`, `auth`, `ggt_account`, `ggt_match`
- OIDC issuer for Gaegaeting: `http://localhost:3002/t/gaegaeting/oidc`
- OIDC issuer for Vote: `http://localhost:3002/t/e-vote/oidc`

From the Vote repository, copy the legacy Auth database once and start Compose:

```bash
pnpm dev:auth:share-db
COMPOSE_PROJECT_NAME=ui docker compose up -d --wait
```

From this repository, move the current Account database into the shared
PostgreSQL container once:

```bash
pnpm dev:account:share-db
```

Both migration commands retain dumps under `.tmp` and preserve the previous
database/container for rollback. Do not remove the legacy containers or
databases until both projects have passed their authentication regressions.

Run `scripts/bootstrap-gaegaeting-auth.mjs` against `http://localhost:3002`
after the shared Auth starts. The bootstrap is idempotent and aborts on a
conflicting client rather than changing `e-vote` configuration.
