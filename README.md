# ParsianStore

Persian-first (RTL) e-commerce platform for car spare parts — Iranian &
imported vehicles. Owned by Ash Tech Group.

**Single source of truth for scope, architecture, and phased delivery:
[`masterPlan.md`](./masterPlan.md).** Read it before touching this repo.
Shared coding rules for humans and AI collaborators live in
[`CLAUDE.md`](./CLAUDE.md); Codex loads the matching repository entry point in
[`AGENTS.md`](./AGENTS.md).

## Status

Core Phases 0–6 are shipped. Phase 7's main customer-account flows are live,
and the admin dashboard is implemented through P8.S9. Remaining work spans the
storefront backlog, account expansion, advanced admin tooling, hardening, and
launch. See [`tasks.md`](./tasks.md) for the dated working snapshot and
`masterPlan.md` for authoritative scope.

A shopper can browse categories, open a product page, search, save to a
wishlist, fill a cart, and check out to a paid order — with B2B wholesale
pricing, an address book, shipping zones/rates, coupons, and a pluggable
`PaymentProvider` (mock + Zarinpal sandbox). Signed-in users get My Orders,
addresses, wishlist, and My Garage; staff get admin order management and
product CRUD with inventory adjust.

Known-open by design, not oversight: brand/vehicle landing pages and product
compare (deferred out of Phase 5), wallet and pay-on-delivery, and the rest of
the admin dashboard. The English locale is suspended — `fa` is the shipping
locale; `en` routing stays in place but is not maintained.

## Stack

TypeScript (strict) + Zod · Next.js 15 (App Router) · Express 5 ·
MongoDB/Mongoose · Tailwind CSS 3.4 (storefront) · MUI 7 (admin) · pnpm
workspaces + Turborepo. See `masterPlan.md` §2 for the full locked stack and
§4 for the exact dependency manifest — do not add a dependency outside it
without asking.

## Repository layout

```
apps/
  web/       Next.js storefront + admin (Tailwind + MUI, route-group split)
  api/       Express 5 API
packages/
  schemas/   Zod schemas + shared Persian-text utilities (src/fa.ts)
  config/    Shared ESLint/Prettier/Tailwind config
docs/        Audit notes, ADRs, generated API docs
legacy/      Pre-monorepo Create Next App prototype, kept for reference only
             while Phase 1+ rebuilds its UI in apps/web. Not part of the
             pnpm workspace — do not import from it.
```

## Getting started

Requires Node 22 (see `.nvmrc`), Docker Desktop, and pnpm (`corepack enable &&
corepack prepare pnpm@9 --activate`, or `npm i -g pnpm@9` if corepack can't
write to your Node install location).

```bash
pnpm install
cp .env.example apps/web/.env.local   # fill in what you need, mock providers work out of the box
cp .env.example apps/api/.env
pnpm dev     # starts MongoDB, then every app in the workspace via Turborepo
```

`pnpm dev` starts the project-scoped MongoDB container on port `27018` and
waits for it to become healthy before starting the API and web development
servers. MongoDB data persists in a Docker volume between sessions. Run
`pnpm dev:stop` when you want to stop the container. The normal Ctrl+C only
stops the web/API processes, allowing faster starts the next time.

Other workspace-wide scripts: `pnpm lint`, `pnpm test`, `pnpm build`, and
`pnpm e2e`.

### Optional local tooling

`pnpm optimize:landing` regenerates the committed landing artwork in
`apps/web/public/landing/` from the git-ignored masters in `landing-src/`. It
needs **ffmpeg on your `PATH`** (or `$FFMPEG_DIR` pointing at its `bin`) for the
video half — posters, the RTL-mirrored variants, and the re-encoded clips.

ffmpeg is deliberately **not** a repo dependency: nothing in `pnpm dev`, `lint`,
`test`, `build` or CI touches it, and the script still emits the full image set
without it, printing a notice for the video half it skipped. Install it only if
you are regenerating assets — `winget install Gyan.FFmpeg` on Windows,
`brew install ffmpeg` on macOS, your package manager on Linux.

Asset provenance, output layout and the byte budgets that output has to respect
are in `docs/landing-assets.md`.

For the temporary image-backed visualization catalog sourced from
`apps/web/public/products/digikala.csv`, run:

```bash
pnpm --filter api seed:visual-catalog
```

The idempotent importer keeps the first 100 unique records with a valid name,
price, and product image in the single `/c/visual-products` category.

The API needs MongoDB reachable at the `MONGODB_URI` in `apps/api/.env` before
it will serve anything. The default development URI uses the container managed
by `pnpm dev`; custom or production environments may point it elsewhere.

### Reading the logs

`turbo.json` sets `"ui": "stream"`, so every task's output is interleaved into
the terminal you launched it from, prefixed by task:

```
api:dev: [23:50:11] INFO: api listening on http://localhost:4000
api:dev: [23:50:19] INFO: GET /api/v1/catalog/products 200 12ms
api:dev: [23:50:21] WARN: ApiError: Product not found
web:dev:  ✓ Ready in 2.1s
```

Because it is an ordinary stream, it pipes and redirects normally —
`pnpm dev 2>&1 | grep api:dev` to watch one app, or `pnpm dev > dev.log 2>&1`
to capture a session. (Turbo's default `"tui"` would instead hide each task
behind an arrow-key-selected pane and make both of those useless.)

To watch a single app with no cross-talk: `pnpm dev:api` or `pnpm dev:web`.

The API logs through [pino](https://getpino.io) (`apps/api/src/config/logger.ts`),
prettified in development only — production emits JSON on stdout. Per-request
lines come from `apps/api/src/middleware/httpLogger.ts`, which collapses each
request to one line and stays quiet about `/api/v1/health` and `/uploads/*`.
Failed requests log their reason from `apps/api/src/middleware/error.ts`: 4xx at
`warn`, 5xx at `error`.

Verbosity is `LOG_LEVEL` in `apps/api/.env` (`trace` `debug` `info` `warn`
`error` `fatal` `silent`; defaults to `info` when unset). `LOG_LEVEL=warn`
narrows the output to failing requests only.

## Branching & workflow

```
main         protected · release only · never pushed to directly
development  integration branch · every completed step lands here
feat/*       optional, for steps touching more than ~15 files
```

Commits follow Conventional Commits with a mandatory phase/step tag:
`<type>(<scope>): [P<phase>.S<step>] <subject>`. See `masterPlan.md` §12.

**Manual follow-up (cannot be set from a local git client):** configure
GitHub branch protection on `main` and `development` — require the CI
workflow (`.github/workflows/ci.yml`) to pass and require PR review before
merge to `main`. This needs to be done once in the repo's GitHub Settings →
Branches by someone with admin access.

## Claude + Codex collaboration

Claude and Codex are peers working in the same checkout. Both follow
`masterPlan.md`, `CLAUDE.md`, and `tasks.md`; `AGENTS.md` keeps Codex pointed at
the same rules instead of maintaining a competing instruction set.

Before editing, each collaborator must inspect `git status` and preserve work
already present in the tree. Do not revert, reformat, stage, or commit another
collaborator's changes unless the owner explicitly asks. Record durable project
status in `tasks.md` (or the relevant ADR), not in private chat context, and
leave the worktree buildable with the relevant checks reported.
