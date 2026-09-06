# fableTasks.md — v1.1 · Phase 13: «برگه تعمیر» (The Job Card) hero + landing quality pass

**Repo:** `D:\coding\Projects\ParsianStore\parsian-store` · branch `development` · `apps/web`
**Audit date:** 2026-09-06 (Fable, live at `http://localhost:3000/` under `next dev`)
**Revision date:** 2026-09-06 · **v1.1 — reconciled against the repository**
**Author:** Fable (senior full-stack review) · **Reviser:** Claude (verification pass) · **Executor:** Claude CLI agent

---

## v1.1 — why this revision exists, and how to read it

v1.0 was written by a reviewer with no access to this repository's history: it
audited the rendered page and inferred the code behind it. The creative reading
is strong and is kept almost whole. The *engineering* claims were checked line
by line against the working tree, and roughly a third of them turned out to be
stale, already shipped, or measuring a deliberate decision as if it were a bug.

Nothing has been softened to be polite. Where a finding is real it is sharper
here than in v1.0, because it now names the actual file and the actual number.
Where a finding is wrong it is marked wrong **with the evidence**, so nobody
re-litigates it in three weeks.

**Read §0 before §2.** §0 is the verification log; §2's tasks are written on top
of its verdicts, and several v1.0 tasks disappeared there because the work is
already on `development`.

### Three things v1.0 got structurally wrong

1. **The phase number.** v1.0 calls itself "Phase 11". Phase 11
   (design-system consolidation) is **open** — S4, S5 and S6 are unstarted
   (`tasks.md:851`) — and P11.S1/S2/S3 are shipped commits. Phase 12 closed
   2026-09-05. Tagging this work `[P11.Sn]` would collide with both.
   **This is Phase 13.** Every tag below is `[P13.Sn]`.
2. **The filename.** `fableTasks.md` and `fableTasks2.md` were the Phase 9 and
   Phase 12 plans; both were deleted on 2026-09-05, and about thirty source
   comments still cite them by section (`fableTasks §3.2`,
   `fableTasks2 §2.1`). Those citations now resolve to the two SHIPPED sections
   of `tasks.md`. **Citation convention for this file: `fableTasks v1.1 §…`,
   never a bare `fableTasks §…`.** A comment written by this phase saying
   `fableTasks §3.2` will be read as the deleted Phase 9 document.
3. **It supersedes nothing.** v1.0 says it "supersedes fableTasks2.md (Phase
   10)". fableTasks2 was Phase **12**, it is deleted, and every step in it
   shipped. This file adds a phase; it retracts nothing.

### Working rules this file inherits (CLAUDE.md, non-negotiable)

- **Commit and push to `development` after every completed step.** v1.0's S13
  asked for four grouped PRs; that is not this repository's flow. Format:
  `<type>(<scope>): [P13.Sn] <subject>`. Emit the `STEP COMPLETE:` block
  (masterPlan §0) at the end of each step, or the `BLOCKED:` block and stop.
- Zero new dependencies. `three`, `r3f`, `drei`, GSAP and `model-viewer` stay
  forbidden. Everything below is CSS transforms plus the `motion@12.42.2`
  already shipped — it is the `motion` package, **not** `framer-motion`, so
  v1.0's "Framer ≤45KB" is the right budget under the wrong name.
- `tokens.css` is the sole hex source. Logical properties only. Real Persian
  copy only. Server Components by default; every `'use client'` justified.
- English locale parity stays suspended: write `fa.json` only, and do not break
  `/en` (`i18n/messages.ts` layers `fa` underneath it).

---

## 0. Verification log — every v1.0 finding, checked

Legend: **CONFIRMED** (real, do it) · **NARROWED** (real, but smaller or
different than described) · **SHIPPED** (already done) · **FALSE** (measured a
deliberate decision, or simply not true).

### 0.1 The seven headline findings

| # | v1.0 finding | Verdict | Evidence |
|---|---|---|---|
| 1 | "The animation has no narrator" — parts move, nothing names them; the hint never leaves | **CONFIRMED** | `HeroStage.tsx` renders `hint` as a permanent `<p>` inside `.hero-pin`. No label component exists anywhere in `HeroV2/`. This is the best idea in v1.0 and the reason Phase 13 exists. |
| 2 | "The Manifest rail and the stage never meet"; no row ever gets an active state | **NARROWED** | The rail is *not* 2000px down — `PartsManifest variant="panel"` renders **inside the sticky copy column** (`HeroV2.tsx`, `lg:sticky lg:top-24`). It sits below the vehicle selector and the code field, and that is what pushes it under the fold on an 847px-tall viewport. And rows **do** have live state: `ManifestCheckIn` writes `data-chapter-reached` on the `<ol>`, and `HeroScrollProvider` writes `data-highlight` on paired `[data-part]` elements. v1.0 grepped for `aria-current`, which this repo never used. **The real fix is column order, not relocation.** |
| 3 | "Dead zones — the car fully re-docks between chapters" | **BY DESIGN — owner decision, §0.3 Gate A** | `heroLayout.ts`'s `CHAPTER_RANGE` is documented as "Sequential, not overlapping, and each chapter returns to zero before the next opens", and `e2e/landing-hero.spec.ts:444` (`"plays one part at a time, and is a whole car between chapters"`) enforces it. v1.0 is describing the feature. Whether it is the *right* feature is a fair question — but changing it is a reversal, not a fix. |
| 4 | "No camera, no light, no depth" | **CONFIRMED** | There is no camera transform anywhere. The only shared 3D is `perspective: 140cqw` on the sprite frame. No shadow, no glow, no focus dimming in `HeroV2/`. Highest-value item after the callouts. |
| 5 | "Fabricated evidence on the rail — every row says «۳۲ قطعه»" | **FALSE** | The count is real. `getSystemPartCounts()` (`lib/fetchers/exploded-view.ts`) reads `GET /api/v1/catalog/facets` and returns `null` — *rendered as nothing, never as «۰»* — when the API is unreachable. Five rows show the same number because five parts genuinely belong to `SYS-06 body-exterior`, and the catalogue has exactly ten systems. v1.0's remedy ("add a count endpoint, it's one aggregate query") describes code that shipped at P4.S2. |
| 5b | "Every row links to only 4 slugs; five rows go to the same page" | **CONFIRMED as fact, REJECTED as defect** | True and deliberate. `manifestData.ts` resolves every row through `CATALOG_SYSTEMS`, a **closed set of ten** (`packages/schemas/src/catalogSystems.ts`). There is no `lighting`, no `body-front`, no `doors` — v1.0 invented those. The module's own comment: the href is "identical to the system index's own link, so the manifest never offers a second way into the same place". **Do not** invent `?part=hood`; no category page reads it. See Gate C. |
| 6 | "The rail is rendered twice → duplicate `<h2>`, duplicate links for screen readers and crawlers" | **NARROWED — and it is the open TBT regression** | The a11y half is wrong: one copy is always `display:none`, so exactly one is in the accessibility tree — asserted by `e2e/landing-hero.spec.ts:159`. The *cost* half is right, and worse than v1.0 knew: `docs/performance-landing.md` attributes the entire Phase-12 **TBT regression (130ms → 261ms, against a 200ms budget)** to the visible manifest, and names "render it once" as the fix it could not reach, because §2.1 wants the panel sticky beside the drawing and §2.2 wants the rail under the stage. **S7 is the resolution that measurement asked for.** |
| 7 | "The finale is a whimper" | **CONFIRMED as a gap; the proposed ending reverses a tested decision** | There is no finale. But `e2e/landing-hero.spec.ts:459` (`"the hero ends its scroll as a whole car, not a pile of panels"`) asserts every layer is within 9px of home at `p=1`. v1.0's persistent exploded ending deletes that test. Owner decision — Gate B. |

### 0.2 The site-wide findings (v1.0's S8–S12)

**SEO**

