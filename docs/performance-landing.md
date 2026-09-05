# Landing page performance — P4.S7

Companion to `masterPlan.md` §10 (non-functional requirements) and the
roadmap's P4.S7 line ("Performance pass: hit every budget in §10. Bundle
analysis committed to `docs/`."). Numbers below are real measurements
against a production build (`pnpm build && pnpm start`), not estimates —
see "How this was measured" for exact commands, so any future step can
reproduce or update this.

## JS budget (§10: Route JS ≤ 180KB gz)

```
Route (app)                                 Size  First Load JS
├ ● /[locale]                            2.92 kB         176 kB
+ First Load JS shared by all             103 kB
  ├ chunks/5886ae73-b270fc7a9ed98b6d.js  54.2 kB
  ├ chunks/889-d05f02a9bba0c62d.js       46.4 kB
  └ other shared chunks (total)          2.06 kB
```

**176 KB gzipped, under the 180 KB budget** — but the margin is thin by
the standard of a project this size. `apps/web/components/motion/
CountUp.tsx` was rewritten in P4.S5 specifically to claw back margin
(native `IntersectionObserver`/`requestAnimationFrame` instead of motion/
react's `animate()`/`useInView()`, which were unused elsewhere on the
route until that point). Any future step adding client-side interactivity
to this route should re-run `pnpm --filter web build` and check this
number before merging, not after.

### Framer Motion sub-budget (§5: "under 45KB gzipped. Measure it.")

The landing route's motion-carrying chunk
(`.next/static/chunks/562-*.js`, identified via the app-build-manifest
entry for `/[locale]/(shop)/page` and confirmed by searching for the
`prefers-reduced-motion` string that `motion/react`'s `useReducedMotion`
references internally) is **39.6 KB gzipped** (122KB raw). Verified this
isn't padded by other libraries also living in that chunk by grepping it
for `zustand`, `@tanstack`, `next-intl`, and `IntlMessageFormat` — zero
matches, so this is a reasonably tight estimate of motion's real
contribution, not an inflated shared-vendor-chunk number.

## Core Web Vitals (§10, Landing row)

Measured via `npx lighthouse` against `pnpm start` (production server),
mobile form factor (360×640, DPR 2), throttled.

| Metric | Budget | Simulated throttling | **Real (devtools) throttling** |
|---|---|---|---|
| LCP | ≤ 2.0s | 2.9s ⚠️ | **1.7s ✓** |
| CLS | ≤ 0.05 | 0.036 ✓ | 0.036 ✓ |
| INP | ≤ 200ms | — | **130ms (TBT proxy) ✓** |
| Lighthouse perf | ≥ 90 | 94 | **98** |
| Lighthouse a11y | — | 100 | — |

**Why two columns, and why the real one is what's reported as passing:**
Lighthouse's default `--throttling-method=simulate` doesn't actually pace
the network — it runs Chrome unthrottled and then applies a mathematical
model (Lantern) to estimate what timing *would* result under slow-4G. For
a `localhost`-hosted server with zero real latency, that model's
assumptions about connection-establishment overhead (DNS, TCP, TLS round
trips) don't reflect reality well and it visibly over-penalizes LCP here
— the `lcp-breakdown-insight` audit's own numbers (TTFB 49ms + element
render delay 88ms = 137ms measured) don't remotely add up to the 2.9s the
simulation reported. `--throttling-method=devtools` actually paces the
connection at the OS/browser level instead of modeling it, and gives a
self-consistent 1.7s LCP that matches its own breakdown. This is the same
reasoning most real-world CI performance gates use devtools throttling
(or real lab hardware) rather than pure simulation for exactly this
localhost-testing blind spot — simulation is a speed optimization for
Lighthouse's own CI, not a more accurate model in every context.

**INP caveat, stated plainly:** true INP requires real user interaction
telemetry (field data / RUM), which isn't set up yet (no analytics
provider is wired in — that's Phase 8+ scope per the roadmap). Total
Blocking Time (130ms) and Max Potential FID (110ms) are the standard lab
proxies reported instead, both comfortably under the 200ms budget, but
this is a lab estimate, not a field measurement. Worth re-verifying once
real analytics exist.

