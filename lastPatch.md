# lastPatch.md — overnight session, 2026-09-15 → 16

**Phase 15 is closed. No open steps remain.** 13 commits, all pushed to `development`.
Working tree clean, `pnpm check:budget` exit 0, all suites green.

---

## The headline

| | Before | After |
|---|---|---|
| Landing first-load JS | 199.9 kB | **186.8 kB** |
| Landing CLS | 0.0322 | **0.0000** |
| Landing LCP | 1930 ms | 1857 ms |
| Landing TBT | 92 ms | 68 ms |
| Budget gate | WARN (76 bytes from failing) | **exit 0, ratcheted to 190** |

PLP, PDP, garage, cart and login each dropped ~13 kB too — this was not a
landing-only fix.

---

## What you asked for first: the database

**Your migration was never the problem. It has been 100% complete since
2026-08-28.** Verified, not remembered: no `mongoose`/`mongodb` dependency
anywhere, no `src/models/`, zero Mongoose runtime patterns, 32 Prisma models,
8 applied migrations, 51 files on Prisma. It is **Prisma + PostgreSQL**.

**The "2 database structures" was an orphaned Docker volume** —
`parsian-store_parsianstore-mongodb`, created 2026-08-08, 243 MB of old data.
`docker compose down` never removes named volumes, so it outlived the code that
used it. Backed up to
`D:\coding\Projects\ParsianStore\_backups\mongodb-volume-20260916.tar.gz`
(archive verified readable) and deleted. Also removed a dead `MONGODB_URI` —
with a live credential — from your local `apps/api/.env`.

**The serious finding was underneath it: the repo had no production deploy path
at all.** No Dockerfile, no deploy script, and `compose.yaml` referenced a
`compose.prod.yaml` *twice in its own comments* that was never written. That
file hardcodes the database password `parsianstore`. **Had you finished that VPS
deploy, your production database would have been running on a development
password.** Stopping when you did was the right call.

Now shipped: both Dockerfiles, `compose.prod.yaml` (every secret `${VAR:?}` with
no defaults, Postgres publishes **no ports**, `NODE_ENV=production` pinned so a
`_test` database is structurally impossible), `.env.production.example`,
`.dockerignore`, and **`docs/deployment.md`** — a full runbook with a
*"Leftovers from the MongoDB era"* section and an *"I see two databases"*
troubleshooting entry. Every command in it was executed before being written
down: images build, stack comes up healthy, 8 migrations apply, 5 seeds run, and
real requests flow web → api → Postgres.

**Documentation that was actively lying is fixed.** Your README claimed the stack
was *MongoDB/Mongoose* and that `pnpm dev` *"starts MongoDB on port 27018"*.
`schema.prisma`'s header still said *"the app still runs on Mongoose."* That is
exactly what sent you — and Codex — hunting for a Mongo container. The Mongo
*comparisons* deeper in the schema were kept on purpose: they record what one
engine can do and the other cannot.

---

## The Phase 15 steps

**S7 — budgets written down.** `docs/engineering-standards.md` gained a
Performance budgets section. It was a *correction* as much as an addition: the
block it replaced quoted TBT 130 ms (it is 64) and "route JS 190 KB against a
180 KB budget" — which is Next's `Size` column and never what the landing cost.

**S8 → S8b — 13.1 kB recovered.** Three attempts found nothing before the fourth
worked. Zod reached the client by **two independent paths**, and neither could be
removed alone — which is why partial fixes measured exactly zero, twice. Path 2
was found only by *enumerating* the client graph instead of theorising: 111
files, tracking `'use client'` inheritance. The garage path's entire zod
dependency turned out to be the question *"is this a UUID."* The hand-written
replacement copies zod's own regex verbatim, with a 17-case test asserting both
implementations agree.

**S9 — CLS to zero.** Replaced `next/font/local` with a hand-written `@font-face`
and a real `<link rel="preload" as="font" crossorigin>` in `<head>`, verified
from served HTML rather than source. `display: optional` finally holds — the
acceptance test was S3c's own failure mode and passed **6/6** against a
"more than 4 of 6" bar. `patches/next.patch` deleted as *provably* dead.