| v1.0 claim | Verdict | Evidence |
|---|---|---|
| `twitter:card=summary`, no `og:image` | **CONFIRMED** | `app/[locale]/(shop)/page.tsx`. `public/og/` does not exist. |
| JSON-LD uses `http://localhost:3000` → "read from `NEXT_PUBLIC_SITE_URL`" | **FALSE** | `lib/seo.ts:6` already reads it; `localhost:3000` is the local fallback. This is the trap written up twice already — `docs/performance-landing.md` and `tasks.md:1450`: *set `NEXT_PUBLIC_SITE_URL` to the origin you are serving on, or every canonical-dependent audit measures the mismatch rather than the page.* No code change. |
| Add `ItemList` + `BreadcrumbList` + `Organization.contactPoint` | **CONFIRMED** | `lib/json-ld.ts` ships `Organization` + `WebSite` only. Genuinely additive. |
| `hreflang alternate` points at `/en` while English is suspended | **CONFIRMED** | `i18n/routing.ts` has `locales: ["fa","en"]`; `hreflangAlternates()` emits both. Drop the *alternate*, not the route — `/en` must keep resolving. |
| "29 of 33 `<img>` have empty alt" | **FALSE as a defect** | The count is roughly right and every instance is correct. The hero's sprites are layers of **one** picture whose base carries `alt={carAlt}`; the manifest thumbnails sit inside a link whose text already names the part (`PartsManifest.tsx`, with the reason in a comment). Lighthouse a11y is **100** and axe reports zero violations on the hero in both themes. |
| "Best-seller cards must have alt = product name" | **SHIPPED** | `BestSellers.tsx` already renders `alt={product.name.fa}`. |
| Section numbering is broken (01, 03, 04, 05, 06, —, 08, —, 10) | **CONFIRMED, better fix available** | All ten codes exist in `fa.json` (`Landing.beats.*.code`, 01→10, none missing). Three components simply never render theirs: `TrustStrip` (02), `InterstitialPlate` (07), `Deals` (09). `SectionShell` already takes a `code` prop. **Render the three; do not strip the other seven.** The numbering is a deliberate workshop-manual device and is three one-line fixes from complete. |
| `theme-color` missing | **CONFIRMED, with a rule conflict** | Real gap. But CLAUDE.md rule 5 forbids the hex literals v1.0 supplies, and Next's `themeColor` metadata cannot read a CSS custom property. Resolve it the way `lib/design-tokens.ts` already does — parse the value out of `tokens.css` at build time — or state the exception explicitly in the commit body. Do not paste `#0E1418` into a `.ts` file and say nothing. |
| `?v=<uuid>` is opaque; use a slug or drop it from the URL | **REJECTED as specified** | `?v=` is `makeId:modelId:genId:year[:engineId]` and is mandated by masterPlan §3.4 ("reflected in the URL as `?v=<vehicleKey>` so results are shareable and crawlable"). `vehicleKeySchema` validates it on **every** fitment and catalogue API route. Slugifying it is a cross-cutting API change, not an SEO tweak; removing it contradicts the plan outright. The canonical already omits the query (built from `localizedPath(locale)`, no search params) — **verify that, and log slugification as a deferral.** |
| Lighthouse SEO ≥ 95 | **ALREADY 100** | `docs/performance-landing.md`, P12.S13 close, five-run median. Do not regress it. |

**Typography, accessibility, content**

| v1.0 claim | Verdict | Evidence |
|---|---|---|
| Mixed-script collision «۳۲ قطعهSYS-02»; wrap codes with `unicode-bidi: isolate` | **CONFIRMED, and the primitive exists** | P12.S10 shipped `components/authenticity/EvidenceCode.tsx` plus `.evidence-code { unicode-bidi: isolate }` in `globals.css` for exactly this failure. **Reuse or generalise it — do not write a second one.** |
| Digit policy is inconsistent (years Latin, chips Persian) | **CONFIRMED** | `ShopByVehicle.tsx` prints `newest.yearFrom` raw. `toPersianDigits` already exists in `packages/schemas/src/fa.ts` and is used by the manifest, the system rail and the admin tables. This is an application gap, not a missing helper — **do not add a `faDigits()`.** |
| H1 wraps to 3 lines at 1440 | **NARROWED** | P12.S1 (`f841d5b`, "the hero headline sets in three lines, not five") already tuned this with `text-balance` and a retuned display token. Three lines is the *result* of a deliberate pass. Re-measure at 1440×900 first, and treat "does the subline clear the fold" as the real question. |
| Trust-strip contrast may be below AA | **UNVERIFIED — measure it** | Plausible and cheap. `docs/decisions/0005` carries ratios for every token pair; compute, do not eyeball. |
| "36 of 158 interactive targets under 40px (rail rows, footer links, brand chips)" | **NARROWED** | Manifest rows and chips are already `min-h-12` = **48px** (`--space-12: 48px`). Footer links and marquee entries are the plausible offenders. **Re-measure, then fix only what fails.** ⚠️ The spacing scale is REPLACED with `0 1 2 3 4 6 8 12 16 20 24 32` — `p-11`, `min-h-10`, `w-36` generate **no CSS at all** and silently fall back to content sizing. That bug class has bitten this repo five times (`w-11`, `h-10`, `w-36`, `w-64`, and the piston thumbnail). |
| `cz-shortcut-listen` hydration warning → `suppressHydrationWarning` on `<body>` | **CONFIRMED** | It is on `<html>` (next-themes needs it there) and not on `<body>`. One line; correct diagnosis. |
| Theme toggle renders an empty circle in light mode | **PROBABLY A SCREENSHOT ARTEFACT** | `theme-toggle.tsx` renders Sun/Moon SVGs in `currentColor` and carries `disabled:opacity-0` until hydration — pre-hydration it is invisible, not empty. Reproduce it against a **production build** before writing a fix; `next dev` timing is not evidence here. |
| Symptom-finder chips may be `<div>`s that go nowhere | **FALSE** | `SymptomFinder.tsx` — they are `<a href={"/c/" + system.slug}>`, real links to real category routes. |
| «پیشنهاد ما» shows four identical «گریس یاتاقان» then four «ضدیخ رادیاتور»; "pull 8 distinct products with `?featured=true`" | **CONFIRMED as a defect, WRONG fix** | Real: the seed generates one product per template **per brand/vehicle**, so several records share a display name, and `fetchFeaturedProducts` asks for `?sort=newest&inStock=true&limit=8` — the eight newest are the last-seeded two templates. There is no `?featured=true` param. The honest fix is **de-duplication by template in the fetcher** (or a diversified sort), not an invented flag. |
| "Antifreeze is not a filter" | **CONFIRMED — and the bug is the label** | `SYS-10` is `filters-fluids`, `en: "Filters & Fluids"`. Antifreeze is a fluid and is correctly filed. The Persian name «فیلتر و روغن» (*filters and oil*) is narrower than the English and than its own contents. **Rename the fa label**; do not re-file the product. |
| Authenticity card truncates the SKU mid-word | **FALSE — that is the shipped design** | P12.S10 (`e0918f0`). `EvidenceCode` truncates with `text-overflow` **only**: the full code stays in the DOM, is read whole by a screen reader, copies whole, and shows on hover via `title`. The commit body explains why shortening the stored code is a data migration, not a display fix. |
| Brand wall "renders three names with a lot of empty track"; make it a marquee with all 16 | **FALSE — shipped at P12.S12** | `BrandWall.tsx` is already a `Marquee` (pauses on hover, respects reduced motion) over **every** seeded brand, in a ruled band at h1 scale. There are **15**, not 16. v1.0 photographed a marquee mid-cycle. |
| «ساعات پاسخگویی به‌زودی اعلام می‌شود» | **CONFIRMED** | `fa.json:131`. Real hours, or delete the line. |
| Footer `پارسیان -- Ash Tech Group` double hyphen | **CONFIRMED** | `Footer.tsx:139`. |
| اینماد / نشان ملی boxes are empty placeholders → hide them | **CONFIRMED as fact, CHECK before hiding** | `Footer.tsx:126–133`, and one already carries `aria-label="… (در انتظار ثبت)"`. These are Iranian e-commerce trust marks that are legally obtained, not designed. "Pending registration", labelled as such, may be the honest state. **Owner call.** |
| Mobile track is 56rem, too short for four beats | **CONFIRMED** | `HeroStage.tsx` — `min-h-[calc(100vh+56rem)] lg:min-h-[calc(100vh+120rem)]`. Mobile really is 56rem against desktop's 120rem, and it now has to carry a fourth beat. Good catch. |

