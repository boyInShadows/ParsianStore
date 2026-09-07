# ParsianStore — Handoff Brief for Fable (next planning round)

**Written:** 2026-09-07 · **Repo:** `D:\coding\Projects\ParsianStore\parsian-store`
· **Branch:** `development` · **Last commit:** `523b4e5`
· **Audience:** a planning model that has *not* seen this codebase, cannot run
it, and cannot read its git history.

Companion to `docs/landing-rebuild-brief.md` (the 2026-08-20 brief that produced
the Phase 9 plan). That one introduced the product; this one hands over a
**running system with eleven phases of history behind it** and asks for the next
plan. Read §2 before anything else — it is about how the last plan went wrong,
and it is the part that will decide whether this one is usable.

---

## 0. What you are being asked to do

Produce a **step-level implementation plan** for the next block of work. Not
code. The implementing agent (Claude, working inside this repo) executes it one
step at a time, committing after each.

A plan is usable here when:

- every claim in it is **reproducible** — it names the file, the number, or the
  command that proves it;
- every step ends with a green `pnpm lint && pnpm test && pnpm build` and one
  commit;
- each step names the **files it touches**, what to **do**, and an **Accept**
  condition that is checkable, not aspirational;
- it violates **none** of the hard rules in §3.1 — those are enforced by ESLint
  and CI, so a plan that breaks one is a plan that cannot ship;
- where something is genuinely the owner's call, it says so and **recommends
  one option** rather than silently picking (see §8).

---

## 1. What just happened — the session this brief closes

**The tree did not build.** `HeroV2.tsx` imported `./StationOutline`, and that
file had never been written; the previous session ended mid-P13.S11 with the
import in place and the component missing. `Module not found` on every start.