**S10 — the loading bar works, but the plan was wrong.** `generateMetadata` does
**not** resolve before the flush on Next 15.5.21; hoisting `notFound()` there
leaves bad slugs at **200** and drops visitors on Next's built-in **English LTR**
404. The fix is a segment `layout.tsx`, outside the Suspense boundary. All five
routes now 404 correctly in Persian, and the not-found vs API-down distinction
holds. `/vehicle/*` gained a localised 404 **it has never had**.

**S11 — your reveal stagger was never running.** Measured on two real builds:
`0s, 0s, 0s, 0s` → `0s, .06s, .12s, .18s`. The `transition` **shorthand** was
resetting `transition-delay`, and source order never entered into it. **Six
groups on the landing will feel different — worth a look.**

**S12 — `.gitattributes`.** Line endings no longer depend on each clone's local
config. Every tracked binary was sha256'd before and after renormalising;
combined digest identical.

**S13 — safety rail on the `TRUNCATE`.** `resetDb()` now refuses any database not
named `*_test`, with no escape hatch. Proven by pointing `TEST_DATABASE_URL` at
your **real dev database**: 320 products before, refusal, 320 after.

---

## Two things I got wrong, and corrected

1. **I claimed the root `vitest run` wipes the dev database.** It does not — that
   was fixed on 2026-08-28. I had inherited the claim from my own notes and
   written it into `tasks.md` without checking it against the code. A delegated
   agent challenged it and was right. Retracted in `e74ba68`.
2. **I claimed the landing's zod came from a barrel-import leak** via
   `Header.tsx` and `manifestData.ts`. Converting both in one build recovered
   **zero bytes**. The real cause was elsewhere. Recorded in `d24aa41`.

Both share one lesson, now written into the repo: **fingerprint the artifact
before theorising about what put it there.** Two full agent runs were spent
reasoning from an import graph without once checking chunk *contents*.

---

## Open for you

- **The reveal stagger changes how the landing feels.** You have only ever seen
  the page without it. Worth judging.
- **`(b)` the garage label's Gregorian year** — «سایپا پراید ۱۱۱ ۲۰۲۰».
  **Not** a mechanical `formatJalali` fix: that `year` is a model year matched
  against `gen.yearFrom`/`yearTo`, so converting it would break generation
  matching. A product decision.
- **`(d)` header chip CLS 0.0007** — a `min-w-` floor would close it.
- **`check-budget.mjs`'s PLP comment is stale** — says "measures 155.0 / 35.1",
  actually 142.4 / 22.5. That drift is S8b's recovery, *not* a new one; do not
  ratchet on it without re-measuring.
- **A pre-existing flake**: `apps/api/src/seed/catalog.test.ts` Persian-substring
  search fails in a full run, passes alone. Not caused by anything here.
- **Before launch**: TLS/reverse-proxy, and `SMS_PROVIDER`/`PAYMENT_PROVIDER`
  still default to `mock`. Also the branded HiggsField loader — the one-component
  seam is in place, and RBAC is still queued.

---

## Commits

```
c2da3bf  chore(repo): [P15.S12] settle line endings once, for every clone
b1187a6  feat(web): [P15.S10] the loading bar finally shows, because the premise was wrong
9489313  fix(web):  [P15.S11] the reveal stagger was never running
b904716  perf(web): [P15.S9]  own the font tag, and CLS goes to zero
03235ba  fix(api):  [P15.S13] the safety rail moves to where the damage happens
35450ca  feat(repo): a real production deploy path, and the Mongo leftovers
320d783  docs(repo): ratchet the landing budget to 190/188/70, close P15.S8b
8d48d1e  perf(web):  13.1 kB off every shop route — zod leaves the client graph
d24aa41  docs(repo): P15.S8 — two disproved hypotheses, and the attribution
2a8bb69  refactor(web): subpath imports, and a test alias that never resolved
e74ba68  docs(repo): [P15.S7] write the budgets down, and retract a wrong finding
eed6b64  fix(api):   the harness port was never allowed to talk to the API
```