**Tooling and process**

| v1.0 claim | Verdict | Evidence |
|---|---|---|
| "Reuse the Playwright screenshot script from Phase 10" | **DOES NOT EXIST** | There is no `scripts/hero-shots.ts`. What exists is `e2e/landing.spec.ts` with committed baselines at 1440/390/360 × dark/light/reduced-motion. S0 writes the scrub harness from scratch. |
| Extend `pnpm check:hero` to fail on 404ing slugs / duplicate hrefs | **WRONG HOME** | `scripts/check-hero-registration.mjs` measures sprite **registration** against `landing-src/`, which is gitignored and exists on one machine only (`tasks.md:1437`). It can never run in CI. Route assertions belong in the e2e suite, which already has `"every manifest link resolves"` and `"every system in the index rail links somewhere real"`. |
| `pnpm build && pnpm analyze` | **NO SUCH SCRIPT** | There is no `analyze` script and no `@next/bundle-analyzer`. Route JS is read from `pnpm --filter web build`'s own route-size output — the method is written down in `docs/performance-landing.md` §"How this was measured". |
| "JS ≤180KB, 188KB overage owner-accepted; do not grow it" | **STALE BY 5 KB** | The real ledger: 176 → 189 (P9.S17) → 200 (P12.S5) → **193 KB (P12.S13 close)** against a 180 KB budget. `motion` sub-budget **39.9 KB** of 45. **193 is the number to hold.** |
| "Lighthouse Performance ≥ 90 mobile" | **CURRENTLY 94 — and TBT is the open wound** | LCP 1.65s ✓, CLS 0.034 ✓, a11y 100, SEO 100, **TBT 261ms against a 200ms budget ✗**. v1.0 does not mention TBT at all, and it is the one regression Phase 12 left open. S13 makes it a gate. |
| "Append to `docs/deferred.md`" | **NO SUCH FILE** | Deferrals live in `tasks.md`. Do not create a second ledger. |

### 0.3 Owner decision gates — answer these before S2, S7 and S8

Three v1.0 proposals do not fix bugs; they **reverse decisions that shipped with
tests attached**. Executing them silently would delete a test and call it
progress. Each is stated here with what it costs.

> **GATE A — Do chapters keep re-docking, or do they cross-fade?**
> *Today:* each chapter returns to zero before the next opens
> (`CHAPTER_RANGE`), so the car is whole at every rest point. Enforced by
> `e2e/landing-hero.spec.ts:444`.
> *v1.0 wants:* chapter N re-docks **during** chapter N+1's camera move, so the
> stage is never static.
> *Cost of changing:* the "whole car between chapters" invariant is deleted, and
> `beatFor` / `coverBeatFor` / `BEAT_SPAN` / `BEAT_HOLD` — the whole P12.S8
> staggering system, which exists precisely because "the separation was not
> legible" — must be recomputed against overlapping ranges.
> **Recommendation: a middle path.** Keep the invariant; kill the dead frames by
> giving the *camera* the gaps. Chapter N+1's camera move starts while chapter
> N's parts are still settling, so nothing on screen is ever frozen, but there
> is still a scroll position at which the car is whole. This delivers v1.0's
> stated goal — "at no point can you say nothing is happening" — without
> deleting a tested promise. **S2 is written for this path.**

> **GATE B — Does the hero end exploded, or whole?**
> *Today:* every layer is within 9px of home at `p=1`
> (`e2e/landing-hero.spec.ts:459`).
> *v1.0 wants:* the finale explosion persists; the visitor scrolls away from a
> full catalogue.
> *Cost:* that test inverts. It is a real product argument — "the last thing you
> saw is everything we sell" versus "the car you arrived at is the car you
> leave" — and it is the owner's to settle, not the executor's.
> **Recommendation: ship the finale, keep the ending whole.** Put the exploded
> catalogue and the CTA at `p ≈ 0.88–0.96`, hold it there, and re-dock over the
> last 4% as the hero un-pins. The finale becomes the climax rather than the
> resting state; the invariant survives; and the CTA still occupies the longest
> single hold in the whole track. **S8 is written for this path.**

> **GATE C — May the job card point nine rows at four destinations?**
> *Today:* five rows resolve to `/c/body-exterior`, because the catalogue has
> exactly ten systems and no finer ones.
> *v1.0 wants:* "never two identical destinations", via slugs that do not exist
> or a `?part=` query no page reads.
> *Options:* (a) leave it — the row names the part, the destination names the
> system, and nothing is dishonest; (b) add real sub-categories under
> `body-exterior`, which is a catalogue and seed change with a migration, well
> outside a landing-page phase; (c) deep-link to a category page pre-filtered by
> a **real, existing** facet, if one fits.
> **Recommendation: (a) for Phase 13**, logged in `tasks.md` as a catalogue
> question. The manifest's job is to make the animation clickable, and it does.

---

## 1. The story: «برگه تعمیر» — *The Job Card*

### 1.1 Concept

Unchanged from v1.0, because it is right. A parts store has one story worth
telling on a landing page: *"Here is your car. We know every piece of it. Every
piece you see leave the body is a piece you can buy right now."* The Persian
workshop metaphor for that is the **job card** (برگه تعمیر) — the sheet the
mechanic fills in as he takes the car apart, one line per part.

So the scroll is an **inspection**. The visitor is the mechanic; scrolling is
walking around the car on the lift. Each part that comes off is written onto the
job card in real time, with its Persian name, its system code and a «مشاهده»
link. By the bottom of the hero the job card is full — and the job card *is* the
catalogue navigation.

Three rules every task below obeys:

- **Every detachment is a sale.** No part moves without a label appearing and a
  rail row lighting up. (One deliberate exception, named in §1.2.)
- **The camera moves before the part does.** Push-in, tilt or pull-back happens
  in the first quarter of each chapter; then the parts come off.
- **The stage is never visually static while pinned.** Gate A sets how far that
  is taken.

### 1.2 The scene as it actually is

v1.0's beat sheet was written against an imagined nine-part scene. The real one
lives in `heroLayout.ts` and differs in four ways that change the choreography.

**Eleven layer elements, ten parts, nine manifest rows.**

| Layer id | Asset group | Chapter | Manifest row |
|---|---|---|---|
| `lamp-far` + `lamp-near` | hero sprite (one file, two clips) | 1 | headlights — `SYS-05` |
| `grille` | hero sprite | 1 | grille — `SYS-06` |
| `bumper` | hero sprite | 1 | bumper — `SYS-06` |
| `hood` | hero sprite | 2 — **cover, not a beat** | hood — `SYS-06` |
| `air-filter` | hero-parts | 2 | air filter — `SYS-10` |
| `piston` | hero-parts | 2 | piston — `SYS-01` |
| `alternator` | hero-parts | 2 | alternator — `SYS-05` |
| `door` | hero sprite | 3 | door — `SYS-06` |
| `fender` | hero sprite | 3 | fender — `SYS-06` |
| `windshield` | hero sprite | 3 | **none, deliberately** |

- **The windshield exists and v1.0 never mentions it.** It undocks in chapter 3
  and carries no manifest row, because there is no glass category route —
  `MANIFEST_EXCLUDED_LAYERS` in `manifestData.ts` records the reason. It
  therefore needs a callout decision, and "every detachment is a sale" cannot
  cover it. **Recommendation: it keeps moving and gets a name-only plate with
  no «مشاهده» link.** The visitor sees a windscreen come off a car, which is
  honest, and nothing pretends to be for sale that is not.
- **The hood is a cover, not a beat.** `CHAPTER_COVER[2] = "hood"`: it opens
  across `COVER_SWING` (16% of the chapter), stays open while all three engine
  slots play inside it, then shuts. It was given an ordinary beat slot once, and
  the filmstrip showed the piston emerging through a closed bonnet. Do not
  regress that.
- **The engine trio moves *down*, not up.** The lifted hood already occupies the
  clear band above the car: canvas rows 130–894 are visible, the car sits at
  333–700, and the lower band is 194px of nothing. v1.0's "air filter rises,
  alternator rises, piston rises highest" was tried and produced an alternator
  entirely hidden behind the hood.
