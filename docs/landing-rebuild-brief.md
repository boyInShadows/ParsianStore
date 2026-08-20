# ParsianStore — Landing Page Rebuild Brief (for Fable 5)

**Written:** 2026-08-20 · **Repo:** `D:\coding\Projects\ParsianStore\parsian-store`
· **Branch:** `development` · **Audience:** a planning model that has *not*
seen this codebase.

## 0. What you are being asked to do

The owner has dropped a set of 3D-rendered assets into
`apps/web/public/Landing/` and wants the **landing page rebuilt from scratch**
around them.

**Your deliverable is a plan, not code.** Read this document, then produce a
step-by-step implementation plan that the implementing agent (Claude, working
in this repo) will execute. The plan must:

- respect every hard rule in §6 — they are enforced by ESLint, CI, and the
  project's own review process, so a plan that violates one is a plan that
  cannot ship;
- state explicitly which decisions in §11 you are recommending and why;
- be sliced into steps small enough that each one ends with a green
  `pnpm lint && pnpm test && pnpm build` and a commit;
- name, for each step, the files it touches and its Definition of Done.

Where this brief leaves something genuinely open, say so and recommend one
option — do not silently pick, and do not invent requirements.

---

## 1. Product context

Persian (Farsi) RTL e-commerce store selling **car parts** for **Iranian
domestic vehicles only** — Saipa (سایپا) and Iran Khodro (ایران‌خودرو). No
imported makes, no other brands.

Two user archetypes drive every design decision:

| Archetype | Needs | Entry path |
|---|---|---|
| **The Driver** | doesn't know part names, knows symptoms and their car | vehicle selector (make → model → generation), symptom finder |
| **The Mechanic** | knows the OEM/SKU code, wants speed | code-first search |

The three fears the page must kill: *is it fake?*, *does it fit my car?*,
*will it arrive?* Every trust claim on the page must show **evidence or a
concrete process** — never a slogan, never a fabricated statistic.

Money is an integer in **Rial**, displayed in Toman via `formatToman()`. Dates
are stored UTC ISO and displayed **Jalali** via `formatJalali()`.

---

## 2. Stack (exact, installed versions)

**Monorepo:** pnpm 9.15.9 workspaces + Turborepo · Node ≥ 22 · TypeScript 5.7
strict everywhere.

```
apps/web           Next.js 15.5.21 (App Router) · React 19 · TypeScript strict
apps/api           Express 5 + Mongoose (MongoDB) — separate app, REST
packages/schemas   Zod schemas + Persian text helpers, shared by web and api
packages/config    shared eslint/prettier/tailwind/ts config
legacy/            pre-monorepo prototype — REFERENCE ONLY, never import from it
```

`apps/web` dependencies that matter for this work:

```
next 15.5.21 · react 19 · react-dom 19
tailwindcss 3.4.19 + tailwindcss-logical + @tailwindcss/typography
motion 12.42.2            (Framer Motion; the npm package is named "motion")
next-intl 4.13.4          (i18n + routing)
next-themes 0.4.6         (light/dark via a data-theme attribute)
zustand 5.0.14            (client state: cart, garage, compare, wishlist)
@tanstack/react-query 5   (client-side server state)
@mui/material 7 + X (DataGrid/Charts/DatePickers) + emotion + stylis-plugin-rtl
```

**Two UI worlds, physically separated:**

- **Storefront** (`app/[locale]/(shop)/**`) → Tailwind only. This is where the
  landing page lives.
- **Admin** (`app/[locale]/(admin)/**`) → MUI only. Excluded from Tailwind's
  content glob. **MUI must never appear on the landing page.**

Cascade layer order is `@layer tailwind, mui` (`styles/globals.css`) — do not
change it.

**There is no 3D library installed.** No `three`, no `@react-three/fiber`, no
`@react-three/drei`, no `model-viewer`. See §6.3 and §11.1.

---

## 3. Where the landing page lives today

