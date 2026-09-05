# ParsianStore — Remaining Work Checklist

> **The two Fable plan files are gone.** `fableTasks.md` (Phase 9) and
> `fableTasks2.md` (Phase 12) were deleted on 2026-09-05 at the owner's request,
> once every step in both had shipped. Around thirty source comments still cite
> them by section — `fableTasks §3.2`, `fableTasks2 §2.1`, and so on. Those
> citations are not dangling references to fix: they are the reasoning behind a
> decision, and **the two SHIPPED sections in this file are what they now point
> at**. Both were written fuller than a checklist needs to be for exactly this.

## SHIPPED — Landing rebuild, Phase 9 (P9.S2 → S17) — closed 2026-08-26

All sixteen steps and the P9 tail are done; the two boxes still open below are
blocked on the owner, not on work. Phase 12 succeeds it — see the ACTIVE
section further down.

Step-level plan of record: **`fableTasks.md`** (external plan by Fable 5, written
against `docs/landing-rebuild-brief.md`). Summary + binding amendments:
`masterPlan.md` §5 v1.27 amendment and PHASE 9. Section inventory drops 15 → 11.
Work top-down, one step per commit, `<type>(web): [P9.Sn] <subject>`.

- [x] **P9.S2 — Asset hygiene.** ✅ 2026-08-20. 28 masters (113MB) moved to a
      git-ignored `landing-src/` (`cutouts/` `plates/` `video/` `samples-opaque/`)
      and renamed; inventory + provenance in `docs/landing-assets.md`;
      `apps/web/public/landing/` left for S3's optimized output so no master
      enters git history.
- [x] **P9.S3 — Pipeline.** ✅ 2026-08-20. `sharp` at the workspace root +
      `pnpm optimize:landing` (`scripts/optimize-landing.mjs`) → 126 files,
      5.9MB committed: AVIF/WebP at 4 widths for 10 cutouts (alpha kept) and 4
      plates (mirrored for RTL), plus `chapter-2`/`chapter-4` re-encoded to
      mirrored, audio-free 1080p H.264 (CRF 25, `+faststart`) with 3-width
      poster sets. Generated index at `apps/web/lib/landing-assets.json`.
      Every §6 budget met with room: car AVIF 30KB (≤90), desktop per-view
      465KB / mobile 128KB (≤1.2MB), clips 2.74MB combined (≤3MB). ffmpeg 9.0
      installed via winget with owner approval — a **local tool**, never a repo
      dependency; the script degrades to images-only without it. Receipts and
      verification method in `docs/landing-assets.md`.
- [x] **P9.S4 — Strings.** ✅ 2026-08-21. `Landing.beats` in `fa.json` — real
      Persian for beats 01–10 (the mega footer lives in the layout namespace).
      Added **alongside** the live `Landing.sections`, not over it: each step
      S5–S14 migrates its own component, and S16 deletes `sections`. So the
      current page keeps rendering unchanged copy while the v2 set waits.
      New copy: hero's two-path composition (driver selector + mechanic OEM
      code field), trust claims rewritten as processes, interstitial plate,
      and the closing beat (4 steps + support + CTA). `en.json` parity stays
      suspended — `i18n/messages.ts` now layers `fa` **under** any non-default
      locale so `/en` degrades to Persian instead of throwing on a missing key.
      **⚠️ String table awaits owner review** — see the S4 commit body; nothing
      downstream is blocked on it, but corrections get cheaper the earlier
      they land.
