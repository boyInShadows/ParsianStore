# ParsianStore

Persian-first (RTL) e-commerce platform for car spare parts — Iranian &
imported vehicles. Owned by Ash Tech Group.

**Single source of truth for scope, architecture, and phased delivery:
[`masterPlan.md`](./masterPlan.md).** Read it before touching this repo.
Always-on coding rules for agents/contributors live in [`CLAUDE.md`](./CLAUDE.md).

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
  schemas/   Zod schemas + shared Persian-text utilities (fa.js)
  config/    Shared ESLint/Prettier/Tailwind config
docs/        Audit notes, ADRs, generated API docs
legacy/      Pre-monorepo Create Next App prototype, kept for reference only
             while Phase 1+ rebuilds its UI in apps/web. Not part of the
             pnpm workspace — do not import from it.
```

## Getting started

Requires Node 22 (see `.nvmrc`) and pnpm (`corepack enable && corepack
prepare pnpm@9 --activate`, or `npm i -g pnpm@9` if corepack can't write to
your Node install location).

```bash
pnpm install
cp .env.example apps/web/.env.local   # fill in what you need, mock providers work out of the box
cp .env.example apps/api/.env
pnpm dev     # runs every app in the workspace via Turborepo
```

Other workspace-wide scripts: `pnpm lint`, `pnpm test`, `pnpm build`.

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
