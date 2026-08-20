# ParsianStore — Remaining Work Checklist

## ACTIVE — Landing rebuild, Phase 9 (P9.S2 → S17) — adopted 2026-08-20

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
- [ ] **P9.S6 — HeroV2 proof + flip.** *(closes audit item 3 — OEM/SKU above the fold)*
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
- [ ] **P9.S9 — Absorb Shop-by-system into the hero.** *(closes audit item 4)*
- [ ] **P9.S10 — Shop-by-vehicle real generation links.** *(closes audit item 1)*
- [ ] **P9.S11 — Authenticity story + engine stage.**
- [ ] **P9.S12 — Symptom finder + interstitial plate.**
- [ ] **P9.S13 — Brand wall + Deals.**
- [ ] **P9.S14 — Closing beat, real contact, hides.** *(closes audit items 5 & 6)*
- [ ] **P9.S15 — Closing ambience + footer pass.**
- [ ] **P9.S16 — Regression suite.** *(closes audit item 7)*
- [ ] **P9.S17 — Measure + hand off.**

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

### Deferred / owner decisions — parked, none blocking S2–S17

1. **WebGL v2 beat.** Owner reports ten GLB meshes exist in their Higgsfield
   library. Activating costs `three`+`fiber`+`drei` ≈150KB gz, a §4 manifest
   amendment, and a §10 budget renegotiation. Not without an explicit yes.
2. **Coupe → domestic-sedan asset swap.** `car.png` is a classic fastback coupe
   (verified). Owner chose to launch with it as workshop atmosphere and
   regenerate a brand-free sedan nearer the Saipa/IKCO fleet later; the S2
   naming makes it a drop-in swap.
3. **No grille render exists.** Parts are: car, headlight, bumper, piston,
   alternator, air filter, door, hood, fender, windshield. The hero layout must
   not reserve a hole for a part that was never generated.
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

## Phase 9 — Content, SEO, hardening

- [ ] Blog + guides (lead with counterfeit-identification content)
- [ ] Full JSON-LD coverage
- [ ] Sitemap splitting
- [ ] Meilisearch swap behind `SearchProvider` (currently Mongo-backed)
- [ ] Redis for rate limiting + token revocation
- [ ] Caching & ISR strategy
- [ ] Error tracking (Sentry or equivalent)
- [ ] Analytics
- [ ] Load testing
- [ ] Penetration-test checklist
- [ ] Backup & restore runbook

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