**One real, minor, un-fixed finding:** the render-blocking-resources
audit flags the page's own CSS bundle (6KB, 154ms) as render-blocking.
This is inherent to how the browser paints (it cannot render without
knowing styles) and Next.js App Router doesn't inline critical CSS by
default; doing so would need `experimental.optimizeCss` (the `critters`
package, not in masterPlan.md §4's dependency manifest) or hand-built
critical-CSS extraction. Left as a known, small, documented gap rather
than adding an unapproved dependency to shave 154ms off an LCP that
already passes budget by 300ms of margin.

## Accessibility (§10, P4.S8 does the full pass — this is a checkpoint)

axe-core: 0 violations across every landing-page state verified in
P4.S1–S6 (light, dark, mobile, hover-revealed nodes, the header's vehicle
modal open, `prefers-reduced-motion`). Lighthouse's own accessibility
category: 100/100. P4.S8 is the dedicated pass (keyboard walkthrough,
VoiceOver-in-RTL) — this is not a substitute for it.

## How this was measured

```bash
# 1. Real production build + server (not `next dev` -- dev mode is
#    unoptimized and not representative of real timing).
pnpm --filter web build
pnpm --filter web start -p 3000

# 2. Real (non-simulated) mobile-throttled Lighthouse run.
npx lighthouse http://localhost:3000/ \
  --output=json --output=html --output-path=<path> \
  --preset=perf --form-factor=mobile \
  --screenEmulation.mobile --screenEmulation.width=360 \
  --screenEmulation.height=640 --screenEmulation.deviceScaleFactor=2 \
  --throttling-method=devtools \
  --chrome-flags="--headless=new --no-sandbox" \
  --only-categories=performance
```

The JS budget table is `pnpm --filter web build`'s own route-size output
after `rm -rf apps/web/.next` (a clean build — Next's incremental cache
can otherwise report stale sizes).

---

# P9.S17 re-measurement — the rebuilt landing page

Same commands, same throttling method, same machine; the page underneath
them is the Phase 9 rebuild (pinned hero stage, two ambience clips, four
sections deleted, two hidden). Everything above is kept as the P4.S7
baseline rather than overwritten — the point of re-measuring is the
comparison.

## JS budget

```
Route (app)                                 Size  First Load JS
├ ● /[locale]                            9.23 kB         189 kB
+ First Load JS shared by all             103 kB
  ├ chunks/5886ae73-e5764e556e37f504.js  54.2 kB
  ├ chunks/3889-ae79439eefc5b2dc.js      46.4 kB
  └ other shared chunks (total)          2.13 kB
```

**189 KB, against a §10 budget of 180 KB — over, knowingly.** The 9 KB
came from the hero becoming a real scroll stage (`HeroV2`, `HeroStage`,
`VideoStage`, the vehicle/part path split) and was accepted at P9.S5 when
it landed; the plan's own budget line (fableTasks §6) then set "hold at
≤188 KB, aspire back toward 180". The honest figure is 189 KB and it has
not moved since: S13 measured 189, S15 measured 189, S16 measured 189,
and this clean rebuild measures 189. Three steps of new work — a second
video stage, a whole new route, a regression suite — added zero route JS,
because all of it is server components, CSS, or test code.

The two routes added since are separate entries and do not touch this
budget: `/vehicle/[make]` is 122 KB and `/vehicle/[make]/[model]/[gen]`
is 143 KB.

### Framer Motion sub-budget (§5: "under 45KB gzipped. Measure it.")

**39.9 KB gzipped** (122.8 KB raw), chunk `9357-*.js`, identified the
same way as at P4.S7 — the app-build-manifest entry for
`/[locale]/(shop)/page`, confirmed by the `prefers-reduced-motion` string
that `useReducedMotion` carries. Re-grepped for `zustand`, `@tanstack`,
`next-intl` and `IntlMessageFormat`: zero matches, so this is motion's
own weight, not a shared vendor chunk. Essentially unchanged from
P4.S7's 39.6 KB despite the rebuild adding scroll-driven motion to the
hero and two `VideoStage` mounts — the new work reuses hooks that were
already in the bundle rather than pulling in new APIs.

## Core Web Vitals

Lighthouse 13.4.1, mobile 360x640 DPR 2, `--throttling-method=devtools`
against `pnpm --filter web start`.

| Metric | Budget | P4.S7 | **P9.S17** |
|---|---|---|---|
| LCP | ≤ 2.0s | 1.7s | **1.9s ✓** |
| CLS | ≤ 0.05 | 0.036 | **0.032 ✓** |
| INP (TBT proxy) | ≤ 200ms | 130ms | **130ms ✓** |
| Speed Index | — | — | 2.0s |
| Max Potential FID | — | 110ms | 110ms |
| Lighthouse perf | ≥ 90 | 98 | **97** |
| Lighthouse a11y | — | 100 | **100** |
| Lighthouse SEO | — | — | **100** |

LCP moved 1.7s → 1.9s and stays inside the 2.0s budget with 100ms of
margin — thinner than before, and worth stating plainly rather than
rounding away. The LCP element is the hero car cutout, served from the
pre-built AVIF set at 14.2 KB.

## Transfer weight (fableTasks §6 budget)

| Type | Transfer | Budget |
|---|---|---|
| Script | 221.4 KB | — |
| Font | 130.7 KB | two families, already configured |
| **Image** | **88.9 KB** (10 requests) | ≤ 1.2 MB per view ✓ |
| Document | 42.9 KB | — |
| Other | 25.2 KB | — |
| Stylesheet | 8.1 KB | — |
| Fetch | 7.9 KB | — |
| **Total** | **525 KB / 43 requests** | — |

**Zero video bytes on mobile, measured rather than asserted.** The
network log for this run contains no `.mp4` at all, with two clips on the
page. That is the same guarantee `e2e/landing-sections.spec.ts` checks in
a browser, now confirmed in a real production run: `VideoStage` does not
render the element below 1024px, so nothing is fetched.

Every image on the page is from the hero's own pre-built AVIF set —
`car-768.avif` plus nine part cutouts at 480w, 88.9 KB combined.

## Two findings from this pass

**Fixed: a WCAG 2.5.3 (Label in Name, level A) failure the e2e suite
could not see.** The hero's ten system links carried
`aria-label="سیستم موتور — مشاهده قطعات"` while reading
`SYS-01 موتور ۳۲ قطعه` on screen, so a voice-control user saying the
visible words would not match the accessible name. The action moved into
an `sr-only` span inside the link, which appends to the name instead of
replacing it. Worth knowing **why the suite missed it**:
`label-content-name-mismatch` is in axe's experimental set and off by
default in `@axe-core/playwright`, while Lighthouse enables it. Axe at
zero violations is necessary, not sufficient.

**Open, small: two console errors on first load.**
`GET /api/v1/auth/me` returns 401 for a signed-out visitor — correct
behaviour, but the browser logs every failed request, so it costs a
Lighthouse best-practices point (96/100). Silencing it means either not
calling the endpoint without a session cookie or having it answer 200
with `{ authenticated: false }`, which is an API contract change, not a
frontend tweak. `GET /favicon.ico` 404s because no icon file exists yet
(`app/icon.*` is unset) — that needs a real brand mark, an owner asset.
Neither affects a real visitor beyond a console line.

## How this was measured

Identical to the P4.S7 commands above, with one addition worth recording:
`npx lighthouse` exits with an `EPERM ... Permission denied` while
cleaning up its own Chrome temp directory on this Windows machine. The
reports are already written by then — check for the output files before
treating that error as a failed run.

---

# P12.S5 re-measurement — where the 189 KB actually went

Measured while wiring the parts manifest's mobile rail, because the plan
made "still ≤189 KB" a gate and the build was reading 200 KB. Rather than
argue with the number, every commit between the P9.S17 measurement above
and here was built clean (`rm -rf apps/web/.next && pnpm build`) and its
`/[locale]` row recorded. The budget did not drift; it moved three times,
for three identifiable reasons.

| Commit | Step | Route size | First Load JS |
|---|---|---|---|
| `8fc9817` | P9.S17 (the row quoted above) | 9.23 kB | **189 kB** |
| `ca60f51` | P9.S18 | 9.92 kB | 190 kB |
| `edc7325` | P11.S1 | 9.92 kB | 190 kB |
| `9d34d1a` | P11.S2 | 9.92 kB | **198 kB** |
| `edb8d55` | P11.S3 | 9.97 kB | 198 kB |
| `f68ace0` | Phase 12 opens | 9.97 kB | 198 kB |
| `20c91fb` | P12.S3 | 10.4 kB | 198 kB |
| `33bca6d` | P12.S4 | 12.5 kB | **200 kB** |
| working tree | P12.S5 | 12.5 kB | 200 kB |

**The 8 KB is P11.S2, and it is `tailwind-merge`.** That step moved all 21
primitives onto `cn()`, and four of them are Client Components —
`Drawer`, `SearchField`, `Tabs`, `Toast`. Three of those four are in the
header, which every route renders, so `tailwind-merge` v2 entered the
client graph for the whole app in one commit. The step's own commit
message is a careful account of the correctness bug it fixed and says
nothing about weight, because nothing re-measured the route afterwards.
That is the process gap worth naming, more than the kilobytes.

**The 2 KB is P12.S4**, the manifest's `ManifestCheckIn` client leaf.
Nine rows of image, text and link cost nothing — they are server-rendered
— and the leaf that choreographs them costs 2 KB.

**P12.S5 adds zero.** The mobile chip rail is the same server component
under a second variant, the thumbnails are images, and the row/sprite
highlight listener moved from the manifest to `HeroScrollProvider`
rather than being added twice.

So the honest figure is **200 KB against a 180 KB budget**, and the
largest single recoverable piece is the 8 KB of `tailwind-merge` in four
client primitives — worth a step of its own, and not one this phase can
absorb without touching the design system.

## Two defects the mobile audit found

Both were invisible to every check that existed, and both are recorded
here because the *reason* they were invisible generalises.

**The hero's columns were laid out 1248px wide inside a 390px viewport.**
The chip rail is a horizontal scroller, and a grid item's automatic
minimum size is its min-content width — so the column refused to shrink
below the rail's unwrapped strip (9 × 128px plus gaps) and overflowed its
track. `overflow-x-clip` on `#hero` then hid the consequence perfectly:
the page did not scroll sideways and nothing looked wrong, while the
vehicle selector and all ten system links sat at `x=-875`, off-canvas.
One `min-w-0` on the column fixes it. It was found only because axe could
not resolve a background colour for text painted outside its ancestor,
and reported the body's colour instead — a contrast failure that was
really a layout failure wearing a disguise.

**The manifest flashed on every load.** The server must send every row
visible (that is what a no-JS or reduced-motion visitor reads), so the
choreography has to remove them before checking them back in. Done in the
mount effect, that removal lands after first paint: the list appears,
fades out, then walks back in. It now happens in a blocking inline script
before paint, the same technique next-themes already uses in this app for
exactly this reason (masterPlan §6.7). This was also what made the
page-level axe sweep fail — axe sampled the half-transparent rows
mid-fade and scored the blended colour.

## Suite note, for whoever runs this next

The three landing suites pass individually and in any pair. Run all three
in one `playwright test` invocation and the last nine tests fail on
`data-theme` never being set — the dev server stops serving hydration
JS that far into a single run, with `PackFileCacheStrategy` ENOENT
warnings preceding it. Reordering the files moves the passes and failures
with the order, not with the content, which is what identifies it as
endurance rather than regression.

---

# P12.S5b — the 8 KB back

The ledger above named `tailwind-merge` as the largest recoverable piece.
It is recovered: **the landing route is 193 KB**, down from 200 KB.

## What it cost, measured rather than estimated

Stubbing the merge to the identity function and rebuilding took the route
from 200 KB to 193 KB, so the number is **7 KB gzipped** — not the 8 KB the
commit-by-commit ledger attributed to P11.S2, because that step also
carried ~1 KB of its own. The measurement is the honest one.

## Why it was there, and why it no longer needs to be

`cn()` = `twMerge(clsx(...))`, and the merge exists for one reason: a
caller's `className` has to be able to beat a component's own variant
(P11.S2). Four Client Components imported it — `Drawer`, `SearchField`,
`Tabs`, `Toast` — and any Client Component that imports `@/lib/cn` pulls
tailwind-merge into that route's browser bundle.

Three of the four **accept no `className` prop at all**. They compose a
static base string with an internal variant map, and the two touch
different utility groups, so the merge had nothing to resolve. They now use
`cx()` (`lib/cx.ts`), which is clsx and nothing else.

`SearchField` keeps `cn()`, because it genuinely merges a caller's
`className` onto its input. Removing it would have been the bug P11.S2
fixed, reintroduced to save bytes. It is not on the landing route's client
graph, so it costs that route nothing — dropping it there saved zero,
measured.

`lib/cx.ts` is a **separate module on purpose**. Exporting `cx` from
`lib/cn.ts` would recover nothing: importing any binding from a module
pulls the module, and the module pulls tailwind-merge.

## The two tests that keep it

`lib/cx.test.ts` asserts `cx(...) === cn(...)` for every composition that
moved — eight of them, one per Drawer side, Tabs state and Toast tone. The
day one grows a conflicting utility, that site fails and says to move back
to `cn()` rather than silently shipping a class attribute whose winner is
decided by stylesheet order.

The second test walks `components/` and `app/`, finds every file with a
`"use client"` directive that imports `@/lib/cn`, and fails on anything not
in an allowlist that carries a written reason. **This is the part that
matters more than the kilobytes.** The 8 KB was not a mistake anyone made
carelessly — P11.S2's commit message is a careful account of the real bug
it fixed. What went wrong is that nothing re-measured the route afterwards
and nothing would have objected. Now something objects.

## Where the budget stands

**193 KB against a 180 KB budget.** Still over, and the remaining 13 KB is
the hero itself — the scroll stage, the video stages, the vehicle/part path
split, the manifest's choreography leaf — which is the page's actual
content rather than a dependency that slipped in. Nothing else is sitting
in there by accident.
