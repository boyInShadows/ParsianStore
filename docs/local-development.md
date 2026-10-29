# Local development and review

This describes the checked-in workspace. See the [verification note](artifacts/github-showcase-verification.md) for checks completed and runtime work still pending.

## Prerequisites and configuration

Use Node 22 (`.nvmrc`), pnpm 9.15.9 (`packageManager`) and isolated PostgreSQL 18. After cloning and `pnpm install --frozen-lockfile`, provide configuration through the process environment. On the maintainer's Windows workstation, real secrets belong in Windows user environment variables. Restart the terminal after changing user variables. [`.env.example`](../.env.example) documents configuration names and non-production examples.

Required API variables, validated in [`env.ts`](../apps/api/src/config/env.ts):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Connection to your isolated PostgreSQL database |
| `JWT_ACCESS_SECRET` | Access-token signing secret, at least 32 characters |
| `JWT_REFRESH_SECRET` | Separate refresh-token signing secret, at least 32 characters |

For review, use `PAYMENT_PROVIDER=mock` and `SMS_PROVIDER=mock`. Web/API defaults are `http://localhost:3000` and `http://localhost:4000`. When changing ports, keep `CORS_ORIGINS` and the web API URL variables in the example consistent; the first CORS origin also builds the payment result redirect.

`NEXT_PUBLIC_API_URL` is the browser API origin and is compiled into the web build. `API_INTERNAL_URL` can override the server-side connection. Supply the intended values before building; changing only runtime variables does not rewrite the browser bundle.

Root `compose.yaml` supplies development PostgreSQL on host port 5433 with persistent data. It is not the production deployment configuration. `pnpm dev` runs a database preflight; if Docker cannot start, it warns and continues, and the API still requires a reachable, migrated database. Use synthetic records in a separate review database.

## Database preparation and startup

With the isolated database running and environment variables available:

```bash
pnpm --filter schemas build
pnpm --filter api db:deploy
pnpm --filter api seed:vehicles
pnpm --filter api seed:geo
pnpm --filter api seed:catalog
pnpm --filter api seed:shipping
pnpm dev
```

These are existing manifest commands. Seeds modify the selected database, so check the target first. The catalog seed generates illustrative products and fitment; it does not represent customer stock. Visit `http://localhost:3000/fa` and check `http://localhost:4000/api/v1/health`.

For staff review, set `ADMIN_SEED_PHONE` to a synthetic local-only identity and run `pnpm --filter api seed:staff`, then use the existing mock-SMS authentication flow. Mock OTPs appear in the local API log rather than being sent to a real phone; keep them out of public artifacts. This flow was exercised for the admin screenshot.

`pnpm dev:api` and `pnpm dev:web` start individual apps. `pnpm dev:stop` stops development compose services without removing persistent data. Production uses `compose.prod.yaml` and separate resources; see [deployment](deployment.md).

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm e2e
```

The API suite creates/migrates a test database and truncates tables. `TEST_DATABASE_URL` can select a connection, but the database name must still end in `_test`. Use disposable data. The web/shared-schema subset does not need the API database:

```bash
pnpm exec vitest run --project schemas --project web
```

Playwright starts the API and a production web build. Inspect `playwright.config.ts` for port conflicts and configure `E2E_PORT`/`E2E_BASE_URL` consistently if needed. Unit tests do not establish browser behavior, accessibility, a deployment or live payments.

## Optional operations

- `pnpm optimize:landing`: optimized landing assets; ffmpeg is needed only for video outputs. See [asset provenance and budgets](landing-assets.md).
- `pnpm --filter api seed:visual-catalog`: optional visualization importer, not required for basic setup; inspect input/provenance before public use.
- Task logs stream to the terminal; `LOG_LEVEL` controls API verbosity.
- `legacy/` is reference material outside the active workspace.