- **Real chapter ranges:** `1: [0.02, 0.34]`, `2: [0.36, 0.66]`,
  `3: [0.68, 0.98]`. v1.0's `0.08 / 0.34 / 0.62 / 0.84` is a different track and
  leaves no room for a finale without displacing chapter 3.

**Corrected beat sheet.** `p` is the pinned track's own progress. The camera
column is new; the parts and ranges are the shipped ones.

| Beat | `p` | Camera (new) | Parts (shipped choreography) | Stage text / job card |
|---|---|---|---|---|
| **0 · Arrival** | 0.00–0.02 | scale 1 → 1.04, slow. One diagonal light sweep across the body, driven by `p` so it scrubs both ways. | All docked. | Headline visible. Hint appears, then **fades out by p=0.06 and never returns**. Job card ghosted, header «برگه تعمیر · ۰ از ۹». |
| **1 · Station A — جلوی خودرو** | 0.02–0.34 | Push-in toward the nose over the chapter's first 20%. **Scale is capped by geometry — see S2.** A slight `rotateZ` for a hand-held feel. | Slots in order: headlights (both lamps, one beat), grille, bumper — each still holding at peak across the middle of its beat (`BEAT_HOLD`). Headlights get the bloom. | A callout per part. Rows 1–3 tick as each slot starts. Caption «ایستگاه ۱ · جلوی خودرو». |
| **2 · Station B — موتور و کاپوت** | 0.36–0.66 | Pull back and tilt (`rotateX`) so the bay reads, during the hood's `COVER_SWING` open. | Hood opens as the cover; air filter, piston and alternator drop out of the bay in their slots at `undock.scale` 2.4; hood shuts. | Callouts for hood and the trio. Rows 4–7 tick. Caption «ایستگاه ۲ · موتور و کاپوت». |
| **3 · Station C — بدنه** | 0.68–0.98 | Pull back to 1.0 and pan along the flank. | Door, fender, windshield in their slots. | Callouts for door and fender (linked) and windshield (name only). Rows 8–9 tick. Caption «ایستگاه ۳ · بدنه». |
| **4 · Finale — کاتالوگ کامل** | 0.88–0.96 hold, 0.96–1.00 re-dock *(Gate B)* | Scale 0.92, centred, rotation 0. The floor shadow becomes a faint workshop grid. | All ten parts travel to pre-computed parking positions around the stripped base — nothing overlapping, clear air for every label. A ±3px `p`-driven drift so it reads suspended, not frozen. | Nine chips (the windshield's is name-only). Header flips to «برگه تعمیر · ۹ از ۹ — همه را داریم». Stage CTA «مشاهده همه دسته‌بندی‌ها» → `/c`, plus a secondary «خودرویم را انتخاب می‌کنم» → `#driver-path`. |

Chapters 3 and 4 overlap by design across 0.88–0.98. That is the one place the
sequential-chapters rule bends, because the finale is *about* everything being
in the air at once. Gate A does not cover it; it is the finale's definition.

### 1.3 Callouts — the missing narrator

The highest-value component in this phase. One `PartCallout`, absolutely
positioned in stage coordinates:

- **Anchor dot** at the part's centroid in its *detached* pose. Anchors live in
  the registry (S1) in **canvas pixels**, like every other hero coordinate — not
  stage percentages, which would drift with the frame.
- **Leader line** — an inline SVG `<line>`, 1px, in a steel token. Steel owns
  links and structure; marigold is the CTA accent and stays reserved for the one
  button (ADR 0005). It draws via `stroke-dashoffset` over the part's first 6%
  of `p`.
- **Label plate**, RTL: part name in `displayFont` 15/600 · system code in
  `monoFont` 11 wrapped in the **existing** `EvidenceCode` / `.evidence-code`
  isolation, never a second one-off · one line of "why it matters" in `bodyFont`
  12 (S6) · «مشاهده →» to the row's real href.
- **Focus dimming:** while a callout is live, the base image and every
  non-active sprite drop to `opacity: .55; filter: saturate(.6)`, 300ms.
- Callouts are real `<a>` elements, keyboard reachable. The sprite `<img>` gets
  the same href so clicking the part navigates too. Hover or focus on either
  lights both — **reuse the `data-part` / `data-highlight` pairing already in
  `HeroScrollProvider`**; it is exactly this mechanism, and it mounts once.
- Finale mode: name-only chips, no leader lines, so ten fit.
- **Reduced motion:** the stage does not animate at all today — `HeroStage`
  renders `DockedLayer` and never subscribes to scroll. Callouts must **still
  render**, because they are the content. Static plates on a docked car, one per
  part, positioned at the *docked* anchor. Never strip the labels for
  reduced-motion users.

### 1.4 The job card — rewritten role

- **Visible while the animation plays.** Not by moving it into a new pinned
  column — it is already in the sticky one — but by **reordering that column**:
  headline → job card → («حالا قطعه‌تان را پیدا کنید») vehicle selector → code
  search. The two conversion tools are what get displaced, and S7 gives them
  their own section after the hero un-pins.
- Rows start **ghosted** (name only, 40% opacity, no code or count) and tick in
  as their part detaches. `ManifestCheckIn` already does chapter-level check-in
  through `data-chapter-reached`; S4 refines it to **slot** level, so a row
  lights on its own part's beat rather than its chapter's. Scrolling up
  un-ticks. Header counter «{n} از ۹». Clicking a ghosted row scrolls the page
  to that part's `p`.
- **Keep the real counts.** They are real (§0.1 #5).
- Mobile: the chip strip auto-scrolls the active chip into view
  (`scrollIntoView({ inline: 'center' })`, `behavior: 'auto'` under reduced
  motion), and the active chip takes the marigold tick.
- **Render it once** — the TBT fix, and the structural change
  `docs/performance-landing.md` explicitly asks for. See S7.
---

## 2. Tasks

Conventions: **Files / Do / Accept**. "Accept" is what you measure or screenshot
before marking the step done. One commit per step, pushed to `development`,
tagged `[P13.Sn]`, closing with the `STEP COMPLETE:` block.

Budgets to hold rather than aspire to: route JS **≤ 193 KB gz** on `/`, `motion`
**≤ 45 KB**, LCP ≤ 2.0s, CLS ≤ 0.05, and **TBT ≤ 200ms — currently 261ms and
failing.** Everything below is CSS transforms plus the motion library already
shipped.

### The one architectural rule this phase turns on

**Callouts and job-card state must not arrive as client JavaScript per part.**
The route is 13 KB over budget and 61ms over its TBT budget already, and the
manifest is a Server Component *specifically* to keep nine rows of image, text
and link off the main thread. Ten callout components with their own
subscriptions would undo that and more.

Follow the pattern the repo already proved twice (`PartsManifest` +
`ManifestCheckIn`, and the `data-part` / `data-highlight` delegation in
`HeroScrollProvider`):

- **Server-render the callout markup.** It is static: a name, a code, a
  sentence, a link. It belongs in the HTML, where a crawler and a no-JS visitor
  both get it.
- **Drive it from one client leaf**, writing CSS custom properties and data
  attributes onto a single container (`--p`, `data-active-part`,
  `data-station`), with the transitions in `globals.css`.
- **Zero React state on scroll.** `useMotionValueEvent` with thresholds, exactly
  as `ManifestCheckIn` does. The only value allowed to change per frame is a
  `MotionValue`.

Any step that cannot be built this way is a `BLOCKED:` block, not a budget
overrun discovered at S13.

---

### P13.S0 — The scrub harness (build it; it does not exist)

**Files:** new `scripts/hero-shots.mjs` (Node + Playwright, matching
`optimize-landing.mjs`'s `.mjs` convention), `package.json` script
`shots:hero`.
**Do:** Open `/` against a **production build** (`pnpm build` then
`next start`), not `next dev`. Viewports 1440×900 and 390×844, both themes.
Capture the hero at `p = 0, .02, .08, .16, .26, .34, .40, .48, .56, .66, .72,
.80, .88, .92, .96, 1.0` — the sample points are the real chapter boundaries and
slot peaks, not v1.0's evenly-spaced ones, so a shot always lands *inside* a
beat. Scroll position is `trackTop + p × (trackHeight − innerHeight)`; read the
track from `.hero-track`'s bounding box, the same geometry
`e2e/landing-hero.spec.ts`'s `scrollHeroTo` already uses — **reuse that helper
rather than reimplementing the mapping.** Write to
`docs/shots/p13/<viewport>/<theme>/<p>.png`, plus one full-page shot per
viewport/theme. Emit a contact sheet (a plain HTML index is enough).

⚠️ Three environment traps, all previously debugged, all still live:

1. **Port 3000 is not necessarily ours** — another project's stack has claimed
   it before. Serve on an explicit free port and pass it to the script.
2. **`NEXT_PUBLIC_SITE_URL` must match the origin you serve on**, or every
   canonical-dependent audit measures the mismatch.
3. **`rm -rf apps/web/.next` between a build and an e2e/Playwright run.**
   Otherwise nine landing tests fail on a missing `data-theme` attribute, which
   looks like a theming bug and is not one.

Also confirm the Postgres container is healthy (`docker ps -a`) before trusting
any shot: when it dies, `ShopByVehicle` silently returns null and a whole
section vanishes from the page.

**Accept:** Runs under 90s for both viewports. `docs/shots/p13/` is gitignored
if the images are large — the contact sheet, not the PNGs, is what goes in a
commit body. Every later step's Accept references these shots. **Mobile
behaviour is unverified until this exists — treat every mobile Accept below as
blocking on S0.**

---

### P13.S1 — Extend the part registry (do not replace it)

**Files:** `components/landing/HeroV2/heroLayout.ts`,
`components/landing/HeroV2/manifestData.ts`, their two test files.
**Do:** v1.0 proposes a new `parts.registry.ts` with a `HeroPart` type that
duplicates `HeroLayer`, `HeroEnginePart` and `ManifestPart`. **Do not create it.**
Those three types already carry sprite paths, chapters, dock and undock vectors,
clip boxes, real category slugs, system codes and locale keys — and
`manifestData.ts`'s coverage test already fails if a new layer appears without
either a row or a recorded exclusion. A fourth parallel definition of the same
nine parts is exactly the drift that test exists to prevent.

Add the four fields the story genuinely needs, to the existing types:

```ts
// heroLayout.ts — added to HeroLayer and HeroEnginePart
/** Centroid of the part in its DETACHED pose, in canvas pixels.
 *  Canvas px, not stage %, for the same reason every other hero
 *  coordinate is: the frame's size moves and the canvas does not. */
readonly anchor: { x: number; y: number };
/** Which side of the anchor the label plate sits on, chosen by hand so
 *  no leader line crosses the car. */
readonly labelSide: "start" | "end" | "above";
/** The exploded-catalogue parking spot for beat 4, as a vector from
 *  home in canvas pixels — the same units and origin as `undock`. */
readonly finale: { dx: number; dy: number; scale: number };
```

```ts
// heroLayout.ts — the camera's focus point per chapter
export const STATION_FOCUS: Record<HeroLayer["chapter"],
  { x: number; y: number; scale: number }>;
```

And in `manifestData.ts`, one field on `ManifestPart`:

```ts
/** Key under `Landing.manifest.why` — one line of workshop copy. S6. */
readonly whyKey: string;
```

**Note the namespace.** v1.0 writes `landing.hero.parts.<id>.why`. The real
namespace is capitalised and the parts live under the manifest:
`Landing.manifest.parts.<id>` for names today. Put the new copy at
`Landing.manifest.why.<id>` and the station captions at
`Landing.manifest.stations.<n>` — **`Landing.manifest.chapters.{1,2,3}` already
exists** («جلوی خودرو» / «موتور و کاپوت» / «بدنه») and is currently unrendered;
prefer extending it over inventing a parallel key.

**Accept:** `pnpm test` — `heroLayout.test.ts` and `manifestData.test.ts` extended
so a layer without `anchor`/`labelSide`/`finale` fails to compile, and a finale
layout where any two parking boxes overlap fails at test time (compute it; do
not eyeball it). No new module. `pnpm lint && pnpm build` clean.

---

### P13.S2 — The stage camera rig

**Files:** `HeroStage.tsx`, new `cameraRig.ts`, the hero's CSS in `globals.css`.
**Do:** Insert **one new element**, `.hero-camera`, as an `inset-0` absolutely
positioned child of `.hero-stage`, with the existing square frame unchanged
inside it. Do not put the camera transform on the frame: the frame carries
`transform: translate(-50%, -50%)` for its own centring, and motion's
`style={{ x, y, scale, rotateX }}` composes its own transform string and would
overwrite it — the car would jump to the corner the first time the camera moved.
Because `.hero-camera` is the same box as `.hero-stage`, the frame's `50%`
centring math needs no change at all.

`perspective` goes on `.hero-stage` so `rotateX` on `.hero-camera` reads as
depth. The frame keeps its own `perspective: 140cqw` for the sprites — nested
perspectives are correct here: one camera for the scene, one for the object.

`cameraRig.ts` holds the keyframe table as plain arrays consumed by
`useTransform(progress, inputRange, outputRange)` — `scale`, `x`, `y`,
`rotateX`, `rotateZ` — with `transform-origin` per station driven from
`STATION_FOCUS` (S1) converted to stage percentages through
`HERO_FRAME_WIDTH_PCT`.

**Gate A is implemented here, not in S3.** Under the recommended path, each
station's camera move *starts* while the previous chapter's parts are still
settling — the camera input range for chapter N+1 opens before chapter N's range
closes — so there is no frame in which nothing on screen is moving, while the
parts themselves keep their sequential, tested beats. If the owner chooses
v1.0's full cross-fade instead, that is a different step and it rewrites
`beatFor`; say so in a `BLOCKED:` block rather than doing it quietly.

**⚠️ The geometry does not allow scale 1.35.** The frame is 92% of the stage
width and square, in a 16/11 stage. At v1.0's 1.35 the frame becomes 124% of the
stage width — **12% spilling past each edge**, straight over the job card in the
neighbouring column. Two honest resolutions:

- Cap the push-in at **≤ 1.08** (`0.92 × 1.087 ≈ 1.0`) and buy the sense of
  proximity from `translate` toward the nose plus the focus dimming in S5,
  rather than from raw scale; or
- Set `overflow-x: clip` on `.hero-stage` (with `overflow-y` left visible — the
  `clip` value permits that combination where `hidden` would not, and the frame
  is *already* taller than the stage, so vertical spill is load-bearing: it is
  the room parts undock into). Then callout plates must live in a **sibling
  overlay** outside the clip, or they get cut off at the stage edge.

Measure the chosen one on the S0 shots; do not ship an uncapped 1.35.

RTL is not a hazard here: the stage is pinned `dir="ltr"` deliberately (the car
is an object, not text), so a camera `x` in pixels means the same thing in both
locales. That is why v1.0's "never hard-code signs" warning does not apply — but
do not remove the `dir="ltr"`, or the whole dock mirrors.

`will-change: transform` on `.hero-camera` **only while pinned** — toggle a
class on pin/unpin. A permanent compositor layer on a page already 61ms over its
TBT budget is not free.

**Accept:** S0 shots at p=.16 (nose fills the stage without crossing into the
copy column), p=.48 (visible tilt), p=.80 (side pan), p=.92 (pulled back). The
headline column does not shift by a single pixel across the whole scrub —
compare the H1's bounding box at p=0 and p=.5. CLS on `/` unchanged (≤ 0.05).

---

### P13.S3 — `PartCallout`

**Files:** new `components/landing/HeroV2/PartCallout.tsx` (**server
component**), new client leaf `components/landing/HeroV2/StageNarration.tsx`,
hero CSS in `globals.css`.
**Do:** Per §1.3. `PartCallout` renders on the server for every part, at its
anchor, with `data-part={entry.id}` so it joins the existing highlight
delegation for free. Visibility, leader-line draw and plate opacity are CSS
transitions keyed off attributes that `StageNarration` writes — one client leaf,
one `useMotionValueEvent`, thresholds chosen so `data-active-part` changes **at
most twelve times across the whole track**.

Leader line: one inline `<svg>` sized to the stage with a single `<line>` per
callout, `pathLength="1"` and a `stroke-dashoffset` transition. Plate placement
from `labelSide` plus the per-part offset in the registry.

The plate is an `<a>` wrapping its whole contents; the sprite `<img>` gets the
same href. Exception: **the windshield's plate is a `<span>`, not a link** — it
has no category route, and a link to nowhere is worse than a label (§1.2).

Finale mode: at `p ≥ 0.86` all ten collapse to name-only chips, no leader lines.

Reduced motion: plates render at the **docked** anchors and never move. Do not
hide them.

**Accept:** S0 shots at p=.16, .48, .80 each show exactly the active station's
callouts, none overlapping the car or each other, all copy real Persian.
Tab order runs headline → job card → callouts in station order (verify by
tabbing, not by reading the DOM). `e2e/landing-hero.spec.ts` axe run stays at
zero violations in both themes, and Lighthouse reports no "links without
discernible name". **Route JS delta ≤ +2 KB gz** — measured from the build
output, not estimated.

---

### P13.S4 — The job card goes live

**Files:** `PartsManifest.tsx`, `ManifestCheckIn.tsx`, `manifestData.ts`,
`globals.css`, `messages/fa.json`.
**Do:** Refine check-in from chapter granularity to **slot** granularity: a row
lights when *its own part's* beat opens, not when its chapter does.
`beatFor(chapter, slot)` already returns exactly that number — read it, do not
re-derive it. Extend the `data-chapter-reached` mechanism to a
`data-parts-checked` count (or an attribute per row); keep it as attributes on
one element with the transitions in CSS, because that is what keeps this off the
main thread.

Ghosted rows: name only at 40% opacity. On check-in the code, the count and
«مشاهده» fade in and the row goes to 100%. Header counter «{n} از ۹»; at the
finale it flips to «۹ از ۹ — همه را داریم».

Clicking a ghosted row scrolls to that part's beat peak — the bidirectional half
of the link. Use the same track geometry as S0's helper.

Mobile: auto-scroll the active chip into view, `behavior: 'auto'` under reduced
motion.

**Preserve the no-JS contract.** The server renders the list complete
(`data-chapter-reached="3"`) and the pre-paint script only *removes* rows once
it knows it can bring them back. A no-JS or reduced-motion visitor must still
see all nine rows. There is a test for this — `"shows every row with JavaScript
disabled"` — and a comment explaining why the logic is inverted. Do not
straighten it out.

**Accept:** Existing manifest tests still green, including `"shows every row with
JavaScript disabled"`, `"renders every count in Persian digits"` and `"every
manifest link resolves"`. A new test asserts the checked-in count at four scroll
positions. Route JS delta ≤ +1 KB gz.

---

### P13.S5 — Light, shadow, focus

**Files:** `HeroStage.tsx`, `globals.css`.
**Do:**
- **(a) Arrival sweep.** A `::after` on the frame: a 30°-rotated linear gradient
  (transparent → `var(--color-graphite-50)` at ~8% → transparent), masked by the
  base sprite (`mask-image: url(car-stripped.avif)`) so only the body lights.
  Position driven by `p ∈ [0, 0.02]`.
- **(b) Headlight bloom.** Two positioned divs at the lamp anchors,
  `radial-gradient(var(--color-marigold-300) 0%, transparent 60%)`,
  `mix-blend-mode: screen`, opacity 0 → 0.6 across the headlight beat, plus one
  low-opacity SVG wedge for the beam.
- **(c) Engine rim light.** A duplicate `<img>` per trio part, `filter: blur(6px)`,
  `mix-blend-mode: screen`, marigold-tinted, opacity tied to the part's lift.
  **Same `src`** — the browser cache is the point; generate no new image files
  and add no requests.
- **(d) Floor shadow.** One blurred ellipse under the car that widens as parts
  detach, plus `filter: drop-shadow(...)` per detached part scaled with its
  distance from home.
- **(e) Focus dimming.** `.hero-stage[data-active-part]` drops the base and every
  non-active sprite to `opacity: .55; filter: saturate(.6)` over 300ms.

All colours through tokens — `--color-marigold-300` and `--color-graphite-50`
both exist. ESLint will catch a raw hex anyway.

`prefers-reduced-motion`: no sweep, no bloom pulse, no dim transition. A static
shadow is fine and helps depth; motion is what is removed, not contrast.

**Accept:** p=.16 shot shows visible lamp glow in **both** themes. In light theme
the stage stays dark — that is correct and intentional (`bg-graphite-950` on the
section) — but check the stage's top and bottom edges read as an intentional
plate against the light page rather than a broken block. Shadows visible at
p=.80. **No new network requests** (compare the request count in the S0 run
before and after). Zero raw hex in the diff.

---

### P13.S6 — Real copy for the stage

**Files:** `messages/fa.json` only. (`en.json` parity stays suspended; do not
add English keys and do not break `/en`, which falls back to `fa`.)
**Do:** Real Persian, workshop-manual voice, no marketing fluff, ≤ 70 characters
each.

- **Station captions** under `Landing.manifest.stations` — reuse the existing
  `Landing.manifest.chapters` wording rather than inventing new names:
  «ایستگاه ۱ · جلوی خودرو» / «ایستگاه ۲ · موتور و کاپوت» / «ایستگاه ۳ · بدنه» /
  finale «کاتالوگ کامل · همه را داریم».
- **`why` lines** under `Landing.manifest.why.<id>` — v1.0's are good copy and
  are kept, with the ids corrected to the repo's (`airFilter`, `piston`,
  `alternator`, and `windshield` added):
  - headlights «نور کم یعنی چراغ کدر یا رفلکتور خراب — نه لامپ.»
  - grille «جلوپنجره اصلی با پایه‌های سالم، بدون لقی.»
  - bumper «سپر اصلی، سازگار با سنسور و زه کارخانه.»
  - hood «درب موتور با لولا و قفل کارخانه، بدون بازسازی.»
  - airFilter «فیلتر هوا هر ۱۰ هزار کیلومتر؛ موتور راحت‌تر نفس می‌کشد.»
  - alternator «دینام ضعیف یعنی باتری خالی. اول دینام را چک کنید.»
  - piston «پیستون و رینگ ست، هم‌سایز با سیلندر شما.»
  - fender «گلگیر جلو با سوراخ‌های نصب دقیق.»
  - door «درب خودرو با لولا و قفل، رنگ‌نشده.»
  - windshield «شیشه جلو — فعلاً در فهرست فروش نیست.» *(name-only plate; §1.2)*
- **Job card:** header «برگه تعمیر» · counter «{n} از {total}» · finale header
  «همه را داریم».
- **Hint:** replace `Landing.beats.hero.scrollHint` — currently «برای جدا شدن
  قطعات، صفحه را پایین بکشید» — with «برای باز شدن خودرو، پایین بروید», and make
  it disappear after p=0.06 (S7 removes the permanent `<p>`).
- **Stage CTAs:** «مشاهده همه دسته‌بندی‌ها» / «خودرویم را انتخاب می‌کنم».

**Accept:** No English, no lorem, no number that is not real. Every key resolves
— no `Landing.manifest…` literal on screen at any scroll position in the S0
shots. `pnpm test` (the locale-shape tests) green.

---

### P13.S7 — Hero layout restructure, and the manifest rendered once

This is the step that pays for itself twice: it is v1.0's layout fix **and** the
structural change `docs/performance-landing.md` names as the only remaining fix
for the 261ms TBT.

**Files:** `HeroV2.tsx`, `HeroStage.tsx`, `PartsManifest.tsx`,
`app/[locale]/(shop)/page.tsx`, `globals.css`.
**Do:**

*Desktop (`lg+`).* Reorder the sticky copy column to **headline → job card**, and
move the vehicle selector and the code search out of it into a new section
`#find-my-part` placed immediately after the hero un-pins, side by side, headed
«حالا قطعه‌تان را پیدا کنید». Keep `#driver-path` as the anchor id so the closing
beat's CTA («از خودروت شروع کن») still lands somewhere real — it currently
targets that id.

The 10-system index (`SystemIndex`, «خرید بر اساس سیستم خودرو») moves under
`#find-my-part` too, rendered as a 5×2 grid of real cards (code, name, count)
instead of the current two-column list where the code and the count collide.

*Render the manifest once.* Today `PartsManifest` renders twice —
`variant="panel"` in the copy column and `variant="rail"` under the stage — and
one is always `display:none`. That is the whole TBT regression. The blocker was
that the panel must be sticky beside the drawing while the rail must sit under
the stage, and one element cannot be in two grid cells. **The restructure
dissolves it:** with the job card directly under the headline, a single instance
can live in the sticky column at `lg+` and, below `lg`, be repositioned under
the stage with `order` inside a single-column flex — one DOM node, two layouts.
Verify against `e2e/landing-hero.spec.ts:159`, which asserts exactly one visible
form; that test should be **rewritten to assert one node**, which is strictly
stronger.

*Mobile (`< lg`).* Stage sticky at the top, `aspect-[16/11]` kept, camera scale
factors reduced ×0.8 so the push-in never crops a callout plate off-screen.
Captions overlay the stage top; **one** callout plate at a time, bottom-start of
the stage; job card strip directly under it with auto-scroll. Track height
`calc(100vh + 72rem)`, up from `56rem` — v1.0 is right that four beats do not
fit in 56rem. Verify on the S0 shots that each station gets ≥ 1.5 viewport
heights of scroll.

*The hint.* Delete the permanent `<p>` under the stage; the hint is now part of
beat 0 only.

**Accept:** Desktop shot at p=.48 shows the stage and a job card with rows 4–7
ticked, side by side, both above the fold at 1440×900. Mobile shots at p=.16/.48/
.80 show exactly one callout plate and the matching chip centred in the strip.
Exactly **one** `nav` with the manifest label in the DOM — not one visible, one
node. CLS on `/` ≤ 0.05. **TBT re-measured**: this step must move it, and the
number goes in the commit body whether it moved or not.

---

### P13.S8 — The finale

**Files:** `HeroStage.tsx`, `heroLayout.ts`, `PartCallout.tsx`, `PartsManifest.tsx`.
**Do:** A transform composed **on top of** each part's chapter beat, over
`[0.86, 0.90, 0.96, 1.00] → [home, finale, finale, home]` (the last keyframe is
Gate B's recommended path; under v1.0's alternative it ends at `finale` and the
end-state test inverts).

Composition trap: `PartLayer` expresses `x`/`y` as percentages of the part's
**own box** and returns them as strings (`"12.40%"`). Two string transforms
cannot be added. Compute both contributions as numbers and join them in a single
`useTransform([chapterX, finaleX], ([a, b]) => \`${a + b}%\`)`, or with
`useMotionTemplate`. Do not try to stack two `style.x` values.

Parking positions come from `finale` in the registry (S1) and must not overlap —
proven by the test written in S1, not by looking at a screenshot. Add a ±3px
`p`-driven sine drift so the exploded state reads suspended rather than frozen.

Job card header flips to «۹ از ۹ — همه را داریم». Stage CTA appears bottom-centre:
«مشاهده همه دسته‌بندی‌ها» → `/c` in marigold — **the one marigold button on the
stage** — with «خودرویم را انتخاب می‌کنم» → `#driver-path` as a secondary.

**Accept:** S0 shots at p=.88, .92 show ten parts parked with clear air around
every label and nothing overlapping. Under Gate B's recommended path,
`e2e/landing-hero.spec.ts:459` (`"ends its scroll as a whole car"`) **still
passes unchanged** — that is the check that the recommendation was actually
implemented. Under v1.0's path, that test is rewritten in the same commit with
the reason in the body.

---

### P13.S9 — SEO burn-down

**Files:** `app/[locale]/(shop)/page.tsx`, `lib/json-ld.ts`, `i18n/routing.ts`
or `lib/seo.ts`, `app/[locale]/layout.tsx`, new `public/og/landing.png`.
**Do:** Only the items §0.2 marked CONFIRMED. Specifically **not**: the
`localhost` JSON-LD (a env-var setting, not a bug), the alt-text sweep (correct
as it stands), or the `?v=` rewrite (masterPlan §3.4).

- **OG image.** Render the finale frame on the dark stage with the wordmark,
  1200×630, to `public/og/landing.png`. Set it in `openGraph.images` and flip
  `twitter.card` to `summary_large_image`.
- **hreflang.** Stop emitting the `en` alternate while English is suspended — a
  crawlable alternate to an untranslated fallback is a soft error. Keep `/en`
  routing intact. Put the switch in `hreflangAlternates()` so it flips back in
  one line when the locale returns.
- **JSON-LD.** Add `ItemList` for the ten systems (name + URL), `BreadcrumbList`
  on category pages, and `Organization.contactPoint` with the phone and Telegram
  already on the page.
- **`theme-color`.** Per theme. Resolve the token conflict (§0.2) — derive from
  `tokens.css` the way `lib/design-tokens.ts` already parses it, or record the
  exception explicitly.
- **Canonical with `?v=` present.** Confirm it still points at `/` with no query.
  It is built from `localizedPath(locale)` and should — **verify, then move on.**

**Accept:** Lighthouse SEO stays **100** (it already is; this must not regress
it). Rich-results test passes for `Organization`, `WebSite` and `ItemList`.
`NEXT_PUBLIC_SITE_URL` set to the served origin for the run, or the result is
meaningless.

---

### P13.S10 — Typography & RTL polish

**Files:** `globals.css`, `SystemIndex` in `HeroV2.tsx`, `ShopByVehicle.tsx`,
`TrustStrip.tsx`.
**Do:**

- **Bidi isolation, using what exists.** Generalise `.evidence-code`'s
  `unicode-bidi: isolate` into a `.latin-token` utility (or apply the existing
  class) for every Latin/mono run inside Persian copy — `SYS-06`, years, SKUs,
  plate IDs — with `margin-inline: 0.35em`. Tailwind has a utility for `dir` and
  none for `unicode-bidi`, which is why the CSS class exists. **Do not write a
  second implementation.**
- **Digit policy, enforced.** Persian digits for quantities, prices and years
  inside Persian sentences; Latin digits only inside codes. `toPersianDigits`
  already exists and is already used by the manifest, the system rail and the
  admin tables — the gap is `ShopByVehicle`'s raw `yearFrom` and any sibling.
  Add a test that fails on `[0-9]` appearing inside `messages/fa.json` outside a
  code-shaped token. **Do not add a `faDigits()` helper.**
- **Tracking.** Mono captions apply `letter-spacing` across a mixed run and
  tighten the Persian glyphs. Scope the tracking to the Latin span only.
- **H1.** Re-measure at 1440×900 before changing anything (P12.S1 already tuned
  this). The question is whether the subline clears the fold, not the line count.
- **Trust strip contrast.** Measure the 13px `graphite-400` on `bg-graphite-900`
  pair. If under 4.5:1, raise to `graphite-300` or 14px — compute the ratio, do
  not judge it from a screenshot.
- **Thousands separator.** `Intl.NumberFormat('fa-IR')` already emits U+066C;
  confirm nothing bypasses `formatToman`.

**Accept:** A shot of the system list reads cleanly as «SYS-02 · گیربکس و انتقال
قدرت» with no Latin code touching a Persian word anywhere on `/`. The fa.json
digit test is green and fails when a Latin digit is reintroduced (mutation-check
it).

---

### P13.S11 — Accessibility & interaction quality

**Files:** `app/[locale]/layout.tsx`, `Footer.tsx`, `BrandWall.tsx`,
`HeroStage.tsx`, `globals.css`.
**Do:**

- **Hit areas — measure first.** Manifest rows and chips are already 48px.
  Enumerate every interactive target under 44px in either dimension from the S0
  run, then pad only those. ⚠️ The spacing scale is REPLACED: usable steps are
  `0 1 2 3 4 6 8 12 16 20 24 32`. `p-11` and `min-h-10` compile to nothing.
- **`suppressHydrationWarning` on `<body>`.** The `cz-shortcut-listen` attribute
  is a browser extension, not a bug; the warning is noise during every
  screenshot run.
- **Hero keyboard scrubbing.** Add subtle «قدم بعدی» / «قدم قبلی» controls at the
  bottom of the stage that scroll to the next or previous station's `p`. A
  scroll-driven hero is otherwise unreachable for anyone not using a pointer.
- **A visually-hidden ordered list** naming the stations and their parts
  («ایستگاه ۱: چراغ جلو، جلوپنجره، سپر جلو …»). Screen-reader content and
  crawlable text in one.
- **Theme toggle.** Reproduce v1.0's "empty circle in light mode" against a
  production build first (§0.2 — it is probably the pre-hydration
  `disabled:opacity-0` state). Fix it only if it reproduces.
- **Reduced motion** per §1.3: no camera, no glow, no scroll subscription —
  callouts and the full job card still render.

**Accept:** Lighthouse a11y stays **100**. axe reports zero serious violations
on the hero in both themes and on the mobile rail. Keyboard walk from the
headline to the stage CTA with a visible focus ring at every stop, recorded in
the commit body.

---

### P13.S12 — Content defects

**Files:** `lib/fetchers/products.ts`, `packages/schemas/src/catalogSystems.ts`,
`messages/fa.json`, `Footer.tsx`, `TrustStrip.tsx`, `InterstitialPlate.tsx`,
`Deals.tsx`.
**Do:** Only the items §0.2 confirmed. **Not** the brand wall (shipped at
P12.S12, 15 brands, already a marquee) and **not** the authenticity SKU (shipped
at P12.S10; the ellipsis is CSS and the full code is in the DOM).

- **«پیشنهاد ما» duplicates.** De-duplicate by product template in
  `fetchFeaturedProducts` — the eight newest in-stock records currently collapse
  to two distinct names. There is no `?featured=true`; if de-duplication needs
  API support, that is a `BLOCKED:` block naming the endpoint, not an invented
  query param.
- **`SYS-10`'s Persian name.** «فیلتر و روغن» is narrower than its own contents
  (antifreeze, brake fluid) and than its English «Filters & Fluids». Rename to
  cover fluids. This is a `packages/schemas` change — check every consumer.
- **Section numbering.** Render the three missing codes: `TrustStrip` (02),
  `InterstitialPlate` (07), `Deals` (09). All three already exist in `fa.json`
  and `SectionShell` already takes a `code` prop. **Keep the other seven.**
- **«ساعات پاسخگویی به‌زودی اعلام می‌شود».** Real hours, or delete the line.
- **Footer `پارسیان -- Ash Tech Group`.** Use « · » or an en-dash.
- **اینماد / نشان ملی.** Owner call (§0.2). If they stay, make "pending
  registration" legible on screen and not only in an `aria-label`.
- **The classic-coupé artwork** in the interstitial and the authenticity video:
  log it in **`tasks.md`**, not a new `docs/deferred.md`.

**Accept:** No repeated product name in «پیشنهاد ما». No visible placeholder box
anywhere on `/` that is not explicitly labelled as pending. All ten section
codes render.

---

### P13.S13 — Performance gate

**Files:** `docs/performance-landing.md`, `e2e/`.
**Do:**

- **Preload discipline.** `<link rel="preload" as="image">` for the base and the
  three station-1 sprites only. The rest stay `loading="eager"` and unpreloaded —
  they are behind about half a second of scroll.
- **No new image files.** Glow and rim-light duplicates reuse the same `src`.
- **No React state on scroll.** The only per-frame values are `MotionValue`s; the
  only React-visible change is `activePart`, derived in `useMotionValueEvent`
  with thresholds so it fires **≤ 12 times across the whole track**. Assert it.
- **Measure, do not estimate.** Route JS from `pnpm --filter web build`'s own
  route-size output. **There is no `pnpm analyze`.**

**Accept — these are gates, not aspirations:**

| Metric | Gate | At P12 close |
|---|---|---|
| Route JS `/` | **≤ 193 KB gz** | 193 KB |
| `motion` chunk | ≤ 45 KB gz | 39.9 KB |
| LCP (mobile, throttled) | ≤ 2.0s | 1.65s |
| CLS | ≤ 0.05 | 0.034 |
| **TBT** | **≤ 200ms** | **261ms ✗ — S7 must move this** |
| Lighthouse perf | ≥ 90 | 94 |
| Lighthouse a11y | 100 | 100 |
| Lighthouse SEO | 100 | 100 |

Measurement recipe (copy it from `docs/performance-landing.md`, do not improvise):
production build, `next start` on an explicit port, **`NEXT_PUBLIC_SITE_URL` set
to that origin**, Lighthouse mobile 360×640 DPR 2 with
`--throttling-method=devtools`, **five runs, median reported**. Measure `/`,
never `/fa` — `/fa` 307-redirects and costs about 0.6s of apparent LCP.
Lighthouse exits `EPERM` cleaning its own temp directory on this machine; the
report is already written, so check for the output file before calling a run
failed.

If TBT is still over 200ms after S7, say so plainly with the attribution
breakdown. A regression that is measured and named is a finding; one that is
quietly omitted is a defect the next phase inherits.

---

### P13.S14 — Close the phase

**Files:** `tasks.md`, `docs/landing-hero-sprite-brief.md`,
`docs/performance-landing.md`, this file.
**Do:**

- Add a `SHIPPED — Phase 13` section to `tasks.md` in the shape of the Phase 9
  and Phase 12 sections: what shipped, what was found on the way, what is
  deferred and why. **That section is what the source comments citing
  `fableTasks v1.1 §…` will point at once this file is deleted.**
- Update `docs/landing-hero-sprite-brief.md` with the `anchor` / `labelSide` /
  `finale` fields, so the brand-free sedan regeneration ships with them rather
  than needing a second calibration pass.
- Append the Phase 13 closing measurement to `docs/performance-landing.md`, in
  the same format as the P12.S13 block.
- Record the deferrals in `tasks.md` (**not** a new `docs/deferred.md`):
  engine-bay depth pass (a second stripped base with the bay shadowed for
  hood-open frames), light-theme stage variant, English locale return, real
  brand badge assets, product-image pipeline for best-sellers, `?v=`
  slugification, and Gate C's catalogue sub-category question.
- Delete this file once every step is shipped, the way `fableTasks.md` and
  `fableTasks2.md` were, and only after `tasks.md` carries the reasoning.

**Accept:** `pnpm lint && pnpm test && pnpm build` all green. `tasks.md` reads as
a record someone can act on in six months without this file.

---

## 3. Order of execution

```
S0 → S1 → S2 → S3 → S6 → S4 → S8 → S5 → S7 → [hero shipped]
   → S9 → S10 → S11 → S12 → S13 → S14
```

- **S1 before S2:** the camera's focus points and the callouts' anchors are
  registry data; the registry has to exist first.
- **S6 before S4 and before S3's Accept:** callouts and rows render copy. Writing
  the strings first means neither step ships a placeholder that has to be found
  again later.
- **S8 before S5:** the finale changes where parts end up, and the shadows and
  glows are keyed to distance from home. Lighting a layout that is about to move
  is wasted work.
- **S5 after S3:** labels are content, glow is garnish. If time runs out, ship
  without the glow — never without the labels.
- **S7 late, deliberately:** it touches the grid every earlier step renders into,
  and it is the TBT fix, so it wants the final component set in place before it
  measures.

---

## 4. Definition of done — the owner's acceptance frame

Scroll the page on a laptop trackpad, touching nothing else.

At no point between the headline and the trust strip should you be able to say
"nothing is happening". At every point where a part is off the car you should be
able to read its name, know whether it is for sale, and click it. When you reach
the bottom of the hero, ten parts hang in the air, every one is labelled, the
job card reads «۹ از ۹ — همه را داریم», and there is exactly one marigold button
on the stage. Then the car comes back together as the hero lets go — because the
car you arrived at is the car you leave *(Gate B; if the owner chooses
otherwise, it stays exploded and the e2e invariant changes with it)*.

Then do it again on a phone.

And per every step's DoD (CLAUDE.md §14): RTL correct · light and dark verified ·
responsive 360px → 1920px · keyboard reachable with visible focus and axe zero
violations · `prefers-reduced-motion` honoured · every string in `fa.json` ·
`pnpm lint && pnpm test && pnpm build` all pass · the performance gates in S13
respected for `/` · committed with the correct `[P13.Sn]` tag and pushed to
`development` · the `STEP COMPLETE:` block emitted.