- [x] **P9.S5a — HeroV2 scaffold.** ✅ 2026-08-21. `components/landing/HeroV2/`
      complete and tested: server shell, scroll-driven `HeroStage` (three
      separation chapters, transform/opacity only), `PartCodeSearch` (the
      Mechanic's OEM path → `/search`), `heroLayout.ts`, and a `cutoutLoader`
      that serves the S3 AVIF set with zero request-time optimization.
      **Not on the route yet** — see the S5b note below. Verified flag-off
      route JS unchanged at 188KB.
- [x] **P9.S5b + S6 — HeroV2 on the route, proof pass done.** ✅ 2026-08-21.
      Legacy `Hero`/`ExplodedView` off the route and out of the barrel, kept on
      disk as reference until S16 deletes them. `e2e/landing-hero.spec.ts` —
      11 tests, all green: axe 0 light **and** dark, RTL/lang attributes, all
      10 layers present with no broken image, AVIF served straight from
      `/landing/cutouts/` (never `/_next/image`), all 10 system links resolve
      200, full keyboard reachability with a visible focus ring on every stop,
      the code field normalizing Persian digits into `/search`, empty code
      refused, and reduced motion showing the separated diagram rather than the
      collapsed first frame. Route JS **192KB** (188 baseline + HeroV2 − the
      retired ExplodedView client bundle); the offsets that bring it back are
      S9/S14/S16. LCP element is now the car AVIF at **30KB vs the old hero
      image's 77KB** — full Lighthouse re-run stays at S17 per the plan.
      *(Old note kept below: the flag mechanism this step folded away.)*
- [x] ~~**P9.S5b — put HeroV2 on the route.**~~ The `NEXT_PUBLIC_LANDING_V2` flag
      was **dropped, deliberately**: measured three ways (static import, barrel
      re-export, dynamic `import()` inside a dead branch) a flag branch still
      pulls HeroV2's client leaves into the route's client-reference graph, so
      flag-*off* cost +6KB (188 → 194) to ship code nobody renders. Next
      collects client references per reachable module, not per rendered branch.
      So HeroV2 goes on the route in **S6**, in the same commit that archives
      the legacy hero — which is exactly when the offsetting removal lands.
      194KB is then the honest interim figure until S9/S14/S16's cuts.
- [x] **P9.S6 — HeroV2 proof + flip.** ✅ 2026-08-21 — landed together with S5b
      in the entry above (route flip + legacy archive + the 11-test proof suite
      had to be one commit, since dropping the flag meant the offsetting removal
      shipped in the same change). *(closes audit item 3 — OEM/SKU above the fold)*
- [x] **P9.S7 — Trust strip.** ✅ 2026-08-21. Each of the four claims is now
      claim + process — fitment check, authenticity record, server-side payment
      verification, free consult — reading from `Landing.beats.trustStrip`.
      Still hairline-ruled, mono-numbered, no icon circles. Its regression
      assertion lands one commit later, with S8's new
      `e2e/landing-sections.spec.ts`.
- [x] **P9.S8 — Best-sellers rail.** ✅ 2026-08-21. *(closes audit item 2)*
      Root cause found: `tailwind.config.js` **replaces** the spacing scale
      rather than extending it, so it defines only 0-4, 6, 8, 12, 16, 20, 24,
      32. `w-64` therefore generated **no CSS at all**, the card fell back to
      its content width, and a product image reported its intrinsic size —
      hence one nominal 256px card measuring 992px and the section standing
      1,848px tall at 390px. Fixed with a named `--rail-card` token
      (`w-rail`), not a new spacing step; see the next item for why.
      Regression: `e2e/landing-sections.spec.ts` asserts card width at 360px
      and 390px, section height, and that the page never scrolls sideways.

### Bug class — 13 more Tailwind utilities that silently generate no CSS

Same root cause as S8, found while fixing it. `tailwind.config.js` sets
`theme.spacing` (a replace), not `theme.extend.spacing`, so any utility naming a
step outside `0 1 2 3 4 6 8 12 16 20 24 32` emits nothing and the element
silently falls back to `auto`. Still live, **each needs its own judgement, not
a blanket fix**:

- `Button.tsx` `w-9 h-9` · `Select.tsx` `pe-9` · `EmptyState.tsx` `w-14 h-14`
- `Header.tsx` `w-64` · `ShopBySystem.tsx` `min-h-48` ·
  `AuthenticityStory.tsx` `min-h-64` · `compare/page.tsx` `min-w-56`
- `account/page.tsx` `p-5` ×3 + `mt-5` · `profile/page.tsx` `p-5` ·
  `ProfileForm.tsx` `gap-5`

Do **not** just widen the scale: `Button`'s `w-9 h-9` currently does nothing,
and making it work would shrink an icon button to 36px, under masterPlan §10's
44px touch-target floor. The fix is per-site — decide the real intended size,
then either use an existing step, add a named token, or delete the dead class.
Worth a dedicated step; unrelated to the landing rebuild, so not folded into it.
- [x] **P9.S9 — Absorb Shop-by-system into the hero.** ✅ 2026-08-21.
      *(closes audit item 4)* `ShopBySystem.tsx` deleted — it mapped
      `CATALOG_SYSTEMS` → `/c/<slug>`, exactly what the hero's index rail does,
      so no destination was lost. Its `#shop-by-system-heading` survives as an
      sr-only landmark on the rail so the page keeps the semantics along with
      the links. A stale doc reference in `plp/FilterBar.tsx` updated.

      **Found while doing it, for S12 to decide:** `SymptomFinder` is a *third*
      enumeration of the same ten destinations — it maps `CATALOG_SYSTEMS` 1:1
      and links each to `/c/<slug>`, just labelled with a symptom phrase and
      the `SYS-xx` code instead of the system name. So the page still shows the
      same ten links twice, which is the shape of audit item 4 even after S9.
      It is defensible (the Driver's language vs. the Mechanic's, and
      masterPlan §5-09 specifies exactly this pairing) — but it is a design
      call, not a bug to fix silently. Options at S12: leave it, drop the
      visible `SYS-xx` code so it stops reading as the same index, or cut the
      symptom list to the handful of symptoms customers actually ask about
      instead of one-per-system for symmetry.
- [x] **P9.S10 — Shop-by-vehicle real generation links.** ✅ 2026-08-21.
      *(closes audit item 1)* Links were `/vehicle/[make]/[model]`, which is not
      a route — the shipped page is `/vehicle/[make]/[model]/[gen]`, keyed by
      the generation's `yearFrom`, so every sampled link 404'd. New
      `fetchVehicleTreeWithGenerationsSafe()` pulls the whole tree in three
      requests (`/generations` takes an optional `modelId`, so all 31 arrive in
      one page) and each model links to its newest generation, with the year
      shown in mono. A model with no seeded generation renders as plain text —
      never a link that 404s, never hidden. e2e walks every rendered href and
      asserts a 200.

### ⚠️ Found at S10 — a rate-limited API renders as a *missing section*

The API caps at 100/min/IP. When it trips, the 429 reaches a Server Component's
"safe" fetcher, which returns `[]`, and the section returns `null` — so the page
renders with a whole section silently absent and no error anywhere. Found
because the e2e suite (~25 landing renders/minute through one IP) started
failing at random.

Fixed **for the test run only**: `RATE_LIMIT_DISABLED=true`, set by
`playwright.config.ts`, never in production. Suite went from flaky-and-1.8min to
27/27 in 44s.

**The product risk is untouched and real.** Production pre-renders the landing
page at build time, so if the API throttles or hiccups during `pnpm build`, a
page missing sections gets baked and served to everyone until the next deploy.
Options, none taken yet: fail the build when a landing fetcher degrades; render
a visible fallback instead of `null`; or exempt the build's own IP. Worth a
decision before Phase 10 — it is a deploy-time failure mode, not a runtime one.
- [x] **P9.S11 — Authenticity story + engine stage.** ✅ 2026-08-21. New
      reusable `VideoStage` (also S15's) stages the beat with `chapter-2`: the
      poster always renders, the `<video>` mounts **only** on ≥1024px with
      motion allowed, so mobile fetches literally zero video bytes rather than
      relying on `preload="none"` to hold. Imagery law respected — the clip is
      the backdrop, the evidence is the real catalog record (four real
      authenticity fields + a link into that product). 4 new e2e cover mobile
      byte count, desktop muted/looping/silent, reduced motion, and the record
      being real data.

### Two e2e lessons worth not relearning (S11)

1. **`waitForLoadState("networkidle")` can never fire on a page with a looping
   video.** Twenty-four tests started timing out at 30s the moment the hero
   gained its stage, and nothing was wrong with the page. All landing specs now
   wait on `#hero` instead. Playwright's own docs discourage `networkidle` for
   exactly this reason.
2. **Never run `turbo run build --force` while the Playwright dev server is
   up** — it rewrites `.next/` underneath `next dev`, the next request has to
   recompile from cold, and every test times out at once looking like a mass
   regression.
- [x] **P9.S12 — Symptom finder + interstitial plate.** ✅ 2026-08-22, `0050147`.
      Full-bleed atmosphere plate (`plate-body`) between the symptom finder and
      the brand wall — no card chrome, no heading rail, the page's third
      distinct compositional beat. Copy sits on the start-side third because the
      plates ship pre-mirrored from S3; `.interstitial-scrim` is written `to
      left` for the RTL default and flipped under `[dir="ltr"]`, since CSS
      gradients take no logical direction keyword. Symptom finder lost its
      visible `SYS-xx` code — with it the section was a second copy of the
      hero's system index (**closes audit item 4**, found at S9) — and gained a
      48px target plus a focus ring; namespace moved to `Landing.beats`.
      `LandingImage` extracted from HeroStage/VideoStage so the plate could
      reuse it.
- [x] **P9.S5 (revisited) — docked-sprite hero, 3 parts.** ✅ 2026-08-26, all three parts shipped. Owner delivered a new
      Fable batch 2026-08-22: a stripped car + 7 part sprites, replacing the
      exploded model with a car that starts *assembled* and comes apart on
      scroll (`fableTasks.md` §3.2).
  - [x] **Part 1/3 — assets + pipeline.** ✅ 2026-08-22, `7cf297b`. 8 raws moved
        out of the output dir into `landing-src/hero/`, renames verified by
        re-measuring alpha bounding boxes. Pipeline gained an opt-in per-group
        trim, a metadata re-read from the trimmed buffer, and a ladder that
        can't come back empty. `landing-image.ts` now reads the generated
        manifest instead of hand-written ladders. Budgets measured: base
        **19.9KB** (≤90), 7 sprites **78.7KB** combined (≤120). See standing
        decisions 4 and 5.
  - [x] **Part 2/3 — dock calibration + static composite.** ✅ 2026-08-25.
        **The shipped sprites were batch 1, not batch 2.** Part 1 ran the
        pipeline at 20:08; the owner's replacement batch landed at 21:46, after
        that commit, and was never processed — so every "the sprites are
        centred product shots, docking is hopeless" note was measuring the wrong
        files. Re-ran `pnpm optimize:landing` against batch 2 first, pruned 22
        orphaned batch-1 variants, renamed `sprite-headlight` →
        `sprite-headlights` (§3.2 wants both lamps), and moved `source-car.png`
        to `landing-src/hero-reference/` so the pipeline stops treating a
        reference master as a shippable layer. Sprite budget **78.7KB → 45.7KB**.
        **Four of the seven need no calibration at all** — bumper, grille,
        fender and door are true in-place isolations whose trim boxes land on
        their own apertures, so `heroLayout.ts` docks them at native
        registration and holds a *delta* for the other three rather than an
        absolute position for all seven. Hood (scale 0.66, rotateZ −4°),
        windshield (scale 0.37) and the lamps were calibrated by rendering the
        real CSS-3D stage in Playwright and measuring each layer's alpha bbox in
        canvas coordinates — not by eye. `HERO_FRAME_WIDTH_PCT` 72 → 92: at 72
        the car was 58% of the stage wide and a third of it tall, floating in
        empty graphite. `HeroStage` is now a **server component** (the docked
        car has a correct resting frame, so it needs no JS) — route JS 189KB →
        **184KB**.
  - [x] **Reduced-motion backstop inverted, as warned.** `globals.css`'s
        `.hero-stage > * { transform: none !important }` and its `<noscript>`
        twin are **deleted**, not adjusted. They existed to jump a
        reduced-motion visitor from the collapsed first frame to the separated
        end state; against a docked car the same rule scatters every part for
        exactly the visitor who asked for less movement. Part 3's backstop must
        PIN the docked transform, never clear it. `landing-hero.spec.ts` proves
        the inverse geometrically: under `reducedMotion: "reduce"` all 8 layer
        boxes must still overlap the base's box.
  - [x] **Part 3/3 — undock motion.** ✅ 2026-08-26. `HeroStage` is a client
        leaf again, the `.hero-track` / `.hero-pin` scaffolding and
        `Landing.beats.hero.scrollHint` are back, and `useScroll` drives three
        chapters off the track (never the pin — a pinned box stops moving and
        can't drive anything).
        **Out and back, not out and gone.** `CHAPTER_RANGE` is now
        **sequential** — `0.02–0.34`, `0.36–0.66`, `0.68–0.98` — where v1
        overlapped, because fableTasks §5 asks for "each chapter re-docking
        before the next begins" and a docked car wants exactly that: one group
        in the air at a time, the composite legible at every rest beat, and a
        whole car again at the end of the track instead of a cloud of panels.
        Each layer interpolates `[from, peak, to] → [0, 1, 0]`.
        Translation is expressed in percentages of the part's **own box**, not
        the stage, so one `motion.img` carries the whole transform — as a stage
        percentage it would need a wrapper to measure against and the rotation
        would then apply about the wrong origin.
        **Rotations run the other way: dock value → 0.** They exist only to sit
        a neutral product shot on a car photographed at an angle; a part in
        mid-air owes the car nothing, so it turns to face the viewer as it
        leaves. Today only the hood has one (`rotateZ -4`), but the mechanism is
        general.
        Vectors are mostly vertical by necessity: the frame is square inside a
        16/11 stage, so only canvas rows ~130–894 are visible (≈200px of air
        above the car, ≈190 below) while sideways the car already spans 103–926
        of 1024 and a part that keeps going lands on the copy column. A test
        computes that visible band and fails any part that lifts out of sight.
  - [x] **Reduced-motion + no-JS backstop, done the right way round.**
        `globals.css` and the `<noscript>` twin collapse `.hero-track` and
        unpin `.hero-pin` — and deliberately **touch nothing else**. There is no
        `.hero-stage > *` rule any more: the dock transforms are inline on each
        layer and clearing them would undock every sprite. Reduced motion
        renders `DockedLayer`, which never subscribes to scroll, so the correct
        picture is already in the SSR paint.
- [x] **Hero collapsed-frame bugfix.** ✅ 2026-08-22, `c8ae9b3`. Owner reported
      the hero as "not what I wanted": nine ghost parts ringing the car instead
      of tucked inside it. Two bugs, both measured in the running page.
      (a) **RTL inverted the collapse** — `insetInlineStart` measures from the
      right in Persian while the translate kept computing a left-based delta, so
      parts pushed outward and four of nine landed outside the stage (-4%, -3%,
      104%, 109%). The stage is now `dir="ltr"`: it is a diagram of a physical
      object, not text. This also removes the same trap from the docked-sprite
      hero, where it would be fatal rather than ugly.
      (b) **The collapse maths ignored its own scale** — `translate(T) scale(s)`
      about centre O maps p to O + T + s(p-O), so landing on the car needs
      T = s(O-p), not (O-p). Every part overshot to the opposite side at 45% of
      its distance. All nine now sit at exactly 50,50 at rest.
      (c) Fixing those turned axe red and that was the useful part: the scroll
      hint is `graphite-500` on `graphite-950` = **3.38:1** against a 4.5
      minimum, a real defect that only passed because a stray part render sat
      behind the text and stopped axe resolving a background. Moved to
      `graphite-400` (5.30:1). Verified by stashing the fix — axe goes green
      with the parts scattered, red with them tucked away.
      ~~**Known, not fixed:** the sequence still plays largely as the hero
      scrolls off the top.~~ **Fixed 2026-08-22, `cdd2319`** — see below.
- [x] **Hero sticky stage (composition change).** ✅ 2026-08-22, `cdd2319`.
      The stage now sits in a `.hero-track` (`min-h-[calc(100vh+14rem)]`,
      `lg:…+34rem`) and is pinned by `.hero-pin` (`sticky top-24`). `useScroll`
      binds to the **track**, not the stage — a pinned element's own box stops
      moving and can never drive anything. With `["start start","end end"]` the
      travel is the track height minus one viewport, and because the track is
      `100vh + X` that travel is **exactly X on every screen** (544px desktop,
      224px mobile) rather than drifting with window size. Measured at 1440×900
      and 390×844: stage holds at viewport top 96, 100% visible from progress 0
      through 1, all nine parts landing on their declared heroLayout positions.
      Two blockers had to move first: the section's `overflow-hidden` made it a
      scroll container and silently killed `sticky` (now `overflow-x-clip`,
      which clips the same way without creating one, so the sideways-scroll e2e
      guard still holds); and the left column is now `lg:sticky lg:top-24
      lg:self-start` so the CTAs ride alongside instead of being stranded.
      Reduced motion and no-JS **collapse the whole apparatus** (track → content
      height, pin → static): verified 1444px → 626px, hero 1894px → 1149px, so
      nobody scrolls a screen and a half of empty spacer for motion they never
      see. Route JS **189KB** vs 192KB recorded after HeroV2 — no regression.
- [x] **P9.S13 — Brand wall + Deals.** *(`11f82d5`)* Marquee pauses on hover
      and for reduced motion (CSS backstop included, so the SSR paint is covered
      too); Deals renders nothing at all until live deals exist, asserted as an
      absence rather than left to inspection.
- [x] **P9.S14 — Closing beat, real contact, hides.** *(`ad2223f`, closes audit
      items 5 & 6)* Three end-of-page sections folded into one beat; real
      owner-supplied phone and Telegram in `lib/contact-info.ts` with WhatsApp
      absent rather than dead-linked; Numbers deleted, Newsletter and Guides
      behind named `SECTION_HIDDEN` flags.
- [x] **P9.S15 — Closing ambience + footer pass.** *(2026-08-24)*
      (a) `chapter-4` stages the closing beat through the existing `VideoStage`
      (§3.3 rules: desktop + motion gets the clip, everything else the poster,
      zero video bytes below 1024px), behind a new `.closing-scrim`. That scrim
      is **vertical**, so unlike `.interstitial-scrim` it needs no RTL/LTR pair
      — `to top` means the same in both. `color-mix`, not an opacity modifier:
      Tailwind cannot apply one to an opaque `var()` colour (§6.8).
      (b) Footer renders **every** channel from `CONTACT_CHANNELS` (was phone
      only) and borrows its labels from `Landing.beats.closing.support`, so the
      footer and the beat share one source for values *and* labels and cannot
      drift — asserted directly: the two must render an identical href set.
      Copyright year now goes through `toPersianDigits`, the last Latin numeral
      in the footer.
      (c) **The footer pass found a real dead link and it is now fixed.** The
      vehicle column had always pointed at `/vehicle/{make}` and that route did
      not exist — both entries 404'd, the same class of failure the 2026-08-14
      audit found one level down at `/vehicle/{make}/{model}` (item 1). Owner
      chose to build the missing route rather than defer or drop the column:
      new `app/[locale]/(shop)/vehicle/[make]/page.tsx` + `fetchMakeRoute`
      (`lib/fetchers/vehicles.ts`) + `VehicleMakePage` messages. It is a
      coverage list, not a card grid — model on the start side, its generations
      as mono year chips on the end side, ruled rows; a model with no seeded
      generation stays as plain text rather than getting a link that 404s.
      Unlike the `*Safe` fetchers it separates **not-found from down**: an
      unknown slug must 404 (degrading would tell a crawler the URL is real),
      only a failing API may render the apiDown state.
      DoD: `pnpm lint` clean · `pnpm test` 655/655 · `pnpm --filter web build`
      green, landing route JS **189KB** (unchanged — the new page is its own
      122KB route) · `pnpm e2e` **60/60**, including 13 new assertions
      (`landing-sections.spec.ts` closing-ambience + footer blocks, new
      `e2e/vehicle-make.spec.ts`) · axe 0 in light and dark on both the closing
      beat and the new make page.
      **Two environment traps hit while verifying, both worth knowing:**
      `apps/api/.env` had a credential-less `MONGODB_URI` while the dedicated
      27018 instance runs with `authorization: enabled` — the API connects
      fine and then every query fails `Unauthorized`, which surfaces as
      *sections silently missing from the page*, not as a database error.
      And **never run `pnpm build` while `next dev` is serving**: they share
      `.next`, the build clobbers the dev manifests mid-run, and the suite then
      fails wholesale with ENOENT 500s that look like real regressions (cost
      one 16-minute red run here).
- [x] **P9.S16 — Regression suite.** *(closes audit item 7, 2026-08-25)*
      New `e2e/landing.spec.ts` guards the page **as a page**: 9 full-page
      screenshots (360/390/1440 x light/dark, plus reduced-motion at each
      width), a link sweep, and axe across all six width/theme combinations.
      Legacy hero deleted for real -- `Hero.tsx`, `ExplodedView.tsx`,
      `explodedViewLayout.ts` -- along with the 14 message namespaces they and
      the S9/S14 deletions had orphaned, in **both** catalogs.
      **The sweep found two live families of dead links, both now fixed:**
      (a) `Header.tsx`'s five-item category menu carried three stale slugs
      (`suspension`/`body`/`brake` vs the real `suspension-steering`/
      `body-exterior`/`brakes`) -- the identical drift the footer had already
      been fixed for. It now names systems by **code** and resolves the slug
      from `CATALOG_SYSTEMS` at module load, so it cannot rot again and an
      unknown code throws at import instead of shipping a dead menu.
      (b) The footer's «راهنما» column linked seven policy pages that have
      never existed (`/about /contact /faq /returns /warranty /privacy
      /terms`). Owner chose **hide, not defer**: `POLICY_COLUMN_HIDDEN`, the
      same named-flag pattern Newsletter and GuidesTeaser use. The four legal
      pages need copy only the owner can write; that is what it waits on.
      **Three test-craft notes worth keeping:**
      *Masks.* The first version masked all six API-backed sections and the
      footer; since they sit next to each other the baseline came out with one
      magenta slab over ~40% of the page and could not have caught anything.
      Only `<video>` is masked now — the seed is committed and idempotent, so
      a deliberate reseed is the one thing that invalidates a baseline, and
      the answer to that is `--update-snapshots`, not a permanent blindfold.
      *Flake.* `360px light` failed once in a parallel run and passed alone:
      lazy images below the fold and an unswapped webfont. `settleForCapture`
      scrolls once, awaits `document.fonts.ready`, then waits (**bounded** —
      awaiting each image's own load event hung outright, since a lazy image
      that never enters the viewport stays `complete === false` forever).
      *Link sweep* asks twice before calling a link broken: 40 sequential SSR
      renders under 10 workers occasionally 500, a real 404 answers twice.
      `mergeCatalogs` is now exported and tested directly — its old tests
      asserted merge semantics through whichever copy happened to exist in
      both catalogs, so deleting a dead namespace broke a test that was really
      about something else.
      DoD: `pnpm lint` clean · `pnpm test` **657/657** · build green, landing
      route JS **189KB** unchanged · `pnpm e2e` **78/78, twice in a row**.
- [x] **P9.S17 — Measure + hand off.** *(2026-08-25 — Phase 9 landing rebuild
      complete: S2–S17 all shipped)*
      Clean production build + Lighthouse 13.4.1 re-run on the exact P4.S7
      methodology (mobile 360x640 DPR 2, `--throttling-method=devtools`,
      against `pnpm --filter web start`). Full numbers and the comparison table
      are in `docs/performance-landing.md`, which now carries a P9.S17 section
      alongside the P4.S7 baseline rather than overwriting it.
      **Route JS 189KB** against §10's 180KB budget — over, knowingly, and
      unchanged since S5 put the scroll stage in. S13/S15/S16 and this build
      all measure the same 189: three steps of new work (a second video stage,
      a whole new route, a regression suite) added zero route JS because all of
      it is server components, CSS or test code. Framer sub-budget **39.9KB
      gz** vs 45KB, still uncontaminated by other libraries.
      **LCP 1.9s** (budget 2.0, was 1.7 at P4.S7 — margin is thinner and that
      is stated rather than rounded away) · **CLS 0.032** (budget 0.05) ·
      **TBT 130ms** · perf **97** · a11y **100** · SEO **100**.
      **Zero video bytes on mobile, measured not asserted**: the network log
      for a real production run contains no `.mp4` at all with two clips on the
      page. Images total 88.9KB across 10 requests against a 1.2MB budget.
      **The pass found and fixed a WCAG 2.5.3 (Label in Name, level A)
      failure the e2e suite structurally could not see.** The hero's ten system
      links had `aria-label="سیستم موتور — مشاهده قطعات"` while reading
      `SYS-01 موتور ۳۲ قطعه` on screen, so the accessible name did not contain
      the visible label — a voice-control user saying what they see would not
      match. The action moved into an `sr-only` span inside the link, which
      appends to the name instead of replacing it. **Why the suite missed it:**
      `label-content-name-mismatch` is in axe's *experimental* set and off by
      default in `@axe-core/playwright`; Lighthouse enables it. Axe at zero is
      necessary, not sufficient — worth remembering for every future a11y DoD.
      **Left open, both small and both logged in fableTasks §7 (items 10–12):**
      the seven policy pages (column hidden, four of them need owner legal
      copy), a real favicon/brand mark (`/favicon.ico` 404s on every load), and
      `/api/v1/auth/me`'s guest 401 logging a console error — together they are
      the whole of the 96/100 best-practices score.

### P9 tail — the three items S17 left open (2026-08-26)

- [x] **`/auth/me` no longer 401s at signed-out visitors.** It ran behind
      `requireAuth`, the web client asks on every page load, and the session
      lives in httpOnly cookies so JavaScript cannot check first — every
      anonymous visit wrote a failed request into the browser console. Now it
      runs under the existing `optionalAuth` and answers `{ ok: true, data:
      null }`. The envelope is unchanged and both fetchers already treated a
      missing user as "signed out", so nothing downstream moved. `PATCH /me`
      keeps `requireAuth`: reading who you are is public, changing it is not.
- [x] **A real icon.** `app/icon.svg` — the isolated Persian «پ», first letter
      of the «پارسیان» wordmark the header and footer already render, drawn as
      paths so it needs no font. **Not a designed mark**; it is a stand-in that
      stops `/favicon.ico` 404ing on every load and gives the tab a name, and
      it is a one-file swap when the owner has a real one. Two traps recorded
      in the file: the root `<svg>` must stay on line 1 with explicit width and
      height (Next's metadata image loader sniffs the head of the file, and a
      comment block above the root made it reject the file outright and fail to
      compile *any* route), and XML comments cannot contain a double hyphen so
      CSS custom properties cannot be named in there.
- [x] **Three of the seven policy pages.** `/about`, `/contact`, `/faq` — real
      Persian copy under a new `Info` namespace, every claim checkable against
      behaviour the codebase enforces. The footer's «راهنما» column is
      un-hidden and lists exactly these three; `POLICY_COLUMN_HIDDEN` is gone.
      `e2e/info-pages.spec.ts` (13 tests) guards them, including an assertion
      that the four missing routes are *not* linked.
      Two bugs found and fixed while looking at the rendered pages: a Latin
      Telegram handle inside an RTL line renders as `boyinshadows@` unless the
      value is isolated with `dir="ltr"` (the footer already did this; the new
      page did not), and `bg-surface-sunken` is the same value as `--bg` in
      both themes, so a panel using it on a plain page has no visible container
      at all — use `border border-rule bg-surface` there.
- [ ] **The four legal pages — blocked on the owner.** `/returns`,
      `/warranty`, `/privacy`, `/terms`. A returns window, warranty terms,
      privacy practices and terms of sale are commitments only the owner can
      make. Writing plausible ones would be worse than a missing page, so they
      are absent from the app *and* from the footer. `/faq` deliberately does
      not answer returns, warranty, or how payment settles for the same reason
      — and because the live gateway is not activated, so any answer about
      paying online would be false today.
- [ ] **A real brand mark — blocked on the owner.** The «پ» above is interim.

### Environment note — `pnpm typecheck` exists now, and you need it

`pnpm build` type-checks app code but **not test files**, and `eslint` does not
type-check at all. A `noUncheckedIndexedAccess` error sat in
`heroLayout.test.ts` through a green lint + green vitest + green build and only
surfaced when `tsc -p` was run by hand. `pnpm typecheck` now runs both projects;
add it to the gate: **lint → typecheck → test → build → `rm -rf apps/web/.next`
→ e2e**.

### Environment note — anything that writes `apps/web/.next` twice at once corrupts it

Found P9.S5 part 2, root cause narrowed 2026-08-26. `.next` is shared mutable
state, and **two writers at the same time** leave it half-written. Three ways to
get there, all of which happen in normal work:

- `pnpm build` while a dev server is running (or the reverse)
- Playwright starting its own dev server while another one is already up
- **two people/agents on the same checkout with two dev servers** — the most
  likely cause when it appears out of nowhere

**The symptom never names the cause.** The server log shows
`SyntaxError: Unexpected non-whitespace character after JSON at position 741`
with `page: '/fa'` attached on *every* render — a half-written manifest under
`.next` parsed as two concatenated JSON documents. What the test output shows
instead is `landing.spec.ts` failing ~9 tests at `openLanding`'s
`expect(html).toHaveAttribute("data-theme", …)` with `Received: ""`, which reads
exactly like a next-themes regression. Retries do not help. `pnpm build` can also
fail with a bare `Build error occurred` from the same cause.

**Fix:** `rm -rf apps/web/.next`, make sure nothing is listening on 3000/4000,
then run once. Recovers immediately and completely.

**Order that works:** lint → typecheck → test → build → `rm -rf apps/web/.next`
→ e2e. And before deleting `.next`, check for a peer's dev server — deleting it
under a running server leaves the process holding the port while answering
nothing, which then looks like [[reference-orphaned-dev-servers]].

Don't go hunting in `messages/fa.json` or the theme provider: exactly one
`JSON.parse` exists in the whole web app and it is client-side `localStorage` in
`CompareButton.tsx`.

### Environment note — `pnpm dev` no longer needs Docker (fixed P9.S5 part 2)

`predev` was `docker compose up -d --wait mongodb`, which fails hard when the
Docker daemon is not running — so `pnpm dev` refused to start over a database
that was never missing. It is now `node scripts/dev-db.mjs`: check the port
`apps/api/.env` actually names, use whatever is already answering, fall back to
compose, and warn rather than exit if compose is unavailable. The API prints its
own connection error naming the URI it tried, which is more useful than this
script guessing.

Worth knowing on this machine: **the compose service cannot start here at all.**
`mongo:8.0` aborts on Linux kernel 6.19+ (SERVER-121912), so Docker Desktop's
WSL2 backend restart-loops it with "MongoDB cannot start: Linux kernel versions
6.19 and newer has a known incompatibility with this version of MongoDB". The
working database is the local instance on the same port 27018
(`reference-local-mongodb`). Only one of the two can hold that port.

### Environment note — `pnpm test` is flaky in parallel on this machine (found P9.S2)

`pnpm test` fails a *different* handful of API suites on every run (2, then 5,
then 6, then 7 files) — always `beforeAll` **hook timeouts at 10s** on
`mongoose.connect` / `Model.init()`, never an assertion. Run sequentially the
same suite is **80/80 files, 567/567 tests green**
(`npx vitest run --project api --fileParallelism=false`). Cause: vitest defaults
to ~20 workers on this 20-core box and each opens its own connection and builds
indexes against one Dockerized Mongo, which on Windows routes through WSL2 and a
port proxy. Nothing to do with application code — verified against a step that
changed none.

This blocks the "`pnpm test` green" line of every step's DoD until it's settled.
Cheapest honest fixes, **owner's call, not taken unilaterally**: raise
`hookTimeout` in `apps/api/vitest.config.ts` (the hooks are slow, not broken),
or cap that project's pool (`poolOptions.threads.maxThreads`). Until then,
sequential is the trustworthy signal and should be quoted alongside the parallel
result rather than instead of it.

### Standing decisions — resolved, still binding

A decision that gets *resolved* stops being a question and starts being a rule,
and a struck-through line in a "deferred" list is exactly where a rule goes to
be forgotten. Resolved-but-load-bearing calls move **here** and stay here. Each
one names where it also lives in the tracked docs, so this section is an index,
not a second source of truth.

1. **`ffmpeg` is a local tool, never a repo dependency.** Resolved 2026-08-20 at
   P9.S3 — owner approved installing Gyan.FFmpeg 9.0 via winget. Build, test and
   CI never touch it; `scripts/optimize-landing.mjs` still emits the full image
   set without it and prints a skip notice for the video half. **On a fresh
   machine, regenerating landing assets needs ffmpeg on `PATH` or `$FFMPEG_DIR`
   set.** Also recorded: masterPlan PHASE 9 amendment 3 · `docs/landing-assets.md`
   §Tooling status · README §Optional local tooling.
2. **Landing masters live outside git.** `landing-src/` (113MB of 2048² PNG and
   2560×1440 MP4) is git-ignored; only the optimized output in
   `apps/web/public/landing/` is committed. **If the owner's disk is the only
   copy, nothing in this repo can restore them.** Also recorded:
   `docs/landing-assets.md` §Where the files are.
3. **Optimized landing assets are generated by hand, not at build time.**
   `pnpm optimize:landing` after any master changes, then re-check the §6 byte
   budgets before committing. Also recorded: `docs/landing-assets.md`
   §Optimized outputs.
4. **`landing-assets.json` is load-bearing, not just an index.** Since P9.S5
   part 1, `lib/landing-image.ts` reads every `srcset` from the generated
   manifest instead of declaring width ladders by hand — the trimmed hero
   layers each land on their own native width, so a shared ladder pointed at
   files that do not exist. Two consequences: **run and commit
   `pnpm optimize:landing` before writing code that references a new asset**
   (until the manifest has it, `manifest.hero` is a type error and the build
   fails), and **never combine `--skip-video` with `--clean`** — skip-video
   carries the previous run's video entries forward so posters keep resolving,
   but `--clean` deletes the files those entries name. Also recorded:
   `docs/landing-assets.md` §Optimized outputs.
5. **Trimming is opt-in per pipeline group.** `TRIMMED = { cutouts: false,
   hero: true, plates: false }` in `scripts/optimize-landing.mjs`. The S2
   cutouts are positioned by their centre inside a 2048² frame, so a global
   trim would silently move every part on the shipped hero. `heroLayout.test.ts`
   asserts both halves — hero layers trimmed, cutouts not.

### Deferred / owner decisions — parked, none blocking S2–S17

1. **WebGL v2 beat.** Owner reports ten GLB meshes exist in their Higgsfield
   library. Activating costs `three`+`fiber`+`drei` ≈150KB gz, a §4 manifest
   amendment, and a §10 budget renegotiation. Not without an explicit yes.
2. **Coupe → domestic-sedan asset swap.** `car.png` is a classic fastback coupe
   (verified). Owner chose to launch with it as workshop atmosphere and
   regenerate a brand-free sedan nearer the Saipa/IKCO fleet later; the S2
   naming makes it a drop-in swap.
3. ~~**No grille render exists.**~~ **Resolved 2026-08-22 at P9.S5.** True of
   the ten standalone `cutouts/` (car, headlight, bumper, piston, alternator,
   air filter, door, hood, fender, windshield), but the new hero batch ships
   `hero/sprite-grille` among its seven docked sprites. The hero layout may
   reserve a slot for the grille; it still must not for anything else.
4. **Numbers section return** — needs four real figures (parts in stock ·
   vehicles covered · orders shipped · years). Re-enable only with data.
5. **Newsletter** — hidden until a subscription backend exists. **Guides** —
   hidden until Phase 9 content lands.
6. **WhatsApp support channel** — masterPlan §5-13 names it; owner supplied
   phone + Telegram only. Add when a number exists.
7. **Light-theme video siblings** — the clips are graphite-dark plates; paper-light
   video would be a regeneration batch, not an edit.
8. **`en.json` revival** — suspended by owner 2026-07-30; lowest priority.

## Landing-page audit backlog — 2026-08-14

Live review covered Persian RTL at 1440px and 390px, light/dark, reduced
motion, internal destinations, and axe. Fix these in order as separate,
reviewable slices; do not trade the real catalog/authenticity evidence for
decorative content.

**Superseded in ordering, not in substance (2026-08-20):** all seven items are
now absorbed into the Phase 9 rebuild above, each closed by a named step — 1→S10,
2→S8, 3→S6, 4→S9, 5&6→S14, 7→S16. Check them off there.

1. [ ] **Fix the broken vehicle-discovery links.** Every model link in
       `ShopByVehicle` currently targets `/vehicle/[make]/[model]`, but the
       shipped route requires `/vehicle/[make]/[model]/[gen]`; sampled links
       returned 404. Redesign the model entry so it selects/exposes a real
       generation rather than guessing one, then add a route-level regression
       check for every rendered landing-page vehicle link.
2. [ ] **Fix the mobile featured-product rail overflow.** At a 390px viewport,
       the first nominal `w-64` card computed to 992px and its image to 966px,
       making `BestSellers` 1,848px tall and showing a mostly blank oversized
       product plate. Make card sizing definite inside the no-wrap flex rail,
       preserve horizontal snap, and verify 360/390px with real seeded media.
3. [ ] **Put OEM/SKU search visibly above the fold.** The hero makes vehicle
       selection clear, but a mechanic with a known code only gets the small
       global-header search (collapsed further on mobile). Add an explicit
       code-first search action to the hero without competing with the vehicle
       selector, and verify keyboard submission and useful no-result behavior.
4. [ ] **Shorten and clarify the mobile discovery sequence.** The audited
       390px page is 11,556px tall before the footer: the hero is 1,440px and
       `ShopBySystem` alone is 2,060px. The exploded-view list and the later
       ten-tile system grid also repeat the same destinations. Keep the
       signature exploded view, but consolidate or progressively disclose the
       repeated system navigation so products, vehicle entry, and authenticity
       evidence arrive materially sooner.
5. [ ] **Remove unfinished dead-end sections until they are operational.** The
       guides block is heading-only, the newsletter form is fully disabled,
       and support exposes `021-00000000` as a clickable placeholder while
       saying hours are pending. Hide these surfaces or replace them only with
       real destinations/contact data; the existing Phase 9 content backlog
       remains the dependency for guides/newsletter functionality.
6. [ ] **Give the lower half a deliberate conversion ending.** After brands,
       the page falls into small statistics, generic process cards, three
       unfinished blocks, and then the footer. Recompose the retained evidence
       into one strong closing beat with a real next action (choose vehicle,
       enter OEM code, or contact support once real contact data exists).
7. [ ] **Add a permanent landing-page visual/link regression check.** Preserve
       the current axe-zero and no-horizontal-document-overflow result, and add
       360/390/1440 screenshots plus assertions for valid discovery links,
       featured-card width, reduced motion, and both color schemes so the two
       confirmed regressions above cannot silently return.

Snapshot as of 2026-08-10. Only what's left — shipped work lives in
`masterPlan.md` §13. Regenerate/update this file rather than letting it
drift; it's a review artifact for the owner, not a second source of truth.

## Storefront design revival — 2026-08-11

- [x] Establish the “Persian workshop manual” direction and restore the missing
      `apps/web/design-quality.md` checklist.
- [x] Rebuild the global header and landing hero around vehicle selection,
      technical atmosphere, and the interactive Exploded View.
- [x] Replace equal-card cadence in trust, system navigation, authenticity,
      featured products, and shared product cards with evidence rails, catalog
      plates, inspection records, real media, and stronger price hierarchy.
- [ ] Carry the same language through PLP filtering and the PDP purchase/evidence
      composition after owner review of this first storefront slice.

## Execution roadmap — 2026-08-10

Ordered by customer value, operational leverage, and dependency risk. Live
Zarinpal activation is intentionally excluded because the owner assigned it
the lowest priority and production credentials/legal prerequisites are absent.

1. [x] Stabilize and ship the in-progress account/profile, visual-catalog, and
       local-development infrastructure work as separate auditable commits.
2. [x] Finish the Phase 5–7 design-quality pass for storefront, cart, and
       checkout.
3. [x] **P5.S5** Vehicle landing pages with fitment-backed product discovery
       and useful per-vehicle SEO content.
4. [x] **P5.S6** Compare up to four products with shareable URL state.
5. [x] Customer reviews and product Q&A foundations plus PDP experience.
6. [x] Admin review/Q&A moderation queue.
7. [x] Admin product media manager and product variants. Shipped 2026-08-10:
       optimized image upload/removal, independent variant SKU/price/stock
       management, PDP selection, cart identity, order snapshots, and atomic
       variant-aware stock reservation/release.
8. [x] Validated CSV product bulk import that preserves derived search fields.
       Shipped 2026-08-10 with quoted-field parsing, all-or-nothing preview,
       reference/uniqueness checks, and normal model creation so search text is
       derived by the authoritative hook.
9. [x] Admin payment reconciliation view without live-gateway activation.
       Shipped 2026-08-10 at `/admin/payments`, detecting amount/status
       mismatches, missing payment rows, stale initiations, and missing
       authorities using only internal order/payment evidence.
10. [x] Admin reports and exports, followed by the full quality gate and push
        to `development`. Shipped 2026-08-10 at `/admin/reports`; final gate:
        lint passed, 625/625 tests passed serially, and production build passed.

Each item is a delivery gate: scoped tests, lint, and build must pass before
starting the next item. Update the checkbox and shipped detail when an item is
complete; do not silently reorder the roadmap around a failing gate.

## Blockers / quick wins

- [x] **`packages/schemas` compiled build-output gap** — fixed 2026-08-04.
      The package now emits `dist/` (`tsconfig.build.json`, NodeNext) and its
      `main`/`types`/`exports` point there; `turbo`'s `dev` task gained
      `dependsOn: ["^build"]`, and vitest keeps resolving `src/` so tests
      never run against a stale artifact. `node dist/server.js` verified
      live against real MongoDB. See `docs/decisions/0024-schemas-build-output.md`.
- [x] **Seed a superadmin account** — done; `ADMIN_SEED_PHONE` is set in
      `apps/api/.env` and a superadmin exists.
- [x] **Design-quality pass on shipped Phase 5-7 pages** — completed 2026-08-10.
      The account-shell slice is shipped: `/orders`, `/orders/[code]`, and
      `/addresses` now use the shared docket primitives and stronger responsive
      hierarchy; the account routes share a scroll-safe navigation shell.
      Product cards and cart rows now surface real catalog media, while cart and
      checkout use ruled commerce surfaces, stronger price hierarchy, selected
      state treatments, responsive composition, and a sticky desktop summary.

## Cross-agent handoff — 2026-08-06

Codex completed the first dedicated design-quality slice from Claude's staged
work. Maintained changes are limited to the account pages/navigation, address
cards, `Sheet` heading semantics, and Persian order-detail labels. Throwaway
seed/session scripts and the ad hoc Playwright verifier were removed after use.
Checks: `pnpm lint` passed; `pnpm test` passed 609/609 against an isolated local
MongoDB; `pnpm build` passed. Continue the design backlog with the storefront,
cart, and checkout as separate reviewable slices; do not redo this account slice.

## Phase 5 — Storefront backlog

- [x] **P5.S4** Brand pages (`/brand/[slug]`) — shipped 2026-08-06 with
      category/price/availability facets, sorting, cursor pagination, real brand
      trust fields, localized 404, and SEO metadata. See ADR 0026.
- [x] **P5.S5** Vehicle landing pages (`/vehicle/[make]/[model]/[gen]`)
      — shipped 2026-08-10. Routes resolve every generation in the maintained
      vehicle tree using its seed-natural `yearFrom` segment, while product
      results remain strictly backed by active fitment records. Pages include
      canonical metadata, real make/model/generation evidence, graceful API
      failure and empty-fitment states, and the shared paginated product grid.
- [x] **P5.S6** Compare (up to 4 parts) — shipped 2026-08-10. Product cards
      maintain a bounded four-item browser selection and open a shareable
      `/compare?items=...` URL. The server-rendered comparison validates every
      slug and shows real price, availability, identity, OEM, warranty, weight,
      and dynamic catalog attributes in a responsive RTL table.

## Phase 7 — User dashboard (remaining)

- [x] Dashboard overview/home page — shipped 2026-08-08 at `/account` with
      real order/address/wishlist counts, recent orders, profile completion
      guidance, authenticated SSR gating, and partial-data resilience.
- [ ] Wallet (named Phase 7 scope, no model built yet)
- [x] Reviews / Q&A — shipped 2026-08-10. Reviews require a delivered
      purchase and are unique per customer/product; questions require an
      authenticated customer. Both enter moderation, only approved content is
      public, and PDP forms/lists expose verified-purchase and staff-answer
      evidence. Approved review changes recalculate `Product.rating`.
- [ ] Support tickets (customer-facing)
- [x] Profile page — shipped 2026-08-08 at `/profile`; customers can edit
      their name and optional email. Phone remains read-only because it is
      the OTP login identity; changing it needs a dedicated re-verification
      flow. Notification preferences remain future scope because no
      notification-preference model or provider contract exists yet.

## Phase 8 — Admin dashboard (remaining)

- [x] **P8.S3** Admin: Coupon CRUD UI — shipped 2026-08-02
      (`/admin/discounts`, list/create/edit/deactivate).
- [x] **P8.S3** Admin: Wholesale-account-flag UI — shipped 2026-08-02
      (`/admin/customers`, searchable list + inline account-type toggle).
      Note this also covers the *list* half of "Customers list/detail"
      below; that item now only needs the detail view.
- [x] **P8.S4** Admin: Categories/brands/attributes CRUD UI — shipped
      2026-08-03 (`/admin/categories`, `/admin/brands`, `/admin/attributes`,
      each with create/edit/guarded-delete/restore). Also closed the
      attribute loop: the product form can now assign attribute values, so
      the PLP facets and PDP specs table have real data for the first time.
      Fixed a pre-existing app-wide bug on the way — `meta.total` counted
      soft-deleted rows on every paginated endpoint.
- [x] **P8.S5** Admin: KPI overview / dashboard home — shipped 2026-08-04
      (`/admin`, replacing the redirect stub). Bento composition: revenue
      hero + sparkline, order/AOV/new-customer tiles with period deltas,
      needs-action strip, daily revenue chart + status donut, top
      products / low stock / recent orders. Also fixed an app-wide bug:
      the CSS cascade layer order (`mui, tailwind`) let Tailwind Preflight
      flatten **every** MUI control in the admin panel.
- [x] **P8.S6** Admin: Vehicle manager + Fitment Manager (§3.7) — shipped
      2026-08-04 (`/admin/vehicles` four-column tree browser,
      `/admin/fitment` grid + cascading picker). Delete guards for both
      tree children and Fitment references; fitment writes validate the
      whole make→model→gen→engine chain. Also fixed a real auth bug:
      `GET /auth/me` sat behind the 10/15min credential limiter, so the
      11th admin page view in 15 minutes logged staff out.
- [x] **P8.S7** Admin: Customers list/detail — shipped 2026-08-04
      (`/admin/customers/[id]`; the list half shipped at P8.S3).
- [x] **P8.S8** Admin: Audit log viewer — shipped 2026-08-04
      (`/admin/audit`, timeline + filters + before/after diff,
      admin/superadmin only).
- [x] **P8.S9** Admin: Shipping zones/rates config UI — shipped
      2026-08-04 (`/admin/shipping`; ladder per courier+zone, overlap
      guard, gap/open-ended warnings).
- [x] Admin: Product media manager + variants â€” shipped 2026-08-10 with
      optimized AVIF/WebP media generation and sellable variants propagated
      through PDP, cart, checkout snapshots, and inventory reservations.
- [x] Admin: CSV product bulk import â€” shipped 2026-08-10 with preview-first,
      all-or-nothing validation and derived search-field preservation. Excel
      files can be exported to CSV without adding a spreadsheet dependency.
- [ ] Admin: Refunds + invoices (needs `PaymentProvider.refund()`,
      explicitly deferred at P8.S1)
- [x] Admin: Payments reconciliation view â€” shipped 2026-08-10 at
      `/admin/payments`; intentionally performs no live-gateway calls.
- [ ] Admin: Content management (banners, sliders, menus, pages, blog)
- [x] Admin: Review/Q&A moderation queue — shipped 2026-08-10 at
      `/admin/feedback`, with status filters, approve/reject actions, question
      answers, audit logging, and automatic product-rating recalculation.
- [ ] Admin: Support tickets (staff side)
- [x] Admin: Reports & exports â€” shipped 2026-08-10 at `/admin/reports`
      with operational totals and BOM-prefixed CSV exports for orders,
      inventory, and customers.
- [ ] Admin: Staff RBAC (today: any staff role passes `requireStaff()`,
      no per-role permission granularity — P8.S8's audit viewer is the
      first and only per-role gate)
- [ ] Admin: Settings page

## Phase 11 — Design-system consolidation — adopted 2026-08-26

Plan of record: **`docs/decisions/0027-design-system-consolidation.md`**.
Numbered 11 only because renumbering Phase 10 (Launch) would break every
existing cross-reference — it is scheduled *before* launch.

Owner asked for "a clean UI design system" plus a page showing it on the admin
dashboard. The audit found the token layer already complete and signed off
(ADR 0003/0005/0025) — so this track closes gaps rather than rebuilding.
Owner-confirmed 2026-08-26: **keep the locked stack** (no Tailwind v4, no
shadcn/ui, no Radix, no Lucide, no CVA — only `clsx` + `tailwind-merge` for
`cn()`, a §4 manifest amendment), **in-app pages as the docs surface** (no
Storybook), **iframe the storefront guide** inside the admin page so Tailwind
never enters the admin document, and **landing / PDP / checkout** as the three
token-validation screens.

- [x] **P11.S1 — `/admin/design-system`.** ✅ 2026-08-26 (`edc7325`); the
      checkbox was simply never ticked. Verified 2026-08-29 before continuing:
      the foundations tab is genuinely parsed from `tokens.css` at build time
      (`lib/design-tokens.ts`) rather than transcribed, contrast ratios are
      recomputed from the hex values instead of copied from the ADRs that
      first calculated them, and the page has zero axe violations and no
      console errors in both themes.
- [x] **P11.S2 — `cn()`.** ✅ 2026-08-26. `clsx` + **tailwind-merge v2**
      (v3 targets Tailwind v4; this repo is on 3.4, so the v2 line is the
      matching one). All 21 primitives that composed classes with a template
      literal now use `cn()`, so a caller's `className` genuinely overrides a
      base class instead of merely sitting beside it and losing on source
      order. The config is the whole job: `tailwind.config.js` **replaces**
      `colors`, and tailwind-merge's default colour matcher accepts any
      value, so out of the box it read `text-body-sm` as a colour and
      `cn("text-body-sm", "text-text-muted")` returned only the colour —
      silently dropping the font size on every component. Measured before
      writing the config, pinned by 14 tests. `override` vs `extend` mirrors
      what the Tailwind config does per scale: colours are replaced so they
      are overridden; `fontSize`/`transitionDuration` are only extended, so
      the stock steps still merge; `borderRadius` needs nothing. Four of the
      tests re-parse `tailwind.config.js` and fail if the literal scales in
      `cn.ts` ever drift from it (mutation-checked: removing one colour
      fails them).
- [x] **P11.S3 — Missing form primitives.** ✅ 2026-08-29 (`edb8d55`).
      `Label`, `FormField`, `Switch`, `RadioGroup`, `SearchField`, and
      `loading` on `Button`. **`Spinner` moved here from S4** — Button and
      SearchField both need one, and duplicating it to preserve the plan's
      ordering would have been worse. S4 is short one component, not one
      behaviour.

      `FormField` is the reason the step pays for itself: Input, Select and
      Textarea each carried their own copy of the label/error/describedby
      wiring, a rule that fails silently when it is wrong. All three delegate
      now.

      **Three bugs found doing it:** `aria-required` on a `<fieldset>` is a
      critical axe violation (a fieldset is `role="group"`, which does not
      support it); the switch was first written with `w-11` and rendered as a
      1px line — the silent-utility bug class above, hit again; and
      `Modal`/`Drawer` hardcoded `aria-label="Close"`, one English word inside
      an otherwise Persian dialog.

      **A transparent pseudo-element does not extend hit testing on a form
      control** — proven by a test that clicked 8px above the switch and
      toggled nothing. The switch is a 48×48 control with a 48×24 track drawn
      inside it instead.
- [ ] **P11.S4 — Missing display primitives.** `Avatar`, `Separator`,
      `Progress`, `Alert`, `ErrorState`, `Link`, `Table`, `Accordion`,
      `DropdownMenu`. (`Spinner` shipped at S3 — see above.) The last two carry hand-written keyboard
      behaviour (roving tabindex, typeahead, focus return) since Radix was
      declined — explicit keyboard tests, not just an axe pass.
- [ ] **P11.S5 — Retrofit.** Replace hand-rolled one-offs across the 122
      components with the new primitives; ESLint guard against reintroduction.
      **Add a guard for the off-scale-utility bug class too** — the 13 dead
      utilities listed above plus the two S3 hit are all the same silent
      failure, and a lint rule that knows the real spacing steps would catch
      every future one at write time rather than in a screenshot.
- [ ] **P11.S6 — Validation pass.** Landing / PDP / checkout, both themes,
      360→1920, keyboard, axe, contrast. Token revisions land here if those
      three screens demand a one-off colour, spacing, radius or shadow.

## SHIPPED — Phase 12: the Parts Manifest and the eight defects — closed 2026-09-05

Plan of record was **`fableTasks2.md`** (Fable 5, 2026-09-03), untracked by
owner request and **deleted on close** now that every step has shipped — which
makes this section the only surviving record of the phase. It is kept fuller
than the usual checklist for that reason. `fableTasks.md` (Phase 9) went with
it, for the same reason: its section above already carries the detail.

**Numbered 12, not 10 as the plan says.** Fable wrote `[P10.Sn]`; P10.S1–S22 is
the shipped Postgres migration, so the tags would have duplicated real history
and commitlint's `step-tag-present` would have accepted the collision silently.
Owner chose P12 (2026-09-03); the local plan file was retitled to match.

Two halves, one hero. **The Parts Manifest**: the exploded diagram gets the
numbered parts list a workshop manual prints beside the drawing — a real
`<nav>` + ordered list on the start side, each row a link to that part's
category, rows checking in as their sprite undocks and accumulating rather than
clearing. **The fix list**: the eight defects the owner saw in the 2026-09-03
V1 screen recording, each closed by a named step below.

Hard walls for the whole phase, from the P9.S17 receipts: **route JS 189KB gz**
(budget 180, already over) and **LCP 1.9s** (ceiling 2.0). No new dependency,
no measurable route weight — the manifest's thumbnails are images, not JS.

**Both walls held, and one moved the right way.** At close: route JS **193KB**
and LCP **1.65s** (P12.S13). The route went 198 → 200 as the manifest landed
and then 200 → 193 when S6 took tailwind-merge out of the client bundle. The
one budget that broke is TBT, and it is written up under "what it left open".

**The 189 was stale: the landing route measured 198KB when the phase opened**
(route Size 9.23 → 9.97kB; shared chunks unchanged at 103KB). Attributed at
P12.S5 by rebuilding every commit since P9.S17 clean and reading the
`/[locale]` row: **+1KB at P9.S18, +8KB at P11.S2, +2KB at P12.S4.** The 8KB
was `tailwind-merge` entering the client graph through four client primitives,
three of them in the header — a step whose commit message is a careful account
of the real bug it fixed, and which nothing re-measured afterwards. P12.S6
recovered 7 of it and added the guard that would have objected. Full ledger in
`docs/performance-landing.md`.

- [x] **P12.S1 — Hero typography.** ✅ 2026-09-03. Both defects measured
      before they were touched, by walking the h1's text with a Range and
      grouping characters into visual lines — reading the string and guessing
      where it breaks is the eyeballing this repo has been bitten by before.
      At 1440px the headline set in **five** lines ending on the single word
      «آن.»; the marker sat 32px from the headline as a sibling of it.

      **The cause was not the size, it was the measure.** `display-1`'s fluid
      term is `6vw` but its only consumer lives in a fixed `26rem` column, so
      past 1024px the type kept growing inside a measure that did not. Proven
      by sweeping the cap: 72px → 5 lines, and 64/56/52/48px all → **4**. The
      line count plateaus because the column, not the type, is binding, so
      shrinking further would have spent the display voice for nothing.

      Fixed with three changes, each doing a different job: cap `display-1` at
      `3.5rem` (one consumer, so the token itself was mis-set rather than being
      bent for a caller); `text-balance` on the h1, which is what actually
      kills the orphan since greedy wrap leaves a short last line at *every*
      size this measure allows; and the copy column widened to `32rem` **at xl
      only**. Not at lg: there 32rem costs 19% of the diagram's width
      (494→398px) to buy one line of headline, which is the wrong trade at the
      one breakpoint where the diagram can least afford it. Measured after:
      1920/1440/1280 = 3 lines, 1024 = 4, 768 = 2, 390 = 3, 360 = 4, **no
      single-word last line at any width**, and the marker anchored at 12px
      inside the headline's own block, the way `SectionShell` pairs code and
      heading. The xl column also happens to bring the stage to 57vw at 1440,
      close to the `STAGE_VW.desktop = 55` that `HeroStage` already claims in
      its `sizes` — it was really 63vw before.

      Nine tracked screenshot baselines regenerated. Route JS unchanged,
      measured on both sides of the diff.
- [x] **P12.S2 — Manifest strings + data.** ✅ 2026-09-03.
      `HeroV2/manifestData.ts` + `Landing.manifest` in `fa.json`. No UI.

      **Every SYS code in Fable's §2.4 table was wrong**, which is why it said
      to resolve rather than transcribe. It gave body parts `SYS-09`; `SYS-09`
      is `interior` and body is `SYS-06`. It gave headlights `SYS-06 lighting`;
      there is no lighting system, and the catalogue seeds «چراغ جلو» under
      `electrical`, so `SYS-05`. It gave air filter `SYS-02 filters`; `SYS-02`
      is `transmission`, filters are `SYS-10`.

      **Six rows, not nine, for two different reasons.** Windshield is dropped
      by §2.4's own rule — it ships "only if a glass category route exists" and
      none does; the catalogue's only glass sits inside `body-exterior`. The
      other three are **piston, alternator and air filter, which are not in the
      scene at all**: §2.1 assigns them chapter 2, but `HERO_LAYERS` has exactly
      one chapter-2 layer (the hood). The three engine cutouts P9.S5 planned
      were never docked, though `public/landing/cutouts/` ships all three
      optimized. See the open question below — it decides S3's shape.

      Rows are **derived from `HERO_LAYERS`**, not listed beside it: the
      manifest is an index of the diagram, so a row for a part that does not
      undock would highlight nothing and a sprite without a row would undock
      un-named. `manifestData.test.ts` (11 tests) fails if a layer ever appears
      with neither a row nor a stated exclusion. Mutation-checked both ways:
      removing the windshield exclusion fails 2 tests, and filing the bumper
      under `SYS-09` the way the plan did fails the body-panel test.

      **The strings went in the wrong place first and the repo caught it.**
      They were put under `Landing.beats`, and `i18n/messages.test.ts` failed
      because `beats` holds exactly the eleven v1.27 beats, each with an 01-10
      code. The manifest is part of the hero beat, not a twelfth beat — so it
      lives at `Landing.manifest`, which is what Fable specified.

      Part names are the catalogue's own wording wherever the catalogue sells
      the part («چراغ جلو», «سپر جلو», «درب موتور», «گلگیر جلو» are seeded
      product names) so the row's promise matches what is behind the link. Two
      are not: the grille has no seeded product, and the door is «درب خودرو»
      so a list already carrying «درب موتور» for the hood cannot be misread.

      Route JS unchanged at 198KB — nothing imports the module yet.

      **RESOLVED at S3.** Six rows meant five led to `/c/body-exterior`, because
      the catalogue's categories are flat (ten, one per system) and five of the
      six parts are body panels. Owner chose to put the three engine parts in
      the scene rather than ship the thin version; because rows derive from
      `HERO_LAYERS`, they appeared here on their own and the manifest is nine
      rows across four systems.
- [x] **P12.S3 — Engine parts into the bay.** ✅ 2026-09-03. Inserted after
      S2 with owner approval: §2.1 assigns piston, alternator and air filter to
      chapter 2, and the scene never had them. Piston → SYS-01 engine,
      alternator → SYS-05 electrical, air filter → SYS-10 filters-fluids, so the
      manifest now spans four systems instead of two.

      **They are placed, not docked, and that distinction is the step.** A hero
      sprite was cut out of the car render, so its trim box is a real coordinate
      and `HeroDock` is only a *correction* to it. These three are catalogue
      product shots — an alternator is nowhere in an exterior 3/4 render — so
      there is no native position to correct. `HeroPartPlacement` says where the
      part goes (canvas centre + height; width follows the asset's own aspect
      ratio, since the three trim to 215×528, 497×297 and 395×434 and a shared
      `scale` would size them at random).

      **New `hero-parts` pipeline group**, deliberately not the `hero` one:
      `check:hero` reads `landing-src/hero/sprite-*.png` and asks whether each
      file reconstructs the source car, which these could never do. Masters are
      downscaled to 640² before trimming because a trimmed source contributes
      its own width as the top rung, and the 2048² cutouts would have made that
      rung 1577px for a part that renders ~57 CSS px tall. Three assets, 40KB
      AVIF total.

      **The parts travel down; the hood goes up.** The obvious reading of "the
      parts rise" was built first and rendered wrong: the alternator was
      completely behind the lifted hood — both move rearward, so they arrive in
      the same place — and the other two were pinched into the 38px between the
      hood's underside and the bay. The car occupies canvas rows 333-700 of a
      visible 130-894, so the hood's peak eats the upper band while the lower
      one is 194px of nothing. The bay now opens in two directions, which is
      also how a workshop manual draws one.

      Painted between the base and the sprites, so the docked hood covers them
      completely and the page still opens with a closed car — verified by the
      nine landing screenshot baselines matching **unchanged**. Two new guards,
      both mutation-checked: every part's docked box must sit inside
      `HERO_BAY` (the hood's own footprint), and every undock must clear the car
      body rather than travel back up into the hood's space.

      Route JS 198KB, unchanged. `check:hero` is red — **and was already red on
      a clean HEAD**, identical numbers (78.4% base, 36.8% composite, 7 of 7
      scored as product shots). It reads `landing-src/hero/`, which this step
      does not touch. It is a batch-evaluation tool rather than a gate, and the
      shipped hero was hand-calibrated instead; worth its own look, not this
      step's to fix.

- [x] **P12.S4 — Manifest panel (desktop).** ✅ 2026-09-03. Nine rows, behind
      `MANIFEST_HIDDEN` — S5 flips it with the mobile rail. Verified live with
      the flag temporarily off before shipping it on.

      **The panel is a server component and the choreography is data
      attributes**, which is the only reason it fits: nine rows of image, text
      and link never reach the browser as JavaScript. One client leaf
      (`ManifestCheckIn`) writes `data-chapter-reached` on the `<ol>` from
      scroll progress and `globals.css` does the transitions, so scrolling the
      hero re-renders no React at all.

      **Check-in only ever hides rows it can bring back.** The server renders
      `data-chapter-reached="3"` — every row present — and the client opts *in*
      to the choreography on mount. No JS, or reduced motion, means the
      attribute never appears and the full list simply stands (§2.3). Written
      the other way round the same markup would be an empty panel for both.

      **The highlight is two `setAttribute` calls, not per-part CSS.** Rows and
      sprites both carry `data-part` (stamped in `HeroStage`), so one delegated
      pointer/focus listener pairs them by attribute and both directions fall
      out of it. The pure-CSS `:has()` form needs one rule per part id and would
      hardcode the manifest into a stylesheet. Sprites glow with `filter:
      drop-shadow` rather than an outline — it follows the cutout's alpha, and
      it is the one property that cannot collide with the inline transform
      Framer is already animating on the same element.

      `HeroScrollProvider` lifts `useScroll` out of `HeroStage`: the stage and
      the manifest are in different grid columns, so they now share one
      measurement instead of subscribing twice.

      **A dead utility caught by measuring, not by looking.** The thumbnails
      were written `h-10 w-12`; the piston rendered **118px tall in a 48px
      row**. This config *replaces* Tailwind's spacing scale with
      0,1,2,3,4,6,8,12,16,20,24,32, so `h-10` generates no CSS and the image
      fell back to `height:auto` — `w-12` worked, which is what made it look
      deliberate. Exactly the silent off-scale-utility class P11.S3 hit with
      `w-11` and P11.S5 plans to lint. Now `h-12 w-12`, all nine measured at
      48×48.

      96px thumbnail rung added to the `hero` and `hero-parts` pipeline groups.
      It sits below every stage rung, so the stage still picks what it picked
      before, and small sprites gain a genuinely useful one (`sprite-door`'s
      ladder was `[158]` alone, so a 16px dock on a phone fetched the full 158w).

      **Route JS 198 → 200KB (+2).** Stated rather than rounded away: that is
      the manifest's entire client cost — the provider plus the one leaf — on a
      budget already 18KB over. S5's chip rail is server-rendered and should
      add none.

- [x] **P12.S5 — Manifest mobile + flip.** ✅ 2026-09-05. Chip rail under the
      stage below 1024px, panel above it, one server component under two
      variants with CSS showing exactly one — so there is never a duplicate
      navigation landmark in the accessibility tree. The row/sprite highlight
      moved into `HeroScrollProvider`, which mounts once; left in the manifest
      it would have attached the same delegated listener twice.
      **Three defects the mobile audit found, none visible to any existing
      check.** (1) The hero's columns laid out 1248px wide inside a 390px
      viewport — a grid item's automatic minimum size is its min-content width,
      the rail is a horizontal scroller, and `overflow-x-clip` on `#hero` hid
      the result perfectly: the vehicle selector and all ten system links sat
      at `x=-875`, off-canvas and unreachable. One `min-w-0` on the grid item.
      It surfaced only because axe could not resolve a background for text
      painted outside its ancestor — **a cluster of contrast failures naming
      the page background is a layout failure in disguise.** (2) The manifest
      flashed on every load: the server must send every row visible for the
      no-JS case, so the choreography removed them *after* first paint. Now a
      blocking pre-paint script, the same technique next-themes already uses
      here (masterPlan §6.7). This was also what made the page-level axe sweep
      fail — axe was scoring half-transparent rows mid-fade. (3) Counts
      rendered Latin digits inside Persian copy; ICU's plain `{count}` is a
      string substitution, not a number format. Fixed with `toPersianDigits`,
      applied to the ten system links too, which had the same gap since P9.
- [x] **P12.S3 (re-issued) — Seat the hood on the engine bay.** ✅ 2026-09-05.
      Owner-reported from the running hero: the hood sat over the cowl and the
      windshield with the bay still open in front of it. `dy -95` put its box
      at rows 352–490; the bay is at 389–527. Scale and rotation were already
      right, only the offset moved. **`HERO_BAY` moved with it, and so did the
      three engine parts** — that constant is derived from the hood's own
      registration, so while the hood was wrong the box was wrong, and
      `manifestData.test.ts` was confirming that all three parts sat inside a
      bay that was not where the bay is. *A derived constant is only as true as
      the thing it is derived from.* Calibrated by compositing the sprite onto
      the stripped shell against the shell's own geometry, not by eye.
- [x] **P12.S6 — Take tailwind-merge out of the client bundle.** ✅ 2026-09-05.
      Inserted before the separation work at owner request. Landing route
      **200KB → 193KB**. `cn()` pulls tailwind-merge into any route a Client
      Component reaches it from; four did, three of them via the header. Three
      accept no `className` at all and compose a static base with an internal
      variant map, so the merge had nothing to resolve — they use `cx()`
      (`lib/cx.ts`, clsx only, a **separate module on purpose**: importing any
      binding from `lib/cn.ts` pulls the module and the module pulls the
      merge). `SearchField` keeps `cn()` because it really does merge a
      caller's className, and it is not on the landing route's client graph.
      **The guard matters more than the kilobytes**: `cx.test.ts` pins
      `cx(...) === cn(...)` for all eight migrated compositions, then walks
      `components/` and `app/` and fails on any `"use client"` file importing
      `@/lib/cn` that is not in an allowlist carrying a written reason. P11.S2
      was not careless — nothing re-measured the route afterwards and nothing
      would have objected. Now something objects.
- [x] **P12.S7 — Run e2e against a build, not `next dev`.** ✅ 2026-09-05.
      The whole suite runs in one invocation for the first time: **119 tests,
      1.7 minutes.** `next dev` rewrites `.next/prerender-manifest.json` as it
      discovers routes and does not truncate, so concurrent route compilation
      (Next's own link prefetch on a long page) lands a short write on top of a
      long one. The file becomes valid JSON followed by the tail of the
      previous copy, every render throws `SyntaxError: Unexpected non-whitespace
      character after JSON at position 741`, and **it never recovers**. From
      the outside it looks like the last nine tests failing on `data-theme` —
      i.e. a theming bug. It was written off as "dev-server endurance" once
      already. Not memory (`--max-old-space-size` changes nothing) and not
      slowness (a 30s timeout just fails slower); found by scanning every
      `.json` under `.next` after a failed run — 26 files, exactly one
      unparseable.
- [x] **P12.S8 — Separation legibility.** ✅ 2026-09-05. Defect 2. Three causes
      fixed together: every layer in a chapter shared one beat, so a chapter
      was one event with several shapes in it; a beat had no hold, so a part
      was never still and was a smear at any scroll speed; and the whole
      sequence had 544px of scroll to happen in, about 60px per part. Each slot
      now has its own staggered span with a rise/hold/fall, and the track is
      56rem/120rem (was 14/34) so a beat is ~257px, about 0.9s at an unhurried
      scroll. **The hood is a cover, not a beat** — given a slot like anything
      else it opened, shut, and *then* the piston and alternator emerged
      through a closed bonnet, which the filmstrip showed immediately. A cover
      holds open across every slot in its chapter, by construction. `BEAT_SPAN`
      came down 0.62 → 0.42 because the test caught two slots holding at once;
      the invariant is the point of the step, so the constant moved, not the
      test.
- [x] **P12.S9 — Best-sellers honesty upgrade.** ✅ 2026-09-05. Defect 3. The
      no-photo state is a technical plate now: the part's system drawn as line
      art on ruled paper with its `SYS-xx` code and Persian name, corner ticks
      like a drawing frame. Ten glyphs drawn in-repo, stroke only, no
      dependency and no request. **The plate needed the product to know its own
      system and it did not** — a product row carries a `categoryId`, the code
      lives on `Category` — so `systemCode` is now an optional field on the
      product list DTO, resolved in one extra query per page and converted to
      wire form (`SYS_05` → `SYS-05`). Optional because only endpoints that
      resolve a category can fill it, and a consumer that cannot is better off
      knowing than guessing. The rail leads with photographed parts when there
      are any — a preference, not a filter.
- [x] **P12.S10 — Evidence code format.** ✅ 2026-09-05. Defect 4. Codes are
      36–45 characters (`VER-SKU-ENGINE-CYLINDER-HEAD-GASKET-PRIDE-111`) and
      were plain text inside Persian copy: they wrapped, they could be
      **reordered** by the bidi algorithm (every character present, in the
      wrong visual order — the worst failure for a value whose whole job is to
      be compared against a hologram), and proportional digits made a column of
      them jitter. One `EvidenceCode` component: `dir="ltr"` **with
      `unicode-bidi: isolate`**, one line, tabular mono, ellipsis. The full
      code never leaves the DOM — truncation is `text-overflow` only. It does
      **not** shorten the codes: the stored value is what
      `GET /authenticity/verify/:code` resolves, so minting shorter ones is a
      migration that invalidates every code already printed.
- [x] **P12.S11 — Media verify pass.** ✅ 2026-09-05. Defects 5 and 7, and
      **neither was a bug.** Defect 5: a frame from each shipped `.mp4`,
      flipped, is pixel-identical to the same frame of its source — mean
      absolute difference **0**, both clips. There are no `-rtl` files to swap
      between; the flip is baked in by ffmpeg. The manifest was easy to misread
      on exactly this point, so each clip now carries its own `mp4.mirrored`
      and a test fails if it stops being true. Defect 7: at 360, 390 and 1440
      the footer's bottom edge lands exactly on the viewport's at maximum
      scroll and nothing renders below it. What a recording shows past the end
      is browser over-scroll painting the canvas colour, which is dark by
      design in the dark theme.
- [x] **P12.S12 — Brand wall treatment.** ✅ 2026-09-05. Defect 6. A ruled band
      with names at h1 (36px/28px, was 20px) and a separator between entries.
      **No letter-spacing, deviating from the plan on purpose**: Persian is a
      cursive script and `letter-spacing` pulls joined letters apart, so «بوش»
      would render as three disconnected shapes. The spacing that reads as
      deliberate here is between names. `whitespace-nowrap` closes the orphan —
      «سایپا یدک» is one name. `grayscale` stays on the link although it does
      nothing to text: it is the hook the SVG-mark swap needs (§5.6).
- [x] **P12.S13 — Regression + receipts.** ✅ 2026-09-05. Full numbers in
      `docs/performance-landing.md`. **LCP improved 1.9s → 1.65s; CLS 0.034;
      route JS 193KB; Lighthouse a11y 100; the full e2e suite is 119 green.**
      One number got worse and is carried into the backlog below.

### Phase 12 — what it left open

- [ ] **TBT is 261ms against a 200ms budget** (median of five runs; was
      90–120ms pre-phase, measured on the same machine in the same session so
      it is not contention). Isolated: building the current tree with
      `MANIFEST_HIDDEN = true` puts it back to 130ms with every other Phase 12
      change still in place, so **the visible manifest is the whole
      regression** — and it is hydration, not layout. `content-visibility: auto`
      on the below-the-fold rail was the obvious candidate; it was tried and
      **measured no change** (median 299ms over five runs). `srcset` weight was
      ruled out too (4.2KB across the whole page). What is left is that the
      manifest renders **twice** — panel and rail — so the fix is to render it
      once, and that is blocked on a real conflict: §2.1 wants the panel sticky
      inside the copy column, §2.2 wants the rail pinned with the stage or it
      scrolls away before the chapters play. Resolving it means rethinking the
      hero grid so one manifest can sit in either column per breakpoint and
      stay sticky in both — a design step, not a property.
      **Do not measure `/fa`** — it 307-redirects to `/` and the redirect alone
      reads as +0.6s of LCP.
- [ ] **The page has no `rel=canonical`** (Lighthouse SEO 92, not a Phase 12
      regression — it was never there). Needs the site's real public origin,
      which is an owner input, so it is not guessed at here.
- [ ] **Seed data makes the best-sellers rail look broken** even though the
      code is right: eight cards that are two product names repeated four
      times each at stepped prices, and not one seeded product has a photo. So
      S9's photo-first ordering is a no-op until real photos land (§5.5).

### Phase 12 — parked, unchanged (fableTasks2 §4)

WebGL v2 (the budget says no; the Manifest was this phase's wow at zero
grams) · the coupe→sedan re-render batch (owner runs it with Fable; the §3.1
rename map keeps it drop-in, and manifest thumbnails swap with it) ·
light-theme video siblings · Newsletter backend · Guides content · `en.json` ·
a scrub-driven hero.

**Numbering note.** The shipped tags do not match the plan's, because two
steps were inserted (S6 budget, S7 harness) and one was re-issued (S3, the
hood). Plan S6→S8, S7→S9, S8→S10, S9→S11, S10→S12, S11→S13. Commit subjects
are the source of truth.

**Owner inputs this phase waits on** (fableTasks2 §5 — none blocked S1–S13):
WhatsApp number · returns window/conditions/who-pays · warranty duration and
what voids it · business name and registration details for privacy + terms ·
product photos for the best-seller eight · a real ParsianStore mark and any
part-brand SVGs you have rights to · the four Numbers figures.

## Phase 9 — Content, SEO, hardening

- [ ] Blog + guides (lead with counterfeit-identification content)
- [ ] Full JSON-LD coverage
- [ ] Sitemap splitting
- [ ] Meilisearch swap behind `SearchProvider` (now PostgreSQL full-text, P10.S8 — still worth revisiting if Persian ranking needs a real analyzer)
- [ ] Redis for rate limiting + token revocation
- [ ] Caching & ISR strategy
- [ ] Error tracking (Sentry or equivalent)
- [ ] Analytics
- [ ] Load testing
- [ ] Penetration-test checklist
- [ ] Backup & restore runbook

## Engineering standards — `docs/engineering-standards.md` (2026-08-26)

Owner asked for a rule book covering **where data lives** (state manager vs
localStorage vs direct API call) and **what "current" means for a 2026 site**.
Written as a tracked doc rather than folded into `CLAUDE.md`, which stays the
short always-loaded non-negotiables list; the new file is the reasoning
underneath it and explicitly defers to it on any conflict.

Part 1 is a seven-row decision table for state, derived from what this codebase
already does rather than from generic advice — Server Component fetch by
default, URL for anything shareable, a Zustand store as a *cache* for
server-owned data (`cart`/`wishlist`/`auth`, never persisted), Zustand +
`persist` for browser-owned data (`garage`), a cookie mirror when a Server
Component must read a client-owned value, TanStack Query for client-side
mutation, `useState` for ephemera. It names one outlier to fix opportunistically:
`CompareButton.tsx` talks to `localStorage` directly instead of through a store.

Part 2 is the 2026 baseline with sources: Core Web Vitals unchanged (LCP ≤2.5s,
INP ≤200ms, CLS ≤0.1 at p75), and the accessibility position — the European
Accessibility Act has been enforceable since **June 2025** against **EN 301 549,
which currently incorporates WCAG 2.1 AA**, with **EN 301 549 v4.1.1 expected
during 2026 to incorporate WCAG 2.2**. This project already targets 2.2 AA, so
that update should be a no-op; the note exists so nobody relaxes to 2.1.

Re-check the cited sections yearly — they are the parts most likely to go stale.

## DONE — migrate MongoDB → PostgreSQL + Prisma (finished 2026-08-28)

Adopted 2026-08-26, finished 2026-08-28 in steps P10.S9–S20. Three decisions
made at the start held throughout:

1. **UUID v7 primary keys.** Time-ordered so they index and paginate like a
   sequence while staying globally unique.
2. **Phased, app green throughout.** Not a big-bang cutover.
3. **Reference data seeded, no products.** Provinces/cities, Saipa and Iran
   Khodro vehicle tree, catalog systems, shipping rates and a superadmin.

Final state: **no Mongoose anywhere.** `src/models/` is gone, so are
`config/db.ts`, `config/testDbUri.ts`, the sanitize middleware, and both
`mongoose` and `express-mongo-sanitize`. 58 API test files, 511 tests; 74
files and 621 tests across the monorepo, all passing, with `pnpm lint`,
`pnpm typecheck` and a full `pnpm build` clean.

### Bugs this actually found

Worth reading before the next schema change: every one of these was silent,
and most were introduced by the translation itself rather than found in the
old code.

- **28 test files could not even be imported.** The P10.S5 codemod wrote
  `../../../config/testDb.js` regardless of a file's depth. Vitest reports
  that as a failed *suite*, not a failed test — a run looked like 56 red
  files with 4 red assertions, and the other 52 never executed a line. The
  same codemod also replaced auditLog.test.ts's own `listen` with
  `startTestServer()`, which boots the real app, so every route it tested
  404'd.
- **Engine displacement was truncating.** Litres (1.3) into an `Int`
  column: every seeded engine stored 1. Nothing failed — the seed is in
  litres, the wire schema accepts any number, PostgreSQL truncates.
- **The catalog seed was not idempotent.** It pairs templates with
  `flatModels[i % length]` and that query had no `orderBy`; PostgreSQL
  returned a different order on the second run, so 320 products became 640.
  Mongo's natural `_id` order was stable by accident.
- **Cart identity lost its uniqueness.** Mongo had a sparse unique index on
  `userId`/`anonId`; the schema translation made it a plain index, so "one
  cart per identity" was something the code hoped for. Restored as nullable
  uniques (migration 20260828204500).
- **Shipping bands had a unique they cannot have.** A plain unique counts
  tombstoned rows, so deleting a band made it uncreatable forever. Dropped
  for a plain index; `assertNoOverlap` is stricter anyway (20260828205500).
- **The duplicate-key handler stopped working.** middleware/error.ts still
  matched Mongo's `{ code: 11000 }`, so every unique-constraint violation in
  the app answered 500 instead of 400 from the first migrated module onward.
- **Two id validators were missed by the UUID sweep**, both in
  modules/feedback, because they spelled the 24-hex regex out inline
  instead of importing the shared schema. Every moderation call would have
  been rejected with a 400. `packages/schemas`' own vehicleKey test had the
  same problem and had been failing unnoticed.
- **`verifyOtp` counted failed attempts with read-modify-write**, so two
  racing attempts could each read the same value and let a sixth try
  through the five-try lockout. Now `increment`.

### What the move bought

- **Real transactions.** `adjustStock` used to carry a comment admitting
  its audit row could be lost, because multi-document transactions need a
  replica set and this project's MongoDB was not one. Stock+audit,
  reservation+decrement, order+payment, and payment settlement
  (payment+status+history) are each one transaction now.
- **Referential integrity.** A fitment can no longer name a make that does
  not exist; an order line cannot point at a deleted product. Most of the
  test-fixture churn in P10.S19 was exactly this being enforced.
- **Two column-to-column comparisons** (`usedCount < usageLimit`,
  `stock <= lowStockAt`) became field references instead of `$expr`, and
  every hand-escaped `$regex` became a bound `contains`/`startsWith`.

### Things to know when working on this

- **The generated-column false drift.** `prisma migrate diff` emits
  `ALTER TABLE "Product" ALTER COLUMN "searchVector" DROP DEFAULT;` on
  every diff, forever. That statement fails (42601). Delete it from any
  generated migration before applying. It is the only false drift.
- **Hyphenated enum values.** A Prisma enum member cannot contain a hyphen,
  so `CatalogSystemCode`, `SupplyRoute` and `InventoryMoveReason` are
  `@map`ped and `utils/serialize.ts` is the only bridge. The failure mode is
  silent: the database stores one spelling, the app speaks the other, and
  nothing type-errors.
- **The soft-delete extension does not reach nested reads.** Every
  `include`/`select` of a soft-deletable relation states `deletedAt` itself.
  Sometimes that blind spot is what you want (the admin fitment table wants
  to show a deleted generation's name); usually it is not.
- **Two aggregations are raw SQL** — revenue per day and revenue per
  product — because both group by an expression. The extension cannot see
  into `$queryRaw`, so those two spell `"deletedAt" IS NULL` out themselves.
- **`pnpm test` prints a pg deprecation warning** ("Calling client.query()
  when the client is already executing a query"). It comes from the driver
  adapter, results are correct, and it is worth revisiting when `pg@9`
  lands rather than chasing now.

## Superseded — the original deferred note

**Owner decision 2026-08-25.** The store moves off MongoDB/Mongoose onto
PostgreSQL, to avoid problems the owner expects to hit later. **Explicitly a
low-priority, later task** — it is recorded here so it is not forgotten, not
scheduled. Nothing in Phase 9 or the landing rebuild waits on it, and no new
work should be shaped around it until it is picked up.

Scope, measured 2026-08-25 rather than guessed:

- **22 models** under `apps/api/src/models/` (plus their unit tests), and
  **120 files** across `apps/api/src` that import `mongoose`.
- **20 index/`$text` declarations** in the models. `Product`'s derived search
  text is Mongo-specific and is what the Mongo-backed `SearchProvider` reads —
  Postgres wants `tsvector` + GIN, which changes both the write path (the
  derive-on-save hook) and the read path.
- `ObjectId` is a public shape: it reaches the API envelope, the web app's Zod
  schemas, cart/order snapshots, and every `/:id` route. Swapping to a
  Postgres key type is an **API-contract change**, not just a storage one.
- Transactions: the variant-aware stock reservation and release currently lean
  on Mongo semantics; Postgres would let them be real transactions, which is
  an improvement, but the code has to be rewritten to take it.
- Seed data, `scripts/`, the fitment queries, admin reports/exports, and the
  e2e suites all read the current shapes.
- `compose.yaml`, `apps/api/.env`, and `scripts/dev-db.mjs` all name Mongo and
  port 27018 today (see the environment notes above — the local instance is the
  only working database on this machine right now).

Open decisions when it is picked up, **owner's call, not to be assumed**:
ORM/driver (Prisma · Drizzle · pg + Kysely), whether ids become `uuid` or
`bigserial`, and whether it is a clean cutover or a dual-write migration with
real production data. An ADR belongs in `docs/decisions/` before any code.

Prior art to reread first: `docs/decisions/0001-typescript-over-plain-js.md`
for the format, and masterPlan §8's module boundaries — a controller never
touches the ORM, it calls a service. That boundary is what makes this
migration survivable, so **do not weaken it in the meantime.**

## Phase 10 — Launch

- [ ] Production infra (hosting target still open — Liara vs. ArvanCloud
      vs. own VPS, §15 Q7)
- [ ] Live payment gateway + e-Namad seal — explicitly deferred to the final
      launch session by the owner on 2026-08-06; no production Zarinpal API
      credentials are available, and external legal paperwork has not started.
- [ ] SMS provider live — `KavenegarProvider` is already built and
      tested (P2.S4), just never activated (`SMS_PROVIDER` still
      defaults to `mock`); needs a real Kavenegar API key + template
- [ ] Staging → production migration
- [ ] Smoke test suite for prod
- [ ] Monitoring & alerting
- [ ] Rollback runbook
- [ ] Handover docs

## External / non-code blockers

- [ ] **e-Namad / legal entity registration** — confirmed not started
      as of 2026-07-29. Blocks a real live payment gateway. Not
      something an agent session can execute.
- [ ] **Brand logo/mark** — no SVG/image asset exists, text wordmark
      only. Will block PWA icon, social share image, e-Namad seal
      placement. Worth resolving before Phase 9's OG-image work.
- [ ] **Hosting target decision** — Liara / ArvanCloud / VPS (§15 Q7)
