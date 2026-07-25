# ADR 0001 — TypeScript instead of plain JavaScript

**Date:** 2026-07-25
**Status:** Accepted

## Context

`masterPlan.md` v1.0 locked the language decision as plain JavaScript (ESM)
+ JSDoc + Zod (§2.2), and flagged it as "the single most expensive decision
to reverse" — cheap only before P0.S2, roughly a full week of cost after
Phase 2.

Execution reached P0.S1 (competitor audit, `docs/audit.md`, commit
`0cd2583`) and P0.S2 (pnpm/Turborepo monorepo scaffold + `CLAUDE.md`, commit
`e57612d`) — both pushed to `development`. Neither step produced any
application code: P0.S1 is a research document, P0.S2 is repo/tooling
wiring (`pnpm-workspace.yaml`, `turbo.json`, root `package.json`, `.nvmrc`,
`.gitignore`, `.env.example`, `README.md`, `CLAUDE.md`). `apps/web` and
`apps/api` — the workspaces where language choice actually has a footprint
— had not been created yet.

At this exact point, the project owner explicitly requested TypeScript
instead, on the stated basis that the stack is React + Next.js (MERN-style),
and asked for the decision to be recorded.

## Decision

Adopt **TypeScript in strict mode** across `apps/web`, `apps/api`,
`packages/schemas`, and `packages/config`. Zod schemas remain the runtime
validation layer (client + server, shared via `packages/schemas`); static
types are inferred from those schemas via `z.infer<>` wherever practical
instead of hand-duplicated interfaces, so there is one definition of a
shape, not two.

Concrete conventions locked by this decision:

- File extensions: `.ts` for non-JSX modules, `.tsx` for JSX/React
  components, repo-wide.
- A shared `tsconfig.base.json` at the repo root sets `strict: true`,
  `target: ES2022`, `skipLibCheck: true`, `esModuleInterop: true`,
  `resolveJsonModule: true`, `forceConsistentCasingInFileNames: true`,
  `isolatedModules: true`. Each workspace's own `tsconfig.json` extends it.
- `apps/web` (Next.js): `moduleResolution: bundler`, `jsx: preserve`,
  `plugins: [{ name: "next" }]` — Next's own requirements layered on the
  base.
- `apps/api` (Express, ESM): `module`/`moduleResolution: NodeNext`,
  `package.json` `"type": "module"`. Relative imports in `.ts` source use an
  explicit `.js` extension (e.g. `import { app } from './app.js'` inside
  `server.ts`) — required by NodeNext's ESM resolution, not a mistake.
  `tsx` runs the dev server directly against `.ts` source with watch mode;
  production build compiles via `tsc` to `dist/` and runs via plain `node`.
- `packages/schemas` and `packages/config` ship as TypeScript **source**,
  no build step — `apps/web` transpiles them as workspace packages via
  Next's own toolchain, `apps/api` transforms them on the fly via `tsx`.
  This avoids a build-ordering problem in Turborepo for internal packages
  during Phase 0; revisit if a published/standalone build is ever needed.
- ESLint gains `typescript-eslint` (the unified flat-config package)
  alongside the already-planned `eslint-plugin-react` /
  `eslint-plugin-tailwindcss`, wired in P0.S4. The custom rules banning
  physical-direction Tailwind classes and raw hex literals apply to `.tsx`
  exactly as they would have applied to `.jsx`.

`masterPlan.md` §2.1, §2.2, and §4 are amended in place (v1.0 → v1.1) rather
than left to silently drift from what's actually being built, per the
document's own amendment rules (§16).

`legacy/` (the pre-monorepo Create Next App code, moved there in P0.S2) is
explicitly **not** converted — it stays as frozen plain-JS reference
material outside the pnpm workspace, per the owner's choice to keep rather
than delete it.

## Consequences

- New devDependencies across every workspace (see `masterPlan.md` §4 for the
  exact list per package): `typescript`, `typescript-eslint`,
  `@types/react`, `@types/react-dom`, `@types/node` (web); `@types/node`,
  `@types/express`, `@types/cors`, `@types/compression`,
  `@types/cookie-parser`, `tsx` (api); `typescript` (both `packages/*`).
- Every file written from P0.S3 onward is `.ts`/`.tsx`. Nothing already
  committed needs to be rewritten — this is the entire point of doing it
  now instead of later.
- `README.md`'s stack summary line is corrected from "Plain JavaScript
  (ESM) + JSDoc + Zod" to "TypeScript (strict) + Zod" to match.
- Slightly more setup ceremony per workspace (a `tsconfig.json` each) in
  exchange for compile-time safety across the monorepo boundary — judged
  worth it given the project's stated multi-phase, multi-agent lifespan
  (masterPlan.md §0, rule 10: "written to be extended by a different agent
  who has not seen this conversation").