```
apps/web/app/[locale]/(shop)/page.tsx     route + generateMetadata + JSON-LD
apps/web/components/landing/
  Hero.tsx                server comp: bg image + VehicleSelector + ExplodedView
  ExplodedView.tsx        'use client' — the signature SVG interaction
  explodedViewLayout.ts   node coordinates for the exploded SVG
  SectionShell.tsx        shared scaffold (mono code + h2 + subtitle + Reveal)
  TrustStrip · ShopBySystem · BestSellers · BrandWall · AuthenticityStory
  Deals · ShopByVehicle · SymptomFinder · Numbers · HowItWorks
  GuidesTeaser · Support · Newsletter
  index.ts                barrel export
```

Current section order in `page.tsx`: Hero → TrustStrip → BestSellers →
ShopBySystem → AuthenticityStory → ShopByVehicle → SymptomFinder → BrandWall →
Deals → Numbers → HowItWorks → GuidesTeaser → Support → Newsletter.

The full section-by-section spec is `masterPlan.md` §5 (15 sections including
the mega footer). The **Exploded View is the signature interaction**, and the
design guide says supporting imagery must *stage* it, not replace it — if your
plan removes or demotes it, argue the case explicitly.

**Reusable pieces outside `components/landing/`:**

```
components/primitives/  Button ButtonLink Card Badge Chip Input Select Modal
                        Drawer Sheet Tabs Toast Tooltip Skeleton PriceTag
                        Breadcrumb Pagination EmptyState PageHeader ...
components/motion/      Reveal (scroll fade + 16px) · Stagger · CountUp · Marquee
components/garage/      VehicleSelector + VehicleSelectorLazy (make→model→gen)
components/plp/         ProductCard, ProductGrid
components/layout/      Header, Footer, MobileNav
components/seo/         JsonLd
```

**Data fetchers already available (server-side, typed):**

```
lib/fetchers/catalog.ts       fetchCatalogProducts fetchSearchResults
                              fetchProductDetailBySlug fetchCategoryBySlug ...
lib/fetchers/vehicles.ts      fetchMakes fetchModels fetchGenerations
                              fetchVehicleTreeSafe fetchVehicleRoute
lib/fetchers/brands.ts        fetchBrands
lib/fetchers/exploded-view.ts getSystemPartCounts  (real per-system part counts)
lib/fetchers/fitment.ts · products.ts · feedback.ts · geo.ts ...
lib/contact-info.ts           support contact data (currently placeholder-valued)
lib/seo.ts · lib/json-ld.ts · lib/motion-tokens.ts · lib/fonts.ts
```

API response envelope is always `{ ok, data, meta?, error? }`; every list
endpoint is paginated (`?page&limit&sort`, `limit` capped at 100).

---

## 4. Design system (the part you must internalize)

### 4.1 Direction

> **A Persian workshop manual.** Not a marketplace, not a SaaS dashboard, not a
> sports-car ad.

The vernacular is the **parts catalog**: hairline rules, mono-set reference
codes (`SYS-04`), exploded diagrams, ruled tables, inspection records, technical
plates, graphite workshop atmosphere against catalog-paper surfaces, asymmetric
editorial composition, deliberate negative space.

The maintained checklist is `apps/web/design-quality.md` — **read it before
planning any composition.** Key lines:

- Build a page as a **narrative**, not a sequence of interchangeable cards.
- Rounded bordered cards are reserved for genuinely independent controls or
  movable objects. Do not wrap every paragraph, row, or section in one.
- Alternate density and scale — a quiet evidence rail after a dramatic hero, a
  dense parts grid after an editorial explanation.
- "Would the layout still look intentional with all border radii removed?"
- "Does the page have at least three visibly different compositional beats?"
- Avoid: sports-car glamour, neon cyberpunk, generic warehouse stock imagery,
  icon-in-circle feature rows, decorative automotive clichés.
- **Generated artwork may establish atmosphere, but must never impersonate a
  product photo, certificate, supplier record, customer, or business result.**
  This one directly constrains how the new renders may be used — see §8.

Historical context, so you don't re-litigate settled ground: the owner rejected
turquoise + safety-orange (v1.0), then Steel Blue + Racing Red (v1.3, read as
"sport car"), landing on **Steel Blue + Marigold** (v1.5). On 2026-07-30 the
owner rated the then-current pages **1/10** for UI/UX — "function-first and
generic". The 2026-08-11 P9.S1 pass revived the direction above. Do not drift
back toward uniform white rounded cards.

