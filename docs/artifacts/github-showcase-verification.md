# GitHub showcase verification ? 2026-10-29

Status: local documentation and representative runtime verification complete; publication pending.

Application revision: `4023ce1c767f` on local `development`. Public `main` at `b35cb5a6ca24` merges this revision; their file-tree diff was empty. Changes are isolated on `docs/github-showcase`. No application code, dependencies or release state changed.

## Reproduction and checks

Used Node **24.11.1**, pnpm **9.15.9**, existing cached dependencies and a disposable PostgreSQL **18** container. The declared CI runtime remains Node 22; no Node 22 reproduction or hosted CI result is asserted. See [command outcomes](github-showcase-command-results.json) for timings, commands and trimmed output.

| Check | Result |
|---|---|
| `pnpm install --frozen-lockfile --offline` | Exit 0; 801 packages reused, none downloaded; Prisma generation completed |
| Shared-schema build and `pnpm --filter api db:deploy` | Exit 0; all eight checked-in migrations applied to a fresh database |
| Vehicle, geo, catalog, shipping and staff seed commands | All exit 0; synthetic records only |
| `pnpm lint` / `pnpm typecheck` | Both exit 0 in the isolated worktree |
| `pnpm test` | Exit 0; **96 files, 932 tests passed**, including API integration tests |
| `pnpm build` | Exit 0; all three workspace build tasks successful, no cache hits |
| `pnpm check:budget` | Exit 0; existing route budgets passed |
| Chromium representative smoke | Storefront HTTP 200/RTL at 1440px; 360px without horizontal overflow; synthetic staff mock-OTP login and product admin HTTP 200; no browser page errors observed |

An earlier web/schema-only run passed 37 files / 411 tests on the original, unchanged application tree. The later full-suite results above supersede that limited test count.

Docker was initially stopped. Starting the installed Docker Desktop succeeded; the existing PostgreSQL 18 image was reused without downloading it. The disposable database used loopback port 55439 and tmpfs storage, with a separate `_test` database. No customer database or production endpoint was used. No real credential, OTP or cookie was written to evidence files.

## Visual evidence

- [Storefront](storefront-desktop.png): real application, 1440x1000, seeded category counts, reduced motion.
- [Staff products](admin-products-desktop.png): real authenticated application with synthetic catalog records, 1440x1000.
- [Browser result summary](github-showcase-browser-results.json).

Both screenshots were visually inspected. The staff capture used the actual request/verify mock-OTP endpoints. An initial harness log parser failed to extract ANSI-formatted OTP output; stripping ANSI formatting fixed the helper, with no application change. No generated screenshot or customer record was substituted.

README and setup were rendered with GitHub's Markdown API and visually inspected
in Chromium. Both rendered without broken images or horizontal overflow; all
20 relative targets in the README, setup and verification documents resolve to
tracked files or files included in this change. Documented script names match
the manifests. `git diff --check` passed.

## Bounded source review and limits

Reviewed checkout initiation and the payment provider factory to support the README decisions: server-derived totals, purchase/address/shipping snapshots, transactional order/payment creation, stock reservations, failure cleanup, and mock/Zarinpal selection with required merchant configuration. This is not a complete security, payment or concurrency audit.

Used codebase-memory project `ParsianStore`, fast index generation `2026-10-29T17:25:40Z`, focused symbols/snippets and one-hop caller/callee trace. Coverage flagged changed metadata and excluded scripts; material source was also read directly. No graph-based absence or exhaustive coverage claim is made.

The database tests exercise mocked payment behavior; this pass did not execute a separate browser checkout or run the complete Playwright suite. No live gateway, real SMS, production transaction, customer publication right, deployment reachability or hosted CI success was established. Existing pg driver deprecation warnings occurred during the passing test suite and were not changed by documentation work.

Contribution/ownership follow the confirmed handoff: Ramtin developed frontend/backend/database; Ash Tech Group owns the project. Existing launch backlog and credits remain applicable.
