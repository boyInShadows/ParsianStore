# fableTasks.md — ParsianStore Landing Rebuild (Phase 9, P9.S2 →)

**Author:** Fable 5 (planning model) · **Date:** 2026-08-20 · **Executes on:** `development`
**For:** the implementing agent working inside `D:\coding\Projects\ParsianStore\parsian-store`
**Companion documents (read before S2):** `landing-rebuild-brief.md` · `masterPlan.md` §4 §5 §6 §10 · `apps/web/design-quality.md` · `apps/web/styles/tokens.css` · `tasks.md`

---

## 0. Agent contract

You are rebuilding the landing page around a new set of rendered assets. This
file is your plan of record. Non-negotiables, restated from the repo's own law:

1. **One step at a time.** No step N+1 before step N ends with green
   `pnpm lint && pnpm test && pnpm build` and a pushed commit:
   `<type>(web): [P9.Sn] <subject>`.
2. **Stop and ask** the owner when a requirement is ambiguous. Never guess,
   never invent requirements, never fabricate evidence, stats, or copy.
3. **Read before editing. Grep before adding.** `legacy/` is reference-only.
4. Hard ESLint rules: **no raw hex outside `styles/tokens.css`**, **logical
   properties only** (`ms- me- ps- pe- start- end-`; never `ml- mr- pl- pr-`
   `left right text-left text-right`).
5. Server Components by default; every `'use client'` carries a one-line
   justification comment (house style: `VideoStage.tsx` -- `ExplodedView.tsx`
   was the original pointer here and S16 deleted it).
6. Every image through `next/image`, explicit dimensions, AVIF+WebP,
   above-the-fold `priority`, everything else lazy.
7. All user-facing strings in `apps/web/messages/fa.json` (`Landing` namespace).
   Real Persian only — **no lorem, ever**. `en.json` parity is suspended; do not
   remove `en` routing.
8. `useReducedMotion()` in every animated component. Reduced motion = instant
   final state. CSS backstop where SSR first-paint could animate.
9. **Install nothing outside masterPlan §4's manifest without an owner
   decision.** `sharp` and `swiper` are IN the manifest (pre-approved, not yet
   installed). `three`, `@react-three/fiber`, `drei`, GSAP, Lenis,
   `model-viewer` are NOT — see §7 owner list.
10. Definition of Done, every step: RTL correct · light+dark verified ·
    360→1920px responsive · keyboard + visible focus + axe 0 ·
    reduced-motion honored · strings in fa.json · lint/test/build green ·
    route budget checked (`pnpm --filter web build`, compare BEFORE merging) ·
    committed & pushed.

Two agents (Claude, Codex) share this checkout — inspect `git status` before
touching anything.

---

## 1. Direction statement (what this landing page *is*)

**A Persian workshop manual, opened to the exploded diagram of the machine we
stock.** One vehicle, drawn apart on scroll into the systems this store sells —
each floating part a real, clickable entry into its category, labeled with its
mono `SYS-xx` code and a real part count. Around that single orchestrated
diagram: catalog-paper and graphite surfaces, hairline rules, inspection
evidence, and the two entry paths that matter — the Driver chooses their car,
the Mechanic types a code. Steel Blue is the technical ink; Marigold appears
only where money changes hands. No sports-car glamour, no icon circles, no
cards for the sake of cards.

**Compositional beats, in order** (final section inventory argued in D5):

1. **Hero — Exploded View v2** (the one orchestrated sequence: cutout parts
   separate on scroll; vehicle selector + OEM code input inside the composition)