### 4.2 Color — two-accent discipline

Single source of truth: `apps/web/styles/tokens.css` (the **only** file in the
repo allowed to contain a hex literal). Tailwind config and the MUI theme both
read the same CSS custom properties.

- **Steel Blue = technical ink.** Navigation, links, active nav, focus rings,
  brand marks, fitment-verified state, selected filters. **Never** a "buy"
  affordance.
- **Marigold = inspection mark.** Add-to-cart, checkout, prices, discount
  badges, low-stock urgency. **Never** navigation, links, or decoration.
- **Graphite** = workshop atmosphere (dark) and catalog paper (light).
- Warning chips are always **outlined + icon-led, never solid fill** — Marigold
  (~42° hue) and warning (~40° hue) sit close, so *shape*, not hue, is what
  keeps warning from reading as a second buy affordance.

Semantic tokens available as Tailwind classes (all `var()`-backed):

```
bg · surface · surface-raised · surface-sunken · text · text-muted
border · rule (divider inside a surface, always lighter than border)
brand · brand-solid · brand-subtle · brand-fg
cta · cta-fg · price (the Marigold that actually passes contrast as text)
focus · success · warning · danger · info (+ *-fg contrast-safe pairs)
ramps: steel-50..950 · marigold-50..950 · graphite-0..1000
```

**Never use an opacity modifier on these.** `bg-brand/10` generates *no CSS at
all* — Tailwind 3.4 cannot decompose an opaque `var()`. Add a real token instead.

Dark mode is the `[data-theme="dark"]` selector, driven by next-themes.
**Dark mode uses no shadows** — elevation comes from `surface-raised` + `border`.

### 4.3 Type, spacing, radius, motion

```
fonts   display = Estedad (700/900, self-hosted, preloaded)
        body    = Vazirmatn Variable (100–900, preloaded)
        mono    = JetBrains Mono Medium — machine-readable evidence only,
                  never decorative filler
scale   display-1 clamp(2.5rem,6vw,4.5rem) · display-2 · h1 · h2 · h3
        body-lg · body · body-sm · caption · data
spacing 4px base: space-1..32 → Tailwind 1,2,3,4,6,8,12,16,20,24,32 only
radius  sm 6 · md 10 · lg 14 · xl 20 · full
motion  fast 150ms · base 250ms · slow 400ms
        ease-out cubic-bezier(0.16,1,0.3,1) · ease-in-out (0.65,0,0.35,1)
        JS mirror: lib/motion-tokens.ts (DURATION, EASE_OUT, REVEAL_TRAVEL_PX=16)
container  max 1440px, gutter 16px → 32px at ≥1024px
```

### 4.4 Motion budget (masterPlan §5) — binding

- **One** orchestrated page-load sequence (today: the Exploded View).
  Everything else is scroll-reveal at **≤24px travel, ≤400ms**.
- Hover micro-interactions: **transform + opacity only.** Never animate layout
  properties.
- `useReducedMotion()` is checked in **every** animated component. Reduced
  motion = **instant final state**, never "a bit less motion". There is also a
  CSS-level backstop for the marquee, because `matchMedia` is unavailable during
  SSR and the first paint would otherwise animate.
- Total Framer Motion JS on the landing route: **under 45KB gzipped** (currently
  measured at 39.6KB — roughly 5KB of headroom, not more).

---

## 5. i18n / RTL

- `next-intl` with `[locale]` routing; `dir="rtl"` for `fa`, `ltr` for `en`.
- **All user-facing strings live in `apps/web/messages/fa.json`.** Namespaces:
  `Landing`, `VehiclePage`, `Compare`, `Catalog`, `Header`, `Auth`, `Cart`,
  `Checkout`, `Account`, `Orders`, `Addresses`, `Wishlist`, `Garage`. `Landing`
  holds `meta`, `partsCount`, `explodedView`, and `sections.*` keyed by the 14
  section names.