**Fixed.** `apps/web/components/landing/HeroV2/StationOutline.tsx` now exists: a
Server Component rendering an `sr-only` ordered list of the hero's three
chapters and their nine stations, in the order the parts leave the car. It reads
`CHAPTER_SEQUENCE` (the same table the animation's beats are solved from) and
`calloutSubjectByLayerId()` (the same map the on-screen plates read), so it
cannot drift into describing an animation the page no longer plays. It is the
only place on the page that states the *order* — screen-reader content and
crawlable text in one node.

Verified: `tsc --noEmit` clean · `pnpm lint` clean · `pnpm test` **685/685 in 79
files** · the dev server returns 200 with the outline present in the HTML.
**All of it is uncommitted** — nine paths in `git status`, last commit still
`523b4e5`. The first commit of the next session is this S11 work.

**`fableTasks.md` v1.1 was deleted**, at the owner's request, with S12–S14 still
open. Before deleting it, its remaining specifications were written into
`tasks.md` as a `## Phase 13` section. **`tasks.md` is now the plan of record.**
That is the established pattern here: the Phase 9 and Phase 12 Fable plans were
deleted the same way on 2026-09-05, and roughly forty source comments still cite
all three by section (`fableTasks §3.2`, `fableTasks2 §2.1`,
`fableTasks v1.1 P13.S7`). Those citations are not dangling references — the
phase sections of `tasks.md` are what they resolve to. **Read `tasks.md` first;
it is long, and it is deliberately fuller than a checklist.**

---

## 2. Read this before you plan anything: how the last plan went wrong

The audit behind fableTasks v1.1 was **about one third wrong**, and the errors
were not random. They came from one method: auditing a *rendered page* without
repo history. That method reliably produces two failure classes.

### 2.1 It reads deliberate, tested decisions as bugs

Every one of these was filed as a defect and is, in fact, correct behaviour:

| Claimed defect | What it actually is |
|---|---|
| «۳۲ قطعه» counts look fabricated | Real, from `getSystemPartCounts` → `/catalog/facets`. Renders *nothing* rather than a zero when the API is down. |
| Brand wall shows only a few brands | A marquee over 15 brands, shipped P12.S12. The screenshot caught it mid-cycle. |
| Verification code is truncated | P12.S10's `EvidenceCode`. The ellipsis is CSS; the full value is in the DOM. |
| Symptom chips are not links | They are already `<a>`. |
| Best-seller images have bad `alt` | Already the product name. |
| Hero sprites have empty `alt` | Correct — one picture, one base alt. Lighthouse a11y is 100. |
| 36 interactive targets under 40px | Wrong threshold. WCAG 2.2 AA's minimum is **24px**. Measured: the brand wall at 35px and the closing row at 24px both **pass**. Only the footer links (22px) actually failed, and they are now `py-2`. |

### 2.2 It invents things that do not exist

`pnpm analyze` · `scripts/hero-shots.ts` · `docs/deferred.md` · a
`?featured=true` query param · category slugs `lighting`, `body-front`, `doors`
· a `/c` index route (there is only `/c/[slug]`, and the finale CTA pointing at
`/c` 404'd until the landing link sweep caught it).

### 2.3 The rule this gives you

**Do not file a defect you cannot ground.** For each finding, state *how it
would be reproduced* — the file, the selector, the command, the measured number.
If you are inferring from a screenshot, mark it as an inference and say what
would confirm it. A plan of thirty steps where ten are chasing non-defects costs
more than a plan of twenty that are all real, because each false one still gets
investigated, and the investigation is where the time goes.

**Never invent an artefact.** If a step needs a script, a flag, an endpoint or a
route that you have not been told exists, the correct output is a `BLOCKED:`
note naming what is missing — not a plausible-looking name.

To its credit, the same audit got the two things that mattered structurally
right, and they are why Phase 13 exists: the hero animated a car coming apart
and **never said what came off**, and the parts manifest **rendered twice**,
which is the entire open TBT regression.

---

## 3. What you cannot see, and must not violate

This is the section the owner asked for specifically. None of it is visible from
the outside, and every item has cost a real session at least once.

### 3.1 Hard rules (ESLint- and CI-enforced — a plan that breaks one cannot ship)

1. **No hardcoded colors, spacing, radii, shadows or font sizes** anywhere
   outside `apps/web/styles/tokens.css`. Tailwind config and the MUI theme both
   read the same CSS variables. Zero hex literals elsewhere. If a design need
   is not covered by a token, **the step adds the token first**.
2. **No physical CSS direction properties. Ever.** Not `left`, `right`, `ml-`,
   `mr-`, `pl-`, `pr-`, `text-left`, `text-right`, `border-l`, `border-r`.
   Logical only: `ms-` `me-` `ps-` `pe-` `start-` `end-` `text-start` `text-end`
   `border-s` `border-e`. This is the whole reason shadcn/ui was rejected — its
   source ships physical classes.
3. **Money is an integer in Rial**, field names suffixed `Rial`, displayed only
   through `formatToman(rial)`. Never float math on currency.
4. **Dates are stored UTC ISO**, displayed only through `formatJalali(date,
   pattern)`. Never store a Jalali string.
5. **Server Components by default.** Every `'use client'` needs a one-line
   comment justifying it, and the directive is pushed as low in the tree as it
   goes.
6. **Every API input is Zod-validated**; every list endpoint is paginated
   (`?page&limit&sort`, `limit` capped at 100); every route returns
   `{ ok, data, meta?, error? }`.
7. **A controller never touches the ORM** — it calls a service. A service never
   touches `req`/`res`. Providers (`PaymentProvider`, `SmsProvider`,
   `StorageProvider`, `SearchProvider`) are reached only through their
   interface.
8. **TypeScript strict everywhere** in `apps/*` and `packages/*`. Prefer
   `z.infer<>` off the Zod schema over a hand-written parallel interface. No
   `any` as a shortcut.
9. **`legacy/` is reference-only** — a pre-monorepo prototype, frozen, not in
   the pnpm workspace. Never import from it.
10. **Never add a dependency** outside the manifest in `masterPlan.md` §4
    without asking.

### 3.2 The spacing scale is REPLACED, not extended

Tailwind's stock palette and spacing scale **are not present**. The only usable
spacing steps are:

```
0  1  2  3  4  6  8  12  16  20  24  32
```

`p-11`, `min-h-10`, `gap-5`, `mt-7` and friends **compile to nothing** — they
are not errors, they silently produce no CSS. A plan that specifies "pad to
44px" must say which step that is, or say "add a token".

### 3.3 Persian text, and the digit policy

`packages/schemas/src/fa.ts` already has `normalizeFa`, `toPersianDigits`,
`toEnglishDigits`, `formatToman`, `formatJalali`, `normalizePhone`. Grep before
writing a helper.

**The digit policy is enforced by a test on the locale file**
(`apps/web/messages/digits.test.ts`): Persian digits for anything read as a
number — quantities, prices, years, counts. Latin digits **only** inside
identifiers — part codes, SKUs, `SYS-05`, section plate numbers (`01`, `02`),
phone placeholders. The identifier exceptions are an explicit list, not a
pattern, because a pattern loose enough to allow `09xxxxxxxxx` is loose enough
to let the next stray `2007` through.

### 3.4 English is suspended

**Ship `fa.json` only.** No `en.json` parity, no `/en` verification. This was an
owner decision on 2026-07-30 (ADR `0016`); `en.json` is frozen and expected to
drift. **Do not plan an English backfill, and do not plan ripping out the
`next-intl` / `en` routing** — that is a separate, bigger, unrequested change.
Do not file the drift as a defect.

### 3.5 The state decision table (`docs/engineering-standards.md`)

Stop at the first matching row:

1. server-owned, no interaction → **Server Component `fetch`**
2. must survive a copied link / refresh / back → **URL search params**
3. server-owned but a client leaf reads or mutates it → **Zustand as a *cache*,
   re-fetched, never persisted** (`cart`, `wishlist`, `auth`)
4. browser-owned, server has no opinion → **Zustand + `persist`** (`garage`)
5. browser-owned but SSR must read it → **Zustand + `persist` + cookie mirror**
6. client form with server validation → **TanStack Query mutation**
7. ephemeral UI → `useState`, or Zustand if shared (`toast`)

Never copy server state into a store as the source of truth. `localStorage`
reads and writes always in `try/catch`, never during render.

### 3.6 The landing hero's actual model

Get these wrong and the plan describes a different page:

- **Ten parts, eleven layer elements** — not nine. The **windshield** undocks in
  chapter 3 and *deliberately* has no manifest row, because the catalogue has no
  glass route. Its plate has a name and no link. This is the one documented
  exception to "every detachment is a sale".
- **The hood is chapter 2's cover, not a beat.** Given a slot of its own it
  opened, shut, and then the piston and alternator emerged through a closed
  bonnet. It opens across `COVER_SWING`, stays open while the chapter plays
  inside it, and shuts at the end.
- **Chapters are sequential and each re-docks before the next opens** —
  `1:[0.02,0.34]  2:[0.36,0.66]  3:[0.68,0.98]`. One group in the air at a time;
  the visitor who scrolls to the bottom is looking at a whole car again. **Two
  e2e assertions pin this** (`e2e/landing-hero.spec.ts:515` "plays one part at a
  time, and is a whole car between chapters" and `:534` "the hero ends its
  scroll as a whole car"; Gate B's is at `:786`), so a plan
  that proposes cross-fading or ending exploded is proposing to delete passing
  tests, and must say so out loud.
- **The engine trio falls *down*** — the lifted hood owns the upper band.
- **Undock vectors are mostly vertical, and that is forced.** The square frame
  inside a 16/11 stage leaves only canvas rows ~130–894 visible, while the car
  already spans 103–926 horizontally. `heroLayout.test.ts` computes that band and
  fails anything that lifts out of sight.
- **Every sprite docks at NATIVE registration** (scale 1.000, dx 0, dy 0) — the
  sprites are masked cuts from the same render as the base. A test asserts it
  for all eight. **If a sprite looks misplaced, the cut is wrong, not the
  number**; three of them were catalogue product shots for two phases and no
  amount of scale/offset ever seated them.
- **The stage carries `dir="ltr"`.** The car is an object, not text — without it
  `insetInlineStart` mirrors around an unmirrored car.
- **`perspective` goes on the frame, never per sprite.** Seven vanishing points
  do not read as one object.
- **The callout layer must be INSIDE the square canvas frame.** As a sibling its
  percentages resolve against the stage's 814×560 box instead of the frame's 749
  square, and every anchor sits up to 40px off — while still looking almost right
  in a screenshot.
- **Captions live in a fixed stage-space slot, not beside the part.** A plate
  inside the camera is measured in canvas pixels, so chapter 1's 1.35 push-in
  magnifies it 35% exactly where the visible canvas is smallest. The headlights'
  caption rendered cut in half. There is no geometry that keeps the why-line.
- **The locale namespace is `Landing.manifest.*`**, not `landing.hero.*`.

### 3.7 `motion` has a transform-graph trap that no diff shows

Two ways a `useTransform` silently returns *last frame's* value:

1. **Never read a derived MotionValue and its own source in one transform.**
   `mix = useTransform(progress, …)`; a transform reading both `progress` and
   `mix` recomputes the instant progress changes, using the previous frame's
   `mix`. Symptom: the car finished ~10px of scroll short of docked. Fix: give
   the extra term its own one-hop value.
2. **`useTransform(() => …)` implicit tracking is unreliable through a nested
   closure.** Use the explicit form `useTransform([a, b], ([av, bv]) => …)`
   whenever more than one value is read.

Both produce a *plausible* picture and fail intermittently. Only an e2e
assertion on the **end state** caught it. **Scroll-linked work needs at least
one test that scrolls to a position and asserts where things ARE**, not just
that they moved.

---

## 4. Decisions already made — do not relitigate

- **The stack is locked.** No Tailwind v4, no shadcn/ui, no Radix, no Lucide, no
  CVA. `cn()` is `clsx` + **`tailwind-merge` v2** (v3 requires Tailwind v4).
- **No Storybook.** The in-app pages `/styleguide` (shop) and
  `/admin/design-system` (admin) are the documentation surface; the admin page
  iframes the storefront guide so Tailwind never enters the admin document.
- **Two design systems on purpose:** Tailwind for the shop, MUI for admin, both
  reading the same tokens.
- **`CATALOG_SYSTEMS` is a closed set of ten**, `SYS-01`…`SYS-10`, slugs
  `engine · suspension-steering · transmission · brakes · electrical ·
  body-exterior · cooling-ac · exhaust · interior · filters-fluids`. There are
  no other category slugs. Adding one is a schema change with consumers.
- **PostgreSQL + Prisma.** The Mongoose migration finished 2026-08-28; there is
  no Mongoose left. Do not plan against Mongo.
- **The site sells parts for Saipa and Iran Khodro vehicles only.**

---

## 5. Measurement discipline, and the numbers as they actually stand

**Measure, do not estimate.** The landing budget did not drift — it was simply
never re-measured for three phases. Route JS is read from
`pnpm --filter web build`'s own route-size output for `/[locale]`.

Current, at the time of writing:

| Metric | Gate | Now |
|---|---|---|
| Route JS `/` | ≤ **193 KB** gz | **197 KB** ✗ — *unverified; in no doc, re-measure* |
| `motion` chunk | ≤ 45 KB gz | 39.9 KB |
| LCP (mobile, throttled) | ≤ 2.0s | 1.65s |
| CLS | ≤ 0.05 | 0.034 |
| **TBT** | ≤ **200ms** | **261ms ✗ — and not re-measured since the fix landed** |
| Lighthouse perf / a11y / SEO | ≥90 / 100 / 100 | 94 / 100 / 100 |

The JS ledger, so you can see how a budget rots: 189 KB frozen in the docs at
P9.S17 → +1 → **+8 KB at P11.S2**, when 21 primitives moved onto `cn()` and four
of them are Client Components in the header, putting `tailwind-merge` into the
client graph of every route in one commit → +2 for a client leaf → 200. P12.S6
recovered 7 of the 8 by moving three of those four to `cx()` (clsx only, a
*separate module* — importing anything from `lib/cn.ts` pulls tailwind-merge),
with a test that fails any `"use client"` file importing `@/lib/cn` outside an
allowlist.

**The measurement recipe, copied not improvised:** production build →
`next start` on an explicit port → **`NEXT_PUBLIC_SITE_URL` set to that
origin** → Lighthouse mobile 360×640 DPR 2 with `--throttling-method=devtools`
→ **five runs, median reported**. Measure `/`, **never `/fa`** — `fa` is the
default locale with `as-needed` prefixing, so `/fa` 307-redirects and costs
about 0.6s of apparent LCP.

**`axe` at zero is necessary, not sufficient.** P9.S17 found a WCAG 2.5.3
failure axe cannot see by default: an `aria-label` replaces the whole accessible
name, so a link reading `SYS-01 موتور ۳۲ قطعه` on screen was named something
else — a Label-in-Name failure for a voice-control user. The fix pattern is an
`sr-only` span **inside** the link, never an `aria-label` **on** it.

### Environment traps — check these before believing any failure

- **Port 3000 is not ours.** Another project's stack answers there, and
  Playwright's `reuseExistingServer` trusts whatever responds — the default run
  can test someone else's site. Use an explicit `E2E_PORT`.
- **An orphaned API on :4000 is adopted without `RATE_LIMIT_DISABLED`.**
  Playwright only sets that on a server it starts itself. The link sweep then
  blows past the 100/min cap and Server Components degrade to 500s on
  `/about /faq /search /garage /account`, which reads as broken routes.
- **`rm -rf apps/web/.next` between a build and an e2e run**, or nine landing
  tests fail on a missing `data-theme` attribute — which looks exactly like a
  theming bug.
- **Kill the web server *before* deleting `.next`.** Otherwise it serves a
  directory that no longer exists and screenshots come back with no CSS and the
  car scattered — which looks like a catastrophic regression and is not one.
- **e2e runs against a production build, never `next dev`** — dev corrupts
  `prerender-manifest.json` and every route 500s.
- **The Postgres container dies mid-session** (`Exited (137)`). The landing page
  then silently degrades: `ShopByVehicle` returns null, `#shop-by-vehicle`
  vanishes, internal links fall ~35 → 19. One pass baked a page missing a whole
  section into six screenshot baselines before it was caught. Check `docker ps
  -a` first, and never regenerate baselines without confirming health.
- **The landing page is SSG and bakes its data at build time.** Restarting the
  API is not enough — rebuild.

---

## 6. Where the project actually stands

Full detail in `tasks.md`. Summary of everything open:

- **Phase 13 — the Job Card** (ACTIVE). S0–S10 shipped; S6 was absorbed into
  S3/S4/S7. Open: **S11** a11y tail (`suppressHydrationWarning` on `<body>` for
  the `cz-shortcut-listen` extension attribute; and the theme toggle, where the
  "empty circle in light mode" claim is **real but not the pre-hydration
  `disabled:opacity-0` state — that hides the ring too**. The toggle paints
  page-theme tokens inside a header that is `bg-graphite-950` in *both* themes,
  so light mode gives a 12.25:1 ring around a 3.38:1 glyph; its `aria-label` is
  hardcoded English besides). **S12** content defects. **S13** the performance
  gate — *the point of the phase, still unmeasured*, and its "assert
  `activePart` fires ≤12 times" line names an identifier that does not exist —
  the real budget is on the `data-shown` / `data-active` / `data-checked`
  attribute writes. **S14** close.
- **Phase 11 — design-system consolidation** (open, and it predates 13). S1–S3
  shipped. **S4** missing display primitives (Avatar, Separator,
  Progress, Alert, ErrorState, Link, Table, Accordion, DropdownMenu — `Spinner`
  is off this list, it shipped at P11.S3 — the last
  two need hand-written keyboard behaviour, since Radix was declined). **S5**
  retrofit ~122 components. **S6** validation pass.
  *Open owner decision at S6:* storefront `Badge tone="warning"` measures
  **2.16:1** on `--surface` — a real AA failure the styleguide axe test misses
  (axe files borderline cases under `incomplete`, and the test asserts only
  `violations`). The obvious darker step is the hue `--price` already owns,
  which would collapse a distinction the design deliberately keeps. **Owner's
  call, not to be invented.**
- **Phase 7 / 8 remainders** — user dashboard and admin dashboard tails.
- **Phase 9 — content, SEO, hardening** — blog/guides led by
  counterfeit-identification content, full JSON-LD, sitemap splitting,
  Meilisearch behind `SearchProvider`, Redis for rate limiting and token
  revocation, caching/ISR, error tracking, analytics, load testing, pen-test
  checklist, backup runbook.
- **Phase 10 — Launch.**
- **`(admin)` has no responsive shell** — fixed 220px sidebar, no collapse;
  `/admin/orders` overflows 795px at a 360px viewport. Its own step.
- **`CompareButton.tsx` talks to `localStorage` directly** instead of through a
  store — the one known outlier from the state table.

### The design debt, which is the largest unscheduled thing here

On 2026-07-30 the owner rated the UI/UX **1 out of 10**. That was about the
Phase 6/7 pages — checkout, cart, orders, address book — and it was a fair
read: plain bordered rows, uniform `gap-3`/`p-4` everywhere, no layering or
depth, almost no type-scale contrast, one interaction state (hover border
colour) repeated identically on every card. That is close to a checklist match
for this project's own banned-patterns list. It happened because a fast run of
steps optimised for "passes axe, lint, build, DoD" — and automated checks do not
catch *"this looks like a generic template."*

The landing page got real design investment and shows it. The transactional
pages did not.

**Correction, added after Fable's first pass caught it:** a design pass *was*
scheduled, and half of it shipped. **ADR 0025** (2026-08-04, Accepted) defines
the **"Workshop Docket"** direction — it counted the damage numerically (one
`rounded-lg border border-border bg-surface p-4` box **20 times**; one
`font-display text-h2 font-black` heading as the `<h1>` of **23 files**) and
added four tokens and seven primitives. The **account half** — `/orders`,
`/orders/[code]`, `/addresses`, `/account`, `/profile` — was rebuilt on it by
2026-08-10.

So the 1/10 description above is the **July** state; today it describes only the
**commerce half**: `/cart`, `/checkout`, `/checkout/result`, `/auth/login`, plus
`/wishlist`, `/garage` and `/compare`, which were never converted. **The visual
direction therefore already exists and is owner-signed** — a plan here extends
ADR 0025 rather than inventing one. Planning against the uncorrected paragraph
would have redesigned five finished pages.

---

## 7. What to plan

Pick **one** and produce a full step-level plan for it. If you think the order
is wrong, say so in one paragraph at the top and then plan the one you
recommend.

- **(A) Finish Phase 13** — S11 tail, S12, S13, S14. Smallest, closes an open
  phase, and S13 is a real measurement gate that is currently failing. The
  specifications already exist in `tasks.md`; a plan here is mostly sequencing
  and verification design.
- **(B) The design-pass phase** (would be Phase 14) — the 1/10 debt above.
  Largest value, least specified, and the one that needs a planning model most.
  It needs a stated visual direction, not "clean minimal".
- **(C) Finish Phase 11** — S4 display primitives, S5 the ~122-component
  retrofit, S6 validation. Unblocks (B) by giving it primitives to compose.
- **(D) Phase 9 hardening** — the pre-launch list. Mostly infrastructure.

**Numbering:** Phase 13 is current, so a new phase is **14**. Do not tag
anything `[P11.Sn]` — Phase 11 is open and those tags collide with real commits.
Commit format is `<type>(<scope>): [P<phase>.S<step>] <subject>`, and commitlint
only accepts a numeric step (a three-part step becomes three commits at the same
tag, which is how P9.S5 shipped).

---

## 8. Plan format contract

For each step:

```
### P<n>.S<m> — <title>
**Files:** the paths it touches
**Do:** the work, in the order it should happen
**Accept:** conditions that are checkable — a number, a command, a test name
```

And for the plan as a whole:

- **Definition of Done, every step:** RTL correct · light + dark verified ·
  responsive 360→1920 · keyboard reachable with visible focus · axe 0 violations
  · `prefers-reduced-motion` honoured · all strings in `fa.json` · `pnpm lint &&
  pnpm test && pnpm build` green · performance budget held on touched routes ·
  committed with the right tag and pushed to `development`.
- **Owner gates get their own section.** Anything that reverses a shipped
  decision — especially one with a test attached — must be listed as a gate with
  the tradeoffs and a recommendation, never executed silently. The last plan had
  three such gates and got them right; keep that.
- **Mark your confidence.** Split findings into *verified* (you can name the
  proof) and *inferred* (you are reading a screenshot). The implementing agent
  will check the inferred ones first, and it is much cheaper when it knows which
  those are.

## 9. Questions worth putting back to the owner

Do not answer these yourself; surface them:

1. The `--warning` ink contrast failure (2.16:1) — new token, or accept the
   collapse with `--price`'s hue?
2. اینماد / نشان ملی trust badges — keep them with "pending registration"
   legible on screen, or remove until real?
3. «ساعات پاسخگویی به‌زودی اعلام می‌شود» — real hours, or delete the line?
4. Does the design-pass phase get a stated visual direction from the owner, or
   does the plan propose one?

## 10. Files to read, in order

1. `tasks.md` — the plan of record, and every phase's reasoning.
2. `CLAUDE.md` — the always-on rules, distilled.
3. `masterPlan.md` — architecture, the §4 dependency manifest, §10 budgets.
4. `docs/engineering-standards.md` — the state table and the 2026 web baseline.
5. `docs/performance-landing.md` — every measurement and the recipe.
6. `docs/landing-assets.md`, `docs/landing-hero-sprite-brief.md` — the asset
   pipeline and the sprite contract.
7. `apps/web/components/landing/HeroV2/` — `heroLayout.ts`, `heroScene.ts`,
   `manifestData.ts` and their tests are the scene's actual specification.