2. **Trust strip** (evidence rail, quiet after the dramatic hero)
3. **Best sellers** (dense commerce, fixed rail)
4. **Authenticity story** (editorial, staged by the engine-bay video plate)
5. **Shop by vehicle** (Saipa / Iran Khodro, fixed generation links)
6. **Symptom finder** (the Driver's second door)
7. **Interstitial plate** (the orbit video still — one breath of atmosphere)
8. **Brand wall** (grayscale marquee, reduced-motion-safe)
9. **Deals** (conditional — renders only on live deals)
10. **Closing beat** (How-it-works compressed to its 4 real steps + support
    with real contact + one strong CTA: «از خودروت شروع کن»)
11. **Mega footer** (unchanged scope: categories, vehicles, brands, e-Namad slot)

Cut/hidden this phase (owner-decided, return paths in §7): **Numbers** (cut),
**Newsletter** (hidden), **Guides teaser** (hidden until Phase 9 content).
**Shop by system** as a standalone grid is absorbed into the hero (D5).

---

## 2. Design language card (internalize before any composition)

The system exists and is law — `tokens.css` is the single hex source; you
extend it only through tokens. This card is how you *apply* it:

- **Two-accent discipline.** Steel Blue = navigation, links, focus, selection,
  fitment-verified, brand marks — never a buy affordance. Marigold = price,
  add-to-cart, checkout, discount, urgency — never navigation or decoration.
  Warning chips: outlined + icon-led, never solid (Marigold ≈42° and warning
  ≈40° collide by hue; shape carries the difference).
- **Graphite is the stage.** Workshop atmosphere in dark, catalog paper in
  light. Dark mode uses **no shadows** — elevation is `surface-raised` +
  `border`. `rule` is always lighter than `border`.
- **Never** an opacity modifier on semantic tokens (`bg-brand/10` silently
  produces no CSS). Need a tint → add a token.
- **Type:** Estedad for display, Vazirmatn for body, JetBrains Mono strictly
  for machine-readable evidence (`SYS-04`, part counts, OEM codes) — mono as
  decoration is a defect.
- **Composition:** narrative, not card stacks. Technical plates, ruled tables,
  leader lines, asymmetric editorial layouts, deliberate negative space.
  Alternate density: quiet evidence rail after the dramatic hero; dense grid
  after an editorial beat. Test every layout: *would it still look intentional
  with all radii removed?* Page must show ≥3 visibly different compositional
  beats.
- **Motion:** one orchestrated sequence per page (the hero). Everything else
  scroll-reveals ≤24px, ≤400ms, `transform`/`opacity` only. Framer JS on this
  route stays **<45KB gz** (39.6 measured — you have ~5KB, treat it as zero).
- **Imagery law:** the renders are **atmosphere and diagram** — they may
  headline a system or an editorial beat; they may never sit in a product card
  as a catalog photo, and never pose as authenticity/inspection evidence.
- **Net-new tokens required by this plan: none.** The video plates were
  generated on `graphite-950` and the light renders sit on `graphite-50`-class
  paper — both already in the ramp. After cutouts (S2), backgrounds are the
  page's own tokens anyway. If a real gap appears, add the token in
  `tokens.css` first, in its own commit.

---

## 3. Asset inventory → section map

Source folder arrives as `apps/web/public/Landing/` (18 files, 57MB,
untracked). It becomes `public/landing/` with the names below. **The
transparent-cutout versions replace the originals for all part renders** — the
owner is producing them now (Higgsfield background removal); until a cutout
exists for a file, that beat ships with the plate-background variant and a
follow-up swap is noted in `tasks.md`.

### 3.1 Rename map (S2)

| From | To | Role |
|---|---|---|
| `Landing/` | `landing/` | case-sensitivity in prod URLs |
| `bumper .png` | `bumper.png` | space in filename |
| `lightning.png` | `headlight.png` | it is the sealed-beam headlight render |
| `car.png` | `car.png` | full vehicle, hero master |
| `airFilter.png` | `air-filter.png` | kebab-case convention |
| `pistoncylinder.png` | `piston.png` | shorter, unambiguous |
| `alternator.png` `door.png` `fender.png` `hood.png` `windshield.png` | unchanged | already fine |
| `hf_20260819_174532_9625ae01….png` | `plate-overhead.png` | keyframe 1 — bird's-eye |
| `hf_20260819_174532_b960208b….png` | `plate-front.png` | keyframe 2 — front, parts out |
| `hf_20260819_174532_d8ff7b99….png` | `plate-engine.png` | keyframe 3 — engine bay |
| `hf_20260819_174532_56166655….png` | `plate-body.png` | keyframe 4 — rear ¾, panels out |
| `section1.mp4`…`section4.mp4` | `chapter-1.mp4`…`chapter-4.mp4` | see 3.3 |
| *(new, Fable batch 2026-08-22)* | `car-stripped.png` + `sprite-{hood,door,fender,bumper,grille,headlight,windshield}.png` | docked-sprite hero set, §3.2 — owner downloads the background-removed versions from Higgsfield and drops them here |

Raw originals move to `landing-src/` at repo root, **git-ignored**; only
optimized outputs are committed (D2).

### 3.2 Hero layers — docked-sprite architecture (owner decision 2026-08-22)

The hero is **one stripped base + seven docked sprites, all derived from the
same `car.png` master** so perspective and lighting match by construction:

- `car-stripped.png` — the base layer: the coupe with bumper, grille,
  headlights, hood (bay exposed), driver door, driver fender, and windshield
  removed. Transparent background. **This is the only base — there is no
  complete-car layer.**
- `sprite-hood.png` `sprite-door.png` `sprite-fender.png` `sprite-bumper.png`
  `sprite-grille.png` `sprite-headlights.png` `sprite-windshield.png` —
  **in-place isolations, not product shots**: each sprite is the source
  frame with everything except that part erased, so the part keeps its
  native position, size and perspective on the full canvas.
  `sprite-headlights.png` deliberately contains **both** headlights (the
  base removed both; they undock together in chapter 1).
- Dock = **stack at 0,0**. All layers share the source frame, so at scroll 0
  the base plus all seven sprites, un-transformed, reconstruct the complete
  car. `HeroV2/heroLayout.ts` holds **undock vectors** per chapter (and
  optional micro-calibration), not dock positions.
- Acceptance gate: `pnpm check:hero <source.png>` (agent commit `869ac9e`,
  reasoning in `docs/landing-hero-sprite-brief.md`) must pass before any
  sprite enters the repo. A sprite that fails registration is regenerated
  individually — never nudged into place with transforms, because shading
  baked for another pose cannot be rotated honestly (measured: the v1
  centered batch missed by up to ~62° on the hood; discarded).
- Undock still begins with a subtle lift + soft shadow so residual seams
  read as motion.
- Engine chapter: the hood sprite undocks to reveal the bay already present
  in the stripped base; the three **standalone** cutouts (`piston.png`
  `alternator.png` `air-filter.png`) rise from the bay — their neutral ¾
  perspective is acceptable for free-floating parts.
- The ten standalone cutouts keep their other jobs: system-chip artwork,
  category pages, marketing — do not use them as docked sprites.
- Pipeline: all hero layers through S3 as AVIF/WebP at 480/768/1024/1440w.
  **Do not trim sprites naively** — full-canvas 0,0 stacking is the
  registration contract, and a trimmed sprite loses its position. Ship
  full-canvas AVIF for v1 (large transparent areas compress to almost
  nothing). If bytes demand it later, `sharp().trim()` may be used **only**
  with the reported trim offsets re-applied as layout transforms, and
  `pnpm check:hero` re-run on the trimmed set.
  LCP element is `car-stripped.png` (`priority`, explicit dimensions,
  ≤90KB AVIF at max breakpoint); docked sprites load eagerly but are small —
  combined sprite budget ≤120KB AVIF at max breakpoint.
- Reduced motion / no JS: the docked composite is the final state — users
  simply see a complete car. No separate fallback asset needed;
  `plate-overhead.png` remains the social/meta poster only.

### 3.3 Videos and plates

RTL note (owner-approved): all four clips and plates were composed for LTR
(subject in the *end*-side two-thirds). Ship the **mirrored** variants as the
defaults (`ffmpeg -vf hflip`, commands in §8) so the empty third sits at the
copy's start side in RTL; nothing in frame betrays the mirror.

| Asset | Beat | Desktop ≥1024 | Mobile <1024 | Reduced motion / absent |
|---|---|---|---|---|
| `chapter-2.mp4` | Authenticity story stage | autoplay muted loop, `playsInline`, `preload="none"`, poster | poster image only | poster (static final state) |
| `plate-body.png` (from kf-4) | Interstitial before Brand wall | full-bleed plate, text overlaid on the empty third | same, tighter crop | unchanged (static) |
| `chapter-4.mp4` | Closing beat ambience | same video rules as above | poster only | poster |
| `chapter-1.mp4` + `plate-overhead.png` | hero fallback + marketing | not embedded in v1 hero (D4) | — | `plate-overhead.png` is the hero's no-JS/reduced-motion poster |
| `chapter-3.mp4` | reserved (marketing / future beat) | not shipped on the route | — | — |

Nothing autoplays with sound; nothing loads video below 1024px; every video
element renders its poster first and upgrades.

---

## 4. The six open decisions — recommendations

**D1 · WebGL vs composited 2D → composited 2D, zero new dependencies (v1).**
The route sits at 188KB gz against a 180KB budget with the overage explicitly
owner-accepted and explicitly *not* license for more. `three`+`fiber`+`drei` is
~150KB gz even lazy-loaded — indefensible this phase. The hero's scroll
separation needs only layered `next/image` cutouts moved with `motion`'s
`useScroll`/`useTransform` (already installed, scroll-linked transforms cost
~0 additional KB). **Correction to the brief:** §8/§11.1 claim no meshes exist
— false; ten Tripo GLB meshes exist in the owner's Higgsfield library. That
doesn't change v1; it makes v2 WebGL a real, cheap-to-start owner decision
(§7) instead of a fantasy.

**D2 · Asset pipeline → committed pre-optimized outputs from a repo script.**
Install `sharp` (manifest-approved). Add `scripts/optimize-landing.mjs`:
reads `landing-src/`, emits AVIF+WebP at 480/768/1024/1440w into
`public/landing/`, extracts video posters, re-encodes the two shipped clips
(H.264 1080p, `-movflags +faststart`, target ≤1.5MB each) and their mirrored
variants. Outputs are committed (deterministic, reviewable, no request-time
cost); `landing-src/` is git-ignored. Run manually per asset change — this is
not a build-time step, so CI stays fast.

**D3 · Video on mobile → none.** Below 1024px every video slot renders its
poster `next/image`. At ≥1024px: autoplay, muted, loop, `playsInline`,
`preload="none"`, poster-first. `prefers-reduced-motion`: poster everywhere,
no exceptions. This keeps the mobile page free of 4×MP4 payloads and honors
audit item 4's height complaint.

**D4 · The Exploded View → re-skinned, not replaced.** The signature stays the
signature; it changes costume. Hero v2 *is* the Exploded View: the cutout car
with its nine parts separating along scroll, each part paired with a leader
line, its mono `SYS-xx` code, its **real** count from `getSystemPartCounts`,
and a link into that system — the exact function `ExplodedView.tsx` +
`explodedViewLayout.ts` serve today, upgraded from flat SVG to the rendered
plates. This satisfies the design law both ways at once: imagery *stages* the
signature by *becoming* it, and the page still has exactly one orchestrated
sequence. The current SVG implementation is retained as the reduced-motion /
no-JS final-state fallback until S6 proves the new hero, then archived in the
same commit that flips the flag. The vehicle selector and a new OEM/SKU code
field (audit item 3 — the Mechanic's above-the-fold path) live inside the hero
composition, start-aligned in the empty third.

**D5 · Section inventory → 15 becomes 11.** Kept (order in §1): Hero v2 ·
Trust strip · Best sellers · Authenticity story · Shop by vehicle · Symptom
finder · Interstitial plate · Brand wall · Deals (conditional) · Closing beat
· Footer. **Absorbed:** Shop-by-system's grid duplicates the hero's part
links destination-for-destination (audit item 4; masterPlan §5-03 itself says
the grid "reuses the Exploded View components") — its `SYS-xx` chips move
into the hero; the standalone section is removed. **How-it-works** compresses
to a 4-step rail inside the closing beat — it is the closing beat's
friction-killer, not its own scroll-page. **Cut/hidden by owner decision
(2026-08-20):** Numbers cut; Newsletter hidden; Guides hidden. Every removal
is reversible — see §7.

**D6 · Rebuild strategy → hybrid.** The hero (highest risk, most new code) is
built as `HeroV2` behind `NEXT_PUBLIC_LANDING_V2` alongside the live hero,
flag-flipped in its own commit once its DoD passes. Every other section is
replaced **in place**, one section per step — each is small enough that a
single green commit is the safer, cleaner path, and `development` stays
shippable throughout (the commit-per-step rule already guarantees it).

---

## 5. Step list

Every step ends: lint ✓ test ✓ build ✓ · DoD (§0.10) ✓ · commit
`<type>(web): [P9.Sn] <subject>` pushed. "Files" lists the primary surface,
not an exhaustive diff.

> **Status, 2026-08-25 — S2 through S17 are shipped and pushed.** Live state
> per step lives in `tasks.md`, which is the log; this file stays the plan as
> written so the two can be compared. Two things landed differently from the
> text below and are worth reading before trusting a step's wording:
> **S5's hero** shipped its scaffold and pinned stage, but parts 2-3 (dock
> calibration and undock motion) are blocked on the sprite batch -- §3.2's
> contract was rewritten mid-flight around in-place isolation and
> `pnpm check:hero`, and batch 2 scored 3 of 7. **S15 and S16** each found a
> live dead-link family the plan had not anticipated (the footer's vehicle
> column, then the header's category menu and the seven policy pages); all
> three are resolved, and the newly deferred items are in §7.

**P9.S2 — Asset hygiene.**
Goal: `public/landing/` exists with the §3.1 names; `landing-src/` holds the
57MB originals, git-ignored; a `public/landing/README.md` records the map and
which files are cutout vs plate. Files: `public/landing/*`, `.gitignore`.
Risk: broken references from the old capital-L path — grep `public/Landing`
across `apps/web` and fix every hit in this same step.

**P9.S3 — Pipeline.**
Goal: `sharp` installed (manifest-approved); `scripts/optimize-landing.mjs`
emits AVIF/WebP sets, posters, re-encoded + mirrored MP4s (§8 commands as the
reference implementation); optimized outputs committed; total committed
landing payload reported in the commit body. Files: `package.json`,
`scripts/optimize-landing.mjs`, `public/landing/*`. Risk: EXIF/color-profile
drift in sharp output — spot-check one dark plate against `graphite-950`
rendering in both themes.

**P9.S4 — Strings.**
Goal: `fa.json` `Landing` namespace v2 — real Persian for every §1 beat.
Sources: masterPlan §5's specified copy is canonical where it exists (hero
headline «قطعه‌ای که به خودروی شما می‌خورد، نه چیزی شبیه آن.», trust items,
closing CTA «از خودروت شروع کن»); draft the remainder in the same register.
**Checkpoint: present the full string table to the owner in the PR/commit body
for review — flagged, not blocking.** Files: `messages/fa.json`. Risk: tone
drift — mirror the existing namespace's formality.

**P9.S5 — HeroV2 scaffold (flagged).**
Goal: `components/landing/HeroV2/` behind `NEXT_PUBLIC_LANDING_V2`: server
shell; client scroll stage (`'use client'` justified) rendering
`car-stripped.png` and the seven in-place sprites stacked at 0,0 on the same
full-canvas stage (§3.2 — `pnpm check:hero` must pass on the shipped set
before this step starts); `heroLayout.ts` holds per-chapter **undock
vectors**;
`useScroll`+`useTransform` drives three undock chapters — front (headlight,
grille, bumper), engine (hood lifts, bay revealed, the three standalone
engine cutouts rise), body (door, fender, windshield) — transform/opacity
only, each chapter re-docking before the next begins; each undocked part
carries leader line + mono `SYS-xx` + real count (`getSystemPartCounts`) +
link; `VehicleSelector` and the new OEM/SKU code action composed start-side;
reduced-motion/no-JS final state = the docked composite (a complete car, free
of charge). Files: `components/landing/HeroV2/*`,
`app/[locale]/(shop)/page.tsx` (flag branch).
Risk: the biggest step — if it can't land green in one commit, split scaffold
(S5a: static composition) from motion (S5b: scroll binding) and tell the owner
you did.

**P9.S6 — HeroV2 proof + flip.**
Goal: RTL mirror verified (assets are pre-mirrored; layout uses logical
props); keyboard path through selector, code field, and every part link;
axe 0; LCP re-measured with the car cutout as `priority`; flag defaulted on;
legacy hero + `ExplodedView` SVG archived per §0.3 (reference, not deletion,
until S16 regression passes). Files: hero files, `page.tsx`. Risk: LCP
regression — if the car AVIF can't hold ≤2.0s on the Moto G4 profile, drop
its largest source and re-measure before the flip.

**P9.S7 — Trust strip.**
Goal: hairline evidence rail per masterPlan §5-02 — mono labels, no icon
circles, each claim tied to a concrete process (fitment check, authenticity
record, payment provider, free consult). Files:
`components/landing/TrustStrip.tsx`. Risk: low.

**P9.S8 — Best sellers rail fix.**
Goal: audit item 2 dead — definite card sizing inside the no-wrap snap rail
at 360/390px, fitment chip preserved, plus a unit/E2E assertion on rendered
card width. Files: `components/landing/BestSellers.tsx`, test. Risk: regression
elsewhere the card is reused — grep `ProductCard` consumers.

**P9.S9 — Absorb Shop-by-system.**
Goal: standalone grid removed; its destinations verified 1:1 against the
hero's part links; any grid-only destination gets a chip row appended under
the hero. Files: `page.tsx`, delete `ShopBySystem.tsx`, hero chips. Risk:
lost SEO anchors — keep the section's heading text as an `sr-only` landmark
in the hero if internal links target it.

**P9.S10 — Shop-by-vehicle links.**
Goal: audit item 1 dead — every rendered link resolves a real generation
(`/vehicle/[make]/[model]/[gen]`), sourced from `fetchVehicleTreeSafe`; a
route-level regression test walks every rendered href. Files:
`components/landing/ShopByVehicle.tsx`, e2e. Risk: tree gaps — if a model has
no generation, it must not render a link at all.

**P9.S11 — Authenticity story + engine stage.**
Goal: editorial beat staged by `chapter-2` per §3.3 rules, telling the
Authenticity Record with a **real example product** (design law: the render is
atmosphere; the product evidence is real catalog data). Files:
`components/landing/AuthenticityStory.tsx`. Risk: the imagery law — the video
must sit as backdrop/stage, never as the product's photo.

**P9.S12 — Symptom finder + interstitial.**
Goal: symptom finder polished to the two-persona spec; `plate-body.png`
interstitial beat between it and Brand wall — full-bleed plate, copy on the
start-side empty third, no card chrome. Files: `SymptomFinder.tsx`, new
`InterstitialPlate.tsx` (server). Risk: low.

**P9.S13 — Brand wall + Deals.**
Goal: marquee pauses on hover and reduced-motion (CSS backstop included);
Deals renders only with live deals — verify the empty state renders nothing,
not a husk. Files: `BrandWall.tsx`, `Deals.tsx`. Risk: low.

**P9.S14 — Closing beat + real contact + hides.**
Goal: audit items 5 & 6 dead. New closing beat: compressed 4-step
how-it-works rail + support block + «از خودروت شروع کن» CTA into the vehicle
selector; `lib/contact-info.ts` gets the real values — phone
`09120570658`, Telegram `@boyinshadows` (owner-supplied 2026-08-20; format
via `normalizePhone`, display via `toPersianDigits`) — WhatsApp remains empty
until the owner supplies it, and the block renders only channels that exist.
Numbers removed; Newsletter and Guides hidden behind explicit
`SECTION_HIDDEN` flags with a pointer comment to §7 of this file. Files:
`HowItWorks.tsx` (fold), new `ClosingBeat.tsx`, `Support.tsx`,
`lib/contact-info.ts`, `page.tsx`. Risk: dead imports from removed sections —
build catches it, clean the barrel.

**P9.S15 — Closing ambience + footer pass.**
Goal: `chapter-4` ambience on the closing beat per §3.3; footer verified —
e-Namad slot present, contact matches `contact-info.ts`, vehicle/category
columns resolve. Files: `ClosingBeat.tsx`, `layout/Footer.tsx`. Risk: low.

**P9.S16 — Regression suite.**
Goal: audit item 7 dead — Playwright: screenshots 360/390/1440 × light/dark ×
reduced-motion; assertions for every discovery href on the page resolving 200;
featured-card width; axe 0 stays 0. Legacy hero files deleted for real in
this step. Files: `e2e/landing.spec.ts`. Risk: screenshot flake — mask the
video elements.

**P9.S17 — Measure + hand off.**
Goal: `pnpm --filter web build` numbers recorded (route JS, expected ≈188KB
held; report the true figure), Lighthouse/LCP re-run per
`docs/performance-landing.md` methodology and that doc updated;
`tasks.md` updated with the deferred list from §7. Files: docs. Risk: none —
this step is the receipt.

---

## 6. Budget plan

- **Route JS:** target = hold at ≤188KB gz (the accepted figure), aspire back
  toward 180. Additions: HeroV2 client stage (~4–6KB own code) + zero new
  libraries. Offsets: legacy `ExplodedView` client code retired (S16), three
  sections deleted/hidden. `motion` usage is scroll-hooks on existing import
  paths — the 45KB Framer sub-budget stays at ~39.6KB. Every JS-touching step
  re-measures **before** merge (§0.10).
- **LCP ≤2.0s (Moto G4 / Slow 4G):** LCP element becomes the hero car cutout —
  `priority` AVIF, ≤90KB at max breakpoint, explicit dimensions, no layout
  shift (CLS budget 0.05 — reserve the stage's box). Plates and videos are
  below the fold, lazy, `preload="none"`.
- **Transfer:** 57MB source becomes a committed optimized set — budget:
  ≤1.2MB images total across all breakpoints actually fetched per view,
  ≤3MB for the two shipped desktop videos combined; mobile fetches zero video
  bytes.
- **Fonts, INP:** untouched by this plan; Estedad/Vazirmatn preloads stay as
  configured in `lib/fonts.ts`.

---

## 7. Owner decisions & deferred list (come back for these)

Explicitly parked, none blocking P9.S2–S17:

1. **WebGL v2 beat.** Ten textured GLB meshes exist (owner's Higgsfield
   library — car, headlight, grille, bumper, piston, alternator, air filter,
   door, hood, fender). Cost to activate: `three`+`fiber`+`drei` ≈150KB gz
   lazy-loaded + manifest amendment + budget renegotiation. Do not install
   without an explicit owner yes.
2. **Coupe → domestic-sedan asset swap (owner chose "a, then b").** Launch
   ships the classic-coupe set as workshop-manual atmosphere; a later batch
   regenerates car/door/hood/fender + 4 plates + 4 clips (+ optional GLBs) as
   a brand-free generic sedan nearer the Saipa/IKCO fleet. Owner runs this
   batch with Fable; the rename map in §3.1 makes it a drop-in swap.
3. **Windshield.** The hero's windshield sprite now comes from the car.png
   master (§3.2) — nothing blocks the body chapter. The owner's own
   `windshield.png` render remains useful for chip/category artwork and an
   optional GLB; its upload to the generation pipeline is now low-priority,
   not blocking.
4. **Light-theme video siblings.** The two shipped clips are graphite-950
   plates and read as intentional workshop-dark in both themes; if the owner
   ever wants paper-light video, it is a regeneration batch (4 keyframes +
   4 clips on `graphite-50`), not an edit.
5. **Numbers section return** — requires four real figures (parts in stock ·
   vehicles covered · orders shipped · years). Re-enable only with data.
6. **Newsletter** — hidden until the subscription backend exists (phone-first
   per masterPlan §5-14). **Guides** — hidden until Phase 9 content lands.
7. **WhatsApp support channel** — masterPlan §5-13 names it; owner has
   supplied phone + Telegram only. Add when a number exists.
8. **`en.json` revival** — suspended by owner 2026-07-30; lowest priority.
9. **Scrub-driven hero upgrade** (video scrubbing instead of transform
   separation) — possible later via frame-sequence encode; costs transfer
   weight; only worth revisiting after v1 ships and is measured.

10. **The seven policy pages** — `/about /contact /faq /returns /warranty
    /privacy /terms`. masterPlan §5 names the routes; none has ever been
    built, so the footer was linking seven 404s. Found by S16's link sweep;
    the owner chose to **hide** the column (`POLICY_COLUMN_HIDDEN` in
    `layout/Footer.tsx`, the same named-flag pattern Newsletter and
    GuidesTeaser use) rather than defer with dead links live. `/contact` and
    `/faq` could be written today from facts the codebase already enforces
    (the real phone and Telegram, the five seeded couriers, Zarinpal, the
    authenticity record, guest checkout). The four legal pages need copy only
    the owner can write: returns window, warranty terms, privacy practices,
    terms of sale. Flip the flag once routes exist.

11. **A brand mark / favicon.** `GET /favicon.ico` 404s on every page load —
    no `app/icon.*` exists and there is no logo asset in `public/brand/`
    beyond a hero photo. Costs a Lighthouse best-practices point and gives
    every browser tab a blank icon. Needs a real mark from the owner, not an
    invented one.

12. **`/api/v1/auth/me` logs a 401 to the console for signed-out visitors.**
    Correct behaviour — the endpoint is auth-only and the client asks on every
    load — but the browser logs every failed request, which is the other half
    of that same best-practices deduction. Fixing it means either not calling
    the endpoint without a session cookie or having it answer 200 with
    `{ authenticated: false }`: an API contract change, so it belongs to a
    backend step rather than to the landing rebuild.

---

## 8. Appendix — commands (reference for `scripts/optimize-landing.mjs` and manual runs)

Mirrored video variants (RTL defaults):

    ffmpeg -i chapter-2.mp4 -vf hflip -c:v libx264 -crf 21 -preset slow \
      -movflags +faststart -an chapter-2-rtl.mp4

Posters (first frame, AVIF via sharp afterwards):

    ffmpeg -i chapter-2.mp4 -frames:v 1 chapter-2-poster.png

Image pipeline shape (per source, inside the script): sharp → resize
[480, 768, 1024, 1440] → `.avif({ quality: 55 })` + `.webp({ quality: 72 })`,
preserve transparency for cutouts, strip metadata.

Contact values for S14 (owner-supplied 2026-08-20):
phone `09120570658` · Telegram `@boyinshadows` · WhatsApp: none yet.

— End of plan. Questions → stop and ask the owner. —