- **No hardcoded strings and no placeholder/lorem, ever.** Real Persian copy only.
- **English locale maintenance is suspended** (owner decision, 2026-07-30): ship
  `fa.json` only; `en.json` parity is *not* part of any DoD — but do not rip out
  the `en` routing.
- Persian text helpers live in `packages/schemas/src/fa.ts` — grep before writing
  a new one: `normalizeFa`, `toPersianDigits`, `toEnglishDigits`, `formatToman`,
  `formatJalali`, `normalizePhone`.

---

## 6. Hard rules — a plan that breaks one of these is dead on arrival

### 6.1 Enforced by custom ESLint rules (`eslint-rules/`)

1. **`no-raw-hex`** — zero hex literals outside `styles/tokens.css`. No
   hardcoded colors, spacing, radii, or font sizes anywhere else. Need a new
   value? Add the token first.
2. **`no-physical-direction`** — never `left`, `right`, `ml-`, `mr-`, `pl-`,
   `pr-`, `text-left`, `text-right`, `border-l`, `border-r`. Logical only:
   `ms- me- ps- pe- start- end- text-start text-end border-s border-e`. Do not
   weaken or suppress the rule.

### 6.2 Enforced by review / project process

3. **Server Components by default.** Every `'use client'` needs a one-line
   comment justifying it — see `ExplodedView.tsx` for the house style.
4. **Every image goes through `next/image`** with explicit dimensions. AVIF +
   WebP. Above-the-fold `priority`, everything else lazy.
5. **No barrel imports from `@mui/*` or `lucide-react`.** Framer Motion, Swiper
   and MUI X are dynamically imported.
6. **Read a file before editing it. Grep for an existing util before adding one.**
7. **`legacy/` is reference-only** — never import from it; port ideas by
   rewriting them against the current design system.
8. **TypeScript strict, no `any`.** Prefer `z.infer<>` over a hand-written
   parallel interface.

### 6.3 Dependencies

**Installing anything outside `masterPlan.md` §4's manifest requires asking the
owner first.** That manifest does **not** include `three`,
`@react-three/fiber`, `@react-three/drei`, `@google/model-viewer`, GSAP, Lenis,
or any other 3D / scroll library. `swiper` and `nprogress` *are* pre-approved
but not yet installed. If your plan needs a new package, flag it as an explicit
**owner decision point** with its bundle cost stated — never assume it.

### 6.4 Workflow

9. **Phase by phase, step by step.** No step N+1 before step N's DoD passes. If
   a requirement is ambiguous, **stop and ask** rather than guessing.
10. **Commit and push to `development` after every completed step**, format
    `<type>(<scope>): [P<phase>.S<step>] <subject>`. This work is **Phase 9**
    (`P9.S2` onward — `P9.S1` was the visual revival).
11. Claude and Codex share this checkout. Inspect `git status` before editing;
    never clobber another agent's uncommitted work.

---

## 7. Definition of Done (every step)

```
RTL correct · light + dark verified · responsive 360px → 1920px
keyboard reachable + visible focus + axe 0 violations
prefers-reduced-motion honored
all strings in fa.json
pnpm lint && pnpm test && pnpm build all pass
performance budget respected for touched routes
committed with the correct tag and pushed to development
```

**Accessibility floor:** visible focus ring (`--focus`, 2px offset), semantic
landmarks, labelled controls, live-region errors, ≥4.5:1 body contrast,
≥44×44px touch targets, RTL screen-reader tested.

**Performance budget for the landing route (masterPlan §10):**

| Metric | Budget | Last measured |
|---|---|---|
| LCP (Moto G4, Slow 4G) | ≤ 2.0s | 1.7s ✓ |
| INP | ≤ 200ms | 130ms (TBT proxy) ✓ |
| CLS | ≤ 0.05 | 0.036 ✓ |
| **Route JS (gz)** | **≤ 180KB** | **188KB ⚠ — already 8KB over** |
| Lighthouse perf | ≥ 90 | 98 ✓ |

The 8KB overage is a **known, owner-accepted** side effect of the admin app
reshuffling webpack's shared-chunk graph — it is not licence to add more. Full
methodology and numbers live in `docs/performance-landing.md`. Any step adding
client-side JS to this route must re-run `pnpm --filter web build` and check the
number **before** merging, not after.

Tests: `vitest` (unit, 610+ passing) plus `@playwright/test` with
`@axe-core/playwright` (`e2e/`). There is currently **no** landing-page visual
regression test — adding one is backlog item 7 in §9.

---

## 8. The new assets — what is actually in `public/Landing/`

⚠ **These are not 3D model files.** They are 2D renders and video. Nothing in
the folder is `.glb`, `.gltf`, `.usdz`, or `.fbx`. Plan for compositing images
and video, not for a WebGL scene — unless you deliberately recommend otherwise
in §11.1 and account for the cost.

The folder is **`public/Landing/` with a capital L**; every existing convention
is lowercase (`public/brand/`, `public/fonts/`, `public/products/`). URLs are
case-sensitive in production even though Windows dev is not, so the plan should
rename it to `public/landing/` as an early step.

### Part renders — 10 files, 2048×2048 PNG, **RGB with no alpha channel**

```
airFilter.png · alternator.png · bumper .png · car.png · door.png
fender.png · hood.png · lightning.png · pistoncylinder.png · windshield.png
```

Each is 3.5–5.5 MB. **No alpha means every render carries a baked opaque
background** — they cannot be dropped onto an arbitrary surface as cutouts
without either (a) re-exporting them with transparency, or (b) designing
sections whose background matches the render's own. Your plan must say which.

`bumper .png` has **a space in its filename** — rename it.

`car.png` and `lightning.png` are probably the full-vehicle and
lighting/atmosphere plates rather than catalog parts; the implementing agent
should visually confirm each render's content before assigning it a slot.

### Atmosphere plates — 4 files, 1376×768 PNG, RGB, no alpha

```
hf_20260819_174532_<uuid>.png  ×4   (0.7–1.6 MB each)
```

Machine-generated names — rename them to their semantic role once identified.

### Section video — 4 files, 2560×1440 MP4, 5.2s each

```
section1.mp4 · section2.mp4 · section3.mp4 · section4.mp4   (2.1–3.5 MB each)
```

**Total folder size: 57 MB, entirely unoptimized, currently untracked in git.**
Shipping this as-is would blow LCP, the transfer budget, and probably the repo.
An asset pipeline is mandatory, not optional — see §11.2.

**Design-guide constraint that applies directly here:** generated artwork may
establish **atmosphere**, but must never impersonate a product photo,
certificate, supplier record, customer, or business result. A render of an
alternator may headline a *system* or an editorial beat; it may **not** sit in a
product card as though it were the catalog photo of a real SKU, and it may not
appear as authenticity or inspection evidence.

---

## 9. Known problems the rebuild must fix

From the live landing audit of 2026-08-14 (`tasks.md`; Persian RTL at 1440px
and 390px, light/dark, reduced motion, axe). These are open, and the rebuild is
the natural place to resolve them:

1. **Broken vehicle links.** `ShopByVehicle` links to `/vehicle/[make]/[model]`
   but the shipped route is `/vehicle/[make]/[model]/[gen]`; sampled links 404.
   Model entries must select or expose a real generation, plus a route-level
   regression check for every rendered vehicle link.
2. **Mobile rail overflow.** At 390px a nominal `w-64` card computed to 992px
   and its image to 966px, making `BestSellers` 1,848px tall. Card sizing must
   be definite inside the no-wrap flex rail, with horizontal snap preserved.
3. **OEM/SKU search is not above the fold.** A mechanic with a known code only
   gets the collapsed global-header search. The hero needs an explicit
   code-first action that doesn't compete with the vehicle selector.
4. **The mobile page is 11,556px tall before the footer** (hero 1,440px,
   `ShopBySystem` alone 2,060px), and the exploded-view list plus the ten-tile
   system grid repeat the same destinations. Consolidate or progressively
   disclose, so products, vehicle entry and authenticity evidence arrive
   materially sooner.
5. **Dead-end sections.** Guides is heading-only, the newsletter form is fully
   disabled, and support exposes `021-00000000` as a clickable placeholder.
   Hide them or back them with real destinations and contact data.
6. **The lower half has no ending.** After brands it decays into small
   statistics, generic process cards, three unfinished blocks, then the footer.
   It needs one strong closing beat with a real next action.
7. **No permanent regression check.** Needs 360/390/1440 screenshots plus
   assertions for valid discovery links, featured-card width, reduced motion and
   both color schemes, preserving the current axe-zero result.

---

## 10. What is real data and what is not

Be precise about this — the project's standing rule is **no fabricated
evidence**.

- **Real and wired:** vehicle tree (makes/models/generations), catalog products,
  search, facets, brands, per-system part counts, fitment, product feedback.
- **Real but placeholder-valued:** support contact info (`021-00000000`),
  working hours.
- **Not built:** guides/blog content and the newsletter subscription backend.
  Both are Phase 9 content backlog — a dependency, not something to fake.
- **Deals** renders only when live deals exist — never a fake countdown.
- **Numbers** must count real things (parts in stock, vehicles covered, orders
  shipped, years in business) — no invented figures.

---

## 11. Open decisions — tell us what you recommend

Give a recommendation with reasoning for each. Where an answer costs bundle
size, quote the number against the 180KB budget.

1. **True WebGL, or composited 2D renders?** No 3D library is installed and
   adding one needs owner approval. `three` + `@react-three/fiber` + `drei` is
   roughly 150KB+ gzipped on a route already 8KB over budget, and the supplied
   assets are PNG/MP4, not meshes. Options: (a) scroll-composited 2D renders
   using transform/opacity only — cheapest, fits the motion budget; (b) an image
   sequence or sprite scrub for a "rotating part" feel; (c) real WebGL, which
   needs new source meshes *and* an owner dependency decision *and* a budget
   renegotiation. Recommend one.
2. **Asset pipeline.** 57MB must become a few hundred KB of AVIF/WebP at
   responsive sizes, plus poster-framed, compressed, `preload="none"` video.
   Where does that run — a build step, a committed pre-optimized set, or
   `next/image` at request time? `sharp` is manifest-approved but not installed.
   Also decide what gets committed to git at all.
3. **Video on mobile.** Four 2560×1440 clips is not a mobile plan. Autoplay
   muted with `playsInline` and a poster? A static plate below a breakpoint?
   Nothing at all under reduced motion? Say which, per breakpoint.
4. **What happens to the Exploded View.** It is the signature interaction, and
   `design-quality.md` says imagery must stage it, not replace it. Keep it as
   the hero? Move it to a later beat with a render-driven hero above it? Argue it.
5. **Section inventory.** masterPlan §5 specifies 15 sections; audit items 4–6
   say the current page is too long and repetitive. Which sections survive,
   which merge, which are cut, and in what order — mapped against which of the
   18 supplied files carries each beat.
6. **Rebuild strategy.** New components alongside the old with a swap at the
   end, or in-place replacement section by section? The commit-per-step rule
   means `development` must stay shippable throughout.

---

## 12. Output we want from you

A plan document containing:

1. **Direction statement** — one paragraph on what this landing page *is*,
   consistent with §4.1, plus the compositional beats in order.
2. **Asset → section map** — which file carries which beat, at which
   breakpoints, in which theme, and what happens when it is absent or the user
   prefers reduced motion.
3. **Recommendations for all six decisions in §11**, each with reasoning and,
   where relevant, a bundle-size number.
4. **Step list, `P9.S2` onward.** For each step: goal, files touched, the DoD
   from §7, and the risk it carries. Steps must be independently shippable.
5. **Budget plan** — how the route stays at or near 180KB gz and LCP ≤2.0s
   while gaining imagery it didn't have before. This is the constraint most
   likely to kill an otherwise good plan; address it head-on.
6. **Explicit list of owner decisions** required before implementation starts
   (dependencies, asset re-exports with alpha, real contact data, whether
   sections may be cut).

**Reference files to ask for verbatim if you want them:** `masterPlan.md` (§4
manifest, §5 landing spec, §6 design system, §10 budgets), `CLAUDE.md`,
`apps/web/design-quality.md`, `apps/web/styles/tokens.css`, `tasks.md`,
`docs/performance-landing.md`.
