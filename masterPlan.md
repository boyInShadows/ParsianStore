# ParsianStore — Master Plan

**Repo:** `https://github.com/boyInShadows/ParsianStore`
**Integration branch:** `development`
**Product:** Persian-first (RTL) e-commerce for car spare parts — Iranian & imported vehicles
**Owner:** Ash Tech Group
**Status:** Phase 0 not started
**Document version:** 1.0 — this is the *first move*. Phases 0–4 are locked. Phases 5+ are directionally locked but will be re-specced before execution.

---

## 0. How to read this document (agent instructions)

You are Claude Code operating on this repository. This file is your single source of truth.

**Hard rules — violating any of these means the step is rejected:**

1. **Work phase by phase, step by step.** Never start step N+1 before step N passes its Definition of Done (DoD).
2. **Commit and push to `development` after every step.** No exceptions. See §12.
3. **Never install a package that is not in the dependency manifest (§4).** If you think you need one, STOP and ask.
4. **Never invent scope.** If a requirement is ambiguous, STOP and ask. Do not guess and build.
5. **No placeholder/lorem content.** Every string is real Persian copy or comes from the locale file.
6. **No hardcoded colors, spacing, radii, or font sizes** anywhere outside `tokens.css`. See §6.
7. **No hardcoded user-facing strings** anywhere outside the locale files. See §7.
8. **No physical CSS direction properties.** Never `left`, `right`, `ml-`, `mr-`, `pl-`, `pr-`, `text-left`, `text-right`. Logical only. See §7.
9. **Read before you write.** Before editing any file, read it. Before adding a util, grep for an existing one.
10. **This is the foundation, not the MVP.** Code is written to be extended in Phase 8 by a different agent who has not seen this conversation. Optimize for readability and boundaries over cleverness.

**When you finish a step, output exactly:**

```
STEP COMPLETE: P<phase>.S<step> — <name>
Files touched: <list>
DoD checks: <each check + pass/fail>
Commit: <sha> pushed to development
Next: P<phase>.S<step+1> — <name>
```

**When you are blocked, output exactly:**

```
BLOCKED: P<phase>.S<step>
Reason: <one paragraph>
Options: <2–3 concrete options with tradeoffs>
Recommendation: <one>
```

Then stop and wait.

---

## 1. What we're building, and why it wins

### 1.1 The two customers

| | **The Driver** | **The Mechanic** |
|---|---|---|
| Who | Pride / 405 / Samand / Dena / Tiba / Quik owner | Repair shop, parts reseller |
| Mental state | Car is broken. Scared of buying a fake. Doesn't know part names. | Knows the part number by heart. Wants speed and stock truth. |
| Entry path | "I have a Pride 131, 1398, what fits?" | Types `MB-0442-K` into search |
| Wins on | Guided fitment, authenticity proof, phone support | Raw search speed, bulk cart, invoice, stock accuracy |

**Both must be first-class.** Every competitor serves one and treats the other as an afterthought. That is our opening.

### 1.2 Reference-site audit — what the market does

> **Honesty note:** `mryadaki.com`, `automoby.ir`, `yadakijat.com`, and `dryadaki.com` block automated fetching (`robots.txt`). `fabricpart.com`, `shojapart.com`, and `yadacar.com` returned near-empty shells (client-rendered). What follows is a **pattern-level** audit assembled from search-index content, partial fetches, and the wider Iranian parts market (yadakyar, mashinno, arianyadak, partsmarket, yadakmarket).
> **Task P0.S1 requires a manual DOM-level audit of all seven sites before Phase 1 begins.** Do not skip it.

**Universal patterns — we must match these or we look amateur:**

| Pattern | Persian | Why it exists |
|---|---|---|
| Vehicle-first navigation | «ابتدا خودرو خود را انتخاب کنید» | Nobody browses parts. They browse *their car*. |
| Authenticity guarantee badge | «ضمانت اصالت کالا» | Counterfeit parts are the #1 buyer fear in this market. |
| Brand-led browsing | ۱۵۰+ برند | Buyers trust brands (Bosch, Valeo, NGK, ایساکو, سایپا یدک). |
| System categories | موتوری / جلوبندی / برقی / بدنه / ترمز | This is the mechanic's vocabulary. Use it, don't invent one. |
| Free expert consultation | «مشاوره رایگان» | Phone/WhatsApp support closes the "am I buying the right thing" gap. |
| Cash on delivery + installments | «پرداخت در محل» / «اقساط» | Card-not-present distrust is real. |
| SEO content moat | Counterfeit-identification guides, symptom guides | Organic traffic is how these sites actually acquire. |

**Universal weaknesses — this is our attack surface:**

| Weakness | What we do instead |
|---|---|
| WooCommerce/WordPress stacks; heavy, slow, 4–8s LCP | Next.js App Router, RSC-first, hard perf budgets (§10) |
| Vehicle finder is a dumb 3-dropdown cascade, often broken | Vehicle finder is a persistent, saved, URL-addressable **Garage** (§3.4) |
| "Authenticity guarantee" is a static image, not evidence | Per-item **Authenticity Record**: batch, hologram code, supplier chain, verify endpoint (§3.5) |
| Search fails on ی/ي, ک/ك, نیم‌فاصله, ۱۲۳ vs 123 | Mandatory `normalizeFa()` on index **and** query (§8.3) |
| No fitment confidence — "will this fit MY car?" is unanswered on the PDP | PDP shows a **fitment verdict banner** against the active garage vehicle |
| Mobile is an afterthought despite ~80% mobile traffic | Mobile-first build order. Desktop is the adaptation. |
| No stock truth — "call us" | Real inventory state, with honest backorder language |
| Admin is WP-admin; no fitment tooling, no bulk ops | Purpose-built MUI admin with a Fitment Manager and CSV bulk import (§3.7) |
| Dark mode: absent everywhere | First-class, token-driven, no flash (§6) |

### 1.3 The one thing we are remembered by

**The Exploded View.**

Parts catalogs have one native visual language: the exploded technical diagram — components floating apart, hairline leader lines, numbered callouts. Nobody in this market uses it on the web. It becomes our hero, our category navigation, and our brand mark all at once.

- On load, an SVG assembly separates into its components with staggered motion.
- Each component carries a hairline leader line and a mono-set system code (`SYS-04 · ترمز`).
- Hover/tap highlights the component and reveals the Persian name + part count.
- Click routes into that system, pre-filtered to the active garage vehicle.
- It collapses to a stacked, tappable list on mobile — same codes, same language, no motion cost.

Everything else on the page stays quiet so this lands. See §5.

---

## 2. Tech stack (locked)

### 2.1 Locked decisions

| Layer | Choice | Version | Non-negotiable |
|---|---|---|---|
| Runtime | Node.js | 22 LTS | Yes |
| Package manager | pnpm | 9.x | Yes |
| Monorepo | pnpm workspaces + Turborepo | latest | Yes |
| Language | **Plain JavaScript (ESM)** + JSDoc + Zod | — | See §2.2 |
| Web framework | Next.js App Router | **15.x — pin the minor** | Yes |
| Storefront styling | Tailwind CSS | **v3.4.x — v4 is forbidden** | Yes |
| Admin UI | MUI | v7.x (Material UI) | Yes |
| Animation | Framer Motion (`motion`) | 11.x+ | Yes |
| Forms | react-hook-form + Zod | latest | Yes |
| Client state | Zustand | 5.x | Yes |
| Server state | TanStack Query | 5.x | Admin + dashboards only |
| i18n | next-intl | latest | Yes |
| API | Node + Express | Express **5.x** | Yes |
| Database | MongoDB + Mongoose | Mongo 7+, Mongoose 8.x | Yes |
| Auth | Phone OTP + JWT (httpOnly cookies) | — | See §3.3 |
| Password hash | argon2 | — | Not bcrypt |
| Validation | Zod (shared package) | latest | Yes |
| Images | sharp | latest | Yes |
| Logging | pino + pino-http | latest | Yes |
| Testing | Vitest + Testing Library + Playwright | latest | Yes |
| Lint/format | ESLint 9 (flat) + Prettier + `eslint-plugin-tailwindcss` | latest | Yes |
| Dates | `dayjs` + `jalaliday` | latest | Jalali display, UTC storage |
| Charts (admin) | MUI X Charts | latest | No Chart.js, no Recharts |

### 2.2 Language decision — read this

**Assumption made: plain JavaScript, no TypeScript**, matching your existing stack conventions. Runtime safety comes from Zod schemas shared between client and server, plus JSDoc types for editor intellisense.

> **This is the single most expensive decision to reverse.** If you want TypeScript, say so **before P0.S2**. After Phase 2 the cost is roughly a full week. Flag it now or it's locked.

### 2.3 Explicitly rejected

| Rejected | Why |
|---|---|
| Tailwind v4 | Breaking config model; unstable MUI cascade interop; RTL logical-property behavior differs. Revisit post-launch. |
| Vercel hosting | Sanction/access friction for Iranian users. See §11. |
| Chart.js / Recharts | MUI X Charts ships with the admin; one chart library only. |
| Redux / Redux Toolkit | Zustand + TanStack Query covers it at a fraction of the ceremony. |
| bcrypt | argon2id is the current recommendation. |
| Styled-components | Emotion via MUI is already present; two CSS-in-JS runtimes is a bundle tax. |
| GraphQL | REST + Zod is faster to ship and easier for the next agent to read. |
| Sessions in Mongo | JWT + refresh rotation, Redis for revocation in Phase 9. |

---

## 3. Product specification

### 3.1 Surface map

```
STOREFRONT (Tailwind + Framer Motion)      apps/web/app/(shop)
  /                       landing (§5)
  /c/[...slug]            category / PLP
  /p/[slug]               product detail (PDP)
  /brand/[slug]           brand page
  /vehicle/[make]/[model][/[gen]]   vehicle landing (SEO gold)
  /search                 search results
  /compare                compare up to 4 parts
  /cart                   cart
  /checkout               3-step checkout
  /checkout/callback      gateway return
  /order/[code]           guest order tracking
  /blog, /blog/[slug]     guides & SEO content
  /about /contact /faq /returns /warranty /terms /privacy
  /auth/login             phone OTP

USER DASHBOARD (Tailwind)                  apps/web/app/(shop)/account
  /account                overview
  /account/orders         + /account/orders/[code]
  /account/garage         MY GARAGE — saved vehicles
  /account/addresses      Iran province→city cascade
  /account/wishlist
  /account/wallet         کیف پول
  /account/reviews
  /account/tickets        + /account/tickets/[id]
  /account/profile

ADMIN (MUI only)                           apps/web/app/(admin)/admin
  /admin                  KPI overview
  /admin/products         list · new · [id] · bulk-import
  /admin/categories /admin/brands /admin/attributes
  /admin/vehicles         makes · models · generations · engines
  /admin/fitment          FITMENT MANAGER (§3.7)
  /admin/inventory        stock, low-stock alerts, movements
  /admin/orders           + /admin/orders/[id]
  /admin/customers        + /admin/customers/[id]
  /admin/discounts        coupons & campaigns
  /admin/payments         transactions & reconciliation
  /admin/shipping         methods & zones
  /admin/content          banners · sliders · menus · pages · blog
  /admin/reviews          moderation queue
  /admin/tickets
  /admin/reports          sales · products · customers · exports
  /admin/users            staff & RBAC
  /admin/settings
  /admin/audit-log
```

### 3.2 Data models (Mongoose)

Collections. Field lists are the required minimum; add `createdAt`/`updatedAt` to all.

```
User            phone(unique, E.164) · name · email? · role · addresses[] ·
                garage[VehicleRef] · walletBalance(Rial) · isActive · lastLoginAt
OtpToken        phone · codeHash · expiresAt(TTL idx) · attempts · purpose
RefreshToken    userId · tokenHash · expiresAt(TTL idx) · userAgent · revokedAt

VehicleMake     name{fa,en} · slug · logo · country · isDomestic
VehicleModel    makeId · name{fa,en} · slug · bodyType
VehicleGen      modelId · name{fa,en} · yearFrom · yearTo · facelift
VehicleEngine   genId · code · displacement · fuel · power
                → the Garage stores { makeId, modelId, genId, engineId?, year, nickname }

Category        name{fa,en} · slug · parentId · systemCode('SYS-04') · icon ·
                path[] · order · seo{}
Brand           name{fa,en} · slug · logo · country · isOEM · description · seo{}
Attribute       name{fa} · key · type(select|number|bool|text) · unit · options[]

Product         name{fa,en} · slug · sku · oemNumbers[] · crossRefNumbers[] ·
                brandId · categoryId · attributes[{key,value}] · media[] ·
                priceRial(Int) · compareAtRial(Int) · taxRate ·
                stock · lowStockAt · backorderable · weightGram · dimensions ·
                warranty{months,text} · authenticity{...} (§3.5) ·
                status(draft|active|archived) · rating{avg,count} ·
                searchText(normalized) · seo{}
Fitment         productId · makeId · modelId · genId? · engineId? ·
                yearFrom · yearTo · note{fa} · confidence(exact|likely|check)
                → compound index (makeId, modelId, genId, yearFrom, yearTo)

Cart            userId? · anonId? · items[{productId,qty,priceRialSnapshot}] ·
                couponCode? · expiresAt(TTL idx)
Order           code(human, e.g. PS-1404-04821) · userId? · guestPhone? ·
                items[{productId, nameSnapshot, skuSnapshot, qty, priceRial}] ·
                subtotalRial · discountRial · shippingRial · taxRial · totalRial ·
                address{} · shippingMethod · trackingCode? ·
                status(pending|paid|processing|shipped|delivered|cancelled|refunded) ·
                statusHistory[] · paymentId? · notes
Payment         orderId · provider · amountRial · authority · refId ·
                status(initiated|success|failed|refunded) · raw{} · verifiedAt
Coupon          code · type(percent|fixed) · value · minSubtotalRial · maxDiscountRial ·
                usageLimit · usedCount · perUserLimit · startsAt · endsAt · scope{}
Review          productId · userId · rating · title · body · images[] ·
                isVerifiedPurchase · status(pending|approved|rejected)
Ticket          userId · orderId? · subject · status · priority · messages[]
Address         (embedded) province · city · line · postalCode(10) · plate · unit ·
                receiverName · receiverPhone
InventoryMove   productId · delta · reason · refId · byUserId
AuditLog        actorId · action · entity · entityId · before{} · after{} · ip
Content         type(banner|slider|page|post|menu) · key · payload{} · locale · publishedAt
Setting         key(unique) · value{} · group
```

**Money rule:** every monetary field is an **integer in Rial**, suffixed `Rial`. Display converts to Toman (÷10) through **one** formatter: `formatToman(rial)`. Never store floats. Never do currency math in the UI.

**Date rule:** store UTC ISO. Display Jalali through **one** formatter: `formatJalali(date, pattern)`. Never store Jalali strings.

### 3.3 Auth — phone first

Iranian e-commerce runs on mobile numbers, not email.

1. User enters mobile → validate `/^(\+98|0098|0)?9\d{9}$/` → normalize to E.164 `+989XXXXXXXXX`.
2. Server issues 6-digit OTP, stores **hash only**, TTL 120s, max 5 attempts, rate-limited per phone **and** per IP.
3. Verify → issue access JWT (15 min, httpOnly, `SameSite=Lax`, `Secure`) + refresh token (30 days, rotating, hashed at rest).
4. First successful login auto-creates the User.
5. Email/password is **optional** and staff-only. Argon2id.
6. Roles: `customer` · `support` · `operator` · `admin` · `superadmin`. RBAC middleware from day one; never check roles inline in a handler.

### 3.4 My Garage — the fitment spine

The killer feature. Everything routes through it.

- A vehicle can be added from: the hero selector, a PDP, or `/account/garage`.
- Guests get a garage too — stored in a cookie, merged into the account on login.
- The **active vehicle** is global state (Zustand, persisted) and is reflected in the URL as `?v=<vehicleKey>` so results are shareable and crawlable.
- With an active vehicle:
  - PLP silently filters to fitting parts, with a visible, one-tap "show all" escape.
  - PDP renders a **fitment verdict banner**:
    - `exact` → green: «این قطعه با پراید ۱۳۱ شما سازگار است»
    - `likely` → amber outline: «احتمالاً سازگار — شماره فنی را بررسی کنید»
    - `check` → neutral: «سازگاری تأیید نشده — با کارشناس تماس بگیرید»
    - no fitment record → neutral, never a false green.
  - Header shows the active vehicle as a compact chip; tap to switch.
- **Never silently hide products.** Filtered-out counts are always visible.

### 3.5 Authenticity Record — beating "ضمانت اصالت کالا"

Competitors show a static badge. We show evidence.

Per product (and optionally per batch):
- Supply route: `OEM` / `اصلی وارداتی` / `تولید داخل` / `درجه ۱ بازار`
- Source brand + country of manufacture
- Hologram / batch code field, when the supplier issues one
- Warranty months and who honors it
- Anti-counterfeit guidance link (this is also our best SEO content — see the NGK spark-plug precedent on yadacar)
- `GET /api/authenticity/verify/:code` → public verification endpoint

Rendered on the PDP as a compact, evidence-shaped panel — mono-set codes, hairline rules. Not a glowing badge.

### 3.6 Checkout

Three steps, one page, no account required.

1. **Address** — receiver name, mobile, province → city cascade (full Iran dataset seeded in P2), postal code (10-digit validated), plate/unit, notes.
2. **Shipping** — پست پیشتاز · تیپاکس · چاپار · پیک درون‌شهری · حضوری. Zone + weight based.
3. **Payment** — online gateway · pay on delivery (پرداخت در محل) · wallet · installment placeholder (Phase 9).

Rules: cart totals recomputed **server-side** at every step. Client totals are display only. Stock is reserved on payment initiation with a TTL, released on failure/timeout. Order codes are human-readable and Jalali-year prefixed: `PS-1404-04821`.

### 3.7 Fitment Manager (admin)

The tool that makes the catalog defensible.

- Grid: rows = products, columns = vehicle generations; cells = fitment confidence.
- Bulk apply: select N products → apply to a vehicle set in one action.
- CSV import: `sku, make, model, generation, engine, yearFrom, yearTo, confidence, note`.
- Coverage report: which vehicles have thin part coverage (drives buying decisions).
- Conflict detector: same OEM number mapped to incompatible vehicle sets.

---

## 4. Dependency manifest

**Install nothing outside this list without asking.**

### `apps/web`
```
next react react-dom
tailwindcss@^3.4 postcss autoprefixer tailwindcss-logical @tailwindcss/typography
@mui/material @mui/icons-material @mui/x-data-grid @mui/x-date-pickers @mui/x-charts
@mui/material-nextjs @emotion/react @emotion/styled @emotion/cache
stylis stylis-plugin-rtl
motion
next-intl
zustand
@tanstack/react-query
react-hook-form @hookform/resolvers zod
dayjs jalaliday
next-themes
swiper            (carousels only; no second carousel lib)
sharp             (next/image self-hosted optimizer)
nprogress         (route transitions)
```

### `apps/api`
```
express@^5 cors helmet compression cookie-parser
mongoose
zod
argon2 jsonwebtoken
pino pino-http pino-pretty(dev)
express-rate-limit
express-mongo-sanitize
multer sharp
dayjs jalaliday
nanoid
dotenv
node-cron         (stock reservation cleanup, sitemap regen)
```

### `packages/*`
```
packages/schemas   → zod only
packages/config    → eslint + prettier + tailwind preset
packages/ui        → shared primitives (Phase 4+)
```

### Dev / root
```
turbo
eslint@^9 @eslint/js eslint-plugin-react eslint-plugin-react-hooks
eslint-plugin-tailwindcss eslint-plugin-import
prettier prettier-plugin-tailwindcss
vitest @testing-library/react @testing-library/jest-dom jsdom
@playwright/test
husky lint-staged @commitlint/cli @commitlint/config-conventional
cross-env
```

---

## 5. Landing page — section-by-section

Mobile-first. Every section must be usable and beautiful at 360px before desktop is written.

| # | Section | Purpose | Notes |
|---|---|---|---|
| 01 | **Hero — The Exploded View** | Thesis + vehicle selection | SVG assembly separates on load. Vehicle selector (make → model → year) sits inside the composition, not below it. Headline: «قطعه‌ای که به خودروی شما می‌خورد، نه چیزی شبیه آن.» |
| 02 | Trust strip | Kill the three fears | ضمانت اصالت · ارسال سریع · پرداخت امن · مشاوره رایگان. Hairline-separated, mono labels, no icons-in-circles clichés. |
| 03 | Shop by system | Primary navigation | Reuses the Exploded View components as a grid, each carrying its `SYS-xx` code. |
| 04 | Best sellers | Commerce | Horizontal snap-scroll on mobile, grid on desktop. Fitment chip if a vehicle is active. |
| 05 | Brand wall | Trust by association | Bosch, Valeo, Mahle, SKF, Denso, NGK, ایساکو, سایپا یدک. Grayscale → color on hover. Marquee **must** pause on `prefers-reduced-motion` and on hover. |
| 06 | Authenticity story | Differentiator | Explains the Authenticity Record with a real example product. Not a slogan block. |
| 07 | Deals / countdown | Urgency | Jalali-aware countdown. Only renders if live deals exist — never a fake timer. |
| 08 | Shop by vehicle | SEO + navigation | Iranian makes first (ایران‌خودرو، سایپا، بهمن، مدیران‌خودرو، ام‌وی‌ام), then imported. Links to `/vehicle/...` landing pages. |
| 09 | Symptom finder | The Driver's entry | «صدای جیر جیر هنگام ترمز» → brake pads. 8–12 common symptoms → filtered results. Cheap to build, disproportionately useful. |
| 10 | Numbers | Proof | Parts in stock · vehicles covered · orders shipped · years in business. Count-up on scroll, once, reduced-motion safe. |
| 11 | How it works | Reduce friction | 4 steps: choose car → find part → confirm fitment → receive. Numbering is legitimate here — it *is* a sequence. |
| 12 | Guides teaser | SEO moat | 3 latest posts. Lead with counterfeit-identification and symptom guides. |
| 13 | Support | Close the gap | Phone, WhatsApp, working hours, «مشاوره رایگان قبل از خرید». |
| 14 | Newsletter / SMS | Retention | Phone-first, not email-first. One field. |
| 15 | Mega footer | Navigation + legal | Category columns, vehicle columns, brands, policies, **e-Namad (اینماد) seal slot**, نشان ملی ثبت, social, address, تلفن. |

**Motion budget for the landing page:**
- One orchestrated page-load sequence (the Exploded View). Everything else is scroll-reveal at ≤ 24px travel, ≤ 400ms.
- Hover micro-interactions: transform + opacity only. Never animate layout properties.
- `useReducedMotion()` is checked in **every** animated component. Reduced motion = instant final state, never "a bit less motion."
- Total Framer Motion JS on the landing route: **under 45KB gzipped.** Measure it.

---

## 6. Design system

### 6.1 Direction

Machined-metal graphite ground, Persian turquoise identity, safety-orange commerce. The vernacular is the parts catalog: hairline rules, mono-set reference codes, exploded diagrams. Restraint everywhere except the Exploded View.

Turquoise (فیروزه) is the deliberate risk: this market is 90% red/orange/blue, and turquoise is authentically Persian — Isfahan tilework, Neyshabur stone — for a brand called Parsian. It also reads as diagnostic-instrument cyan in an automotive context. Justified twice.

### 6.2 Color ramps

**Firouzeh — identity, navigation, system state**
```
50 #E6FAF7   100 #C2F3EC   200 #8AE7DB   300 #4FD8C7   400 #24C4B2
500 #0FB5A8  600 #0A9186   700 #0A736B   800 #0C5B56   900 #0D4A46   950 #042B29
```

**Signal Orange — money and action ONLY**
```
50 #FFF3EB   100 #FFE1CC   200 #FFC199   300 #FF9E63   400 #FF8038
500 #FF6B1A  600 #E0530A   700 #B33F07   800 #8A320A   900 #702B0C   950 #3D1304
```

**Graphite — neutrals (cool cast)**
```
0 #FFFFFF   25 #F7F9FA   50 #EEF1F4   100 #E2E7EC   200 #CBD3DA   300 #A8B4BE
400 #7C8B97  500 #5C6B78  600 #465360  700 #36414C  800 #242D36
850 #1A222A  900 #141B21  950 #0E1418  1000 #080C0F
```

**Semantic**
```
success  light #16A34A  dark #31C46A
warning  light #E8A317  dark #F5B93C
danger   light #DC2626  dark #F0524B
info     light #2563EB  dark #5B8DEF
```

### 6.3 The two-accent discipline

| Color | Owns | Never used for |
|---|---|---|
| **Firouzeh** | Links, active nav, focus rings, brand marks, fitment-verified state, selected filters | Any "buy" affordance |
| **Signal Orange** | Add to cart, checkout, prices, discount badges, low-stock urgency | Navigation, links, decoration |

**Warning rule:** warning chips are *always* outlined + icon-led, never solid fill — so they can never be mistaken for a CTA sitting next to orange.

### 6.4 Contrast-safe pairs (WCAG AA verified)

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#EEF1F4` | `#0E1418` |
| `--surface` | `#FFFFFF` | `#1A222A` |
| `--surface-raised` | `#F7F9FA` | `#242D36` |
| `--text` | `#141B21` | `#E2E7EC` |
| `--text-muted` | `#5C6B78` | `#A8B4BE` |
| `--border` | `#CBD3DA` | `#36414C` |
| `--brand` (text/link) | `#0A736B` | `#2FD9C9` |
| `--brand-solid` | `#0A9186` | `#0FB5A8` |
| `--brand-fg` | `#FFFFFF` | `#042B29` |
| `--cta` | `#D14A08` | `#FF7A2E` |
| `--cta-fg` | `#FFFFFF` | `#0E1418` |
| `--focus` | `#0FB5A8` | `#2FD9C9` |

> Dark-mode CTA deliberately uses **dark text on bright orange** — it hits 8.5:1 and looks sharper than the muddy white-on-orange everyone else ships.

### 6.5 Typography

| Role | Face | License | Used for |
|---|---|---|---|
| **Display** | **Morabba** | SIL OFL 1.1 | Hero headline, section headings, big numbers |
| **Body / UI** | **Vazirmatn** (variable) | SIL OFL 1.1 | Everything else, Persian + Latin |
| **Data** | **JetBrains Mono** | SIL OFL 1.1 | Part numbers, SKU, OEM codes, VIN, order codes, system codes, admin tables |

Fallback for Display if Morabba's weight coverage disappoints in testing: **Estedad** Black (also OFL). Verify the OFL file ships in the repo for each face before P1.S3 passes.

**Mono is not decoration.** Part numbers *are* the vernacular of this industry. Setting `MB-0442-K` in mono inside a hairline box is how a real parts catalog behaves.

**Self-host all fonts.** No Google Fonts CDN — it is unreliable from Iran. `next/font/local`, WOFF2, subset to Arabic + Latin + Persian digits, `font-display: swap`, preload only the two weights used above the fold.

**Type scale** (1.25 ratio, `clamp()` for fluid):
```
display-1  clamp(2.5rem, 6vw, 4.5rem)   Morabba 700   line-height 1.1  ls -0.02em
display-2  clamp(2rem, 4.5vw, 3rem)     Morabba 700   1.15
h1         clamp(1.75rem, 3vw, 2.25rem) Morabba 600   1.25
h2         1.5rem                       Vazirmatn 700 1.35
h3         1.25rem                      Vazirmatn 600 1.4
body-lg    1.125rem                     Vazirmatn 400 1.75
body       1rem                         Vazirmatn 400 1.75
body-sm    0.875rem                     Vazirmatn 400 1.7
caption    0.75rem                      Vazirmatn 500 1.5   ls 0.02em
data       0.875rem                     JetBrains Mono 500  ls 0.01em
```

Persian needs generous leading — body line-height never drops below **1.75**. This is not optional; Persian ascenders/descenders and diacritics collide at 1.5.

### 6.6 Other tokens

```
Radius   sm 6px · md 10px · lg 14px · xl 20px · full 9999px
Spacing  4px base scale — 1,2,3,4,6,8,12,16,20,24,32
Shadow   Light: soft, low-alpha, cool-tinted.
         Dark: NO shadows. Use --surface-raised elevation + border instead.
Motion   fast 150ms · base 250ms · slow 400ms
         ease-out cubic-bezier(0.16,1,0.3,1)
         ease-in-out cubic-bezier(0.65,0,0.35,1)
Container max 1440px · gutter 16px mobile / 32px desktop
Breaks   sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536
```

### 6.7 Theme mechanics

- Tokens live in `apps/web/styles/tokens.css` as CSS custom properties under `:root` and `[data-theme="dark"]`.
- `next-themes` with `attribute="data-theme"`, `defaultTheme="system"`, and a blocking inline script to prevent flash-of-wrong-theme.
- `tailwind.config.js` reads **every** color from `var(--…)`. Zero hex values in the Tailwind config.
- MUI theme reads **the same** CSS variables via `createTheme` with `cssVariables: true`. One palette, two consumers.
- A raw hex string in any `.jsx`/`.css` file outside `tokens.css` is a lint error. Wire the rule in P0.S4.

---

## 7. RTL & i18n

**Persian (`fa`) is the default and only shipped locale in Phase 1–7. English (`en`) is architected from day one but not translated.** Retrofitting i18n is the mistake every competitor made.

### 7.1 Setup
- `next-intl` with `localePrefix: 'as-needed'` — `fa` is unprefixed (`/`), `en` is prefixed (`/en/...`).
- `<html lang="fa" dir="rtl">`, flipped to `lang="en" dir="ltr"` for the `en` locale.
- Messages: `apps/web/messages/fa.json`, `en.json`. Namespaced by route.
- `en.json` exists from P1.S4 with the same key set (values may be English placeholders). CI fails on key drift.

### 7.2 Tailwind RTL rules
- Install `tailwindcss-logical`.
- **Only logical utilities.** `ms-` `me-` `ps-` `pe-` `start-` `end-` `border-s` `border-e` `text-start` `text-end` `rounded-s-*` `rounded-e-*`.
- **Banned:** `ml-` `mr-` `pl-` `pr-` `left-` `right-` `text-left` `text-right` `border-l` `border-r`. ESLint rule enforces this — configure it in P0.S4, not later.
- Icons that encode direction (chevrons, arrows, "next") flip with `rtl:-scale-x-100`.
- Icons that do **not** flip: logos, brand marks, media controls (play/pause), checkmarks.

### 7.3 MUI RTL
```js
// emotion cache
createCache({ key: 'muirtl', stylisPlugins: [prefixer, rtlPlugin] })
// theme
createTheme({ direction: 'rtl', cssVariables: true, ... })
```
Wrap admin in `AppRouterCacheProvider` with `enableCssLayer: true`.

### 7.4 Tailwind ↔ MUI coexistence

Two defenses, both required:

1. **Physical separation.** Route groups `(shop)` and `(admin)` have separate root layouts. Tailwind's `content` glob **excludes** `app/(admin)/**`. MUI is imported **only** under `(admin)`.
2. **Cascade layers.** In `globals.css`, first line:
   ```css
   @layer mui, tailwind;
   ```
   MUI's `enableCssLayer: true` emits into `mui`; Tailwind's directives are wrapped in `@layer tailwind`. Tailwind wins where they overlap, and Preflight can't wreck MUI components.

Verified in P1.S6 with a visual regression check. Do not proceed past Phase 1 with any bleed.

### 7.5 Persian text handling — mandatory utilities

Ship these in `packages/schemas/src/fa.js` at **P2.S3** and use them everywhere:

```
normalizeFa(str)      ي→ی · ك→ک · ة→ه · Arabic-Indic ٠١٢→ASCII · Persian ۰۱۲→ASCII ·
                      ZWNJ (\u200c) normalized · collapse whitespace · trim · lowercase Latin
toPersianDigits(n)    display only
toEnglishDigits(str)  input sanitization — apply to EVERY numeric input
formatToman(rial)     rial/10, ۳ رقمی گروه‌بندی, Persian digits, ' تومان' suffix
formatJalali(d, p)    Jalali display
normalizePhone(str)   → +989XXXXXXXXX
```

**Search rule:** `normalizeFa()` is applied to the stored `searchText` field **and** to the query string. Both. Every time. Missing either side is why every competitor's search is broken.

**Number inputs:** users type `۱۲۳۴` on Persian keyboards. `toEnglishDigits()` runs in the `onChange` of every numeric field — postal code, phone, quantity, price, OTP. Non-negotiable.

---

## 8. Repository structure

```
ParsianStore/
├── masterPlan.md                 ← this file
├── CLAUDE.md                     ← agent memory + always-on rules (P0.S1)
├── README.md  .env.example  .gitignore  .nvmrc
├── package.json  pnpm-workspace.yaml  turbo.json
├── .github/workflows/ci.yml
├── docs/
│   ├── audit.md                  ← P0.S1 competitor DOM audit
│   ├── decisions/                ← ADRs, one file per reversal-expensive choice
│   ├── api.md                    ← generated route table
│   └── design-system.md
├── apps/
│   ├── web/
│   │   ├── app/
│   │   │   ├── layout.js                 root: html lang/dir, fonts, theme script
│   │   │   ├── (shop)/                   Tailwind world
│   │   │   │   ├── layout.js
│   │   │   │   ├── page.js               landing
│   │   │   │   ├── c/[...slug]/  p/[slug]/  vehicle/[...]/
│   │   │   │   ├── cart/  checkout/  search/  compare/
│   │   │   │   ├── account/
│   │   │   │   ├── blog/  (static pages)
│   │   │   │   └── auth/
│   │   │   ├── (admin)/                  MUI world
│   │   │   │   ├── layout.js             emotion RTL cache + MUI theme
│   │   │   │   └── admin/...
│   │   │   ├── api/                      BFF only: revalidate, sitemap, og-image
│   │   │   ├── sitemap.js  robots.js  manifest.js
│   │   │   └── not-found.js  error.js  global-error.js
│   │   ├── components/
│   │   │   ├── primitives/       Button Input Select Badge Chip Card Modal Drawer …
│   │   │   ├── shop/             ProductCard PriceTag FitmentBanner VehicleSelector …
│   │   │   ├── landing/          one folder per landing section
│   │   │   ├── admin/            MUI-only components
│   │   │   └── motion/           reduced-motion-safe wrappers
│   │   ├── lib/                  api-client · auth · fetchers · seo · analytics
│   │   ├── stores/               zustand: garage · cart · ui
│   │   ├── hooks/
│   │   ├── messages/             fa.json · en.json
│   │   ├── styles/               tokens.css · globals.css
│   │   ├── public/fonts/         self-hosted woff2 + OFL.txt per family
│   │   ├── i18n.js  middleware.js  next.config.mjs  tailwind.config.js
│   └── api/
│       ├── src/
│       │   ├── server.js  app.js
│       │   ├── config/           env (Zod-validated) · db · logger · constants
│       │   ├── models/           one file per collection
│       │   ├── modules/          auth catalog vehicles fitment cart orders
│       │   │                     payments shipping reviews content admin
│       │   │                     └─ each: *.routes.js *.controller.js *.service.js *.schema.js
│       │   ├── middleware/       auth rbac validate rateLimit error notFound upload
│       │   ├── providers/        payment/ sms/ storage/ search/   ← swappable adapters
│       │   ├── utils/  jobs/  seed/
│       └── tests/
└── packages/
    ├── schemas/   Zod schemas + fa.js utilities — shared by web AND api
    ├── config/    eslint · prettier · tailwind preset
    └── ui/        cross-app primitives (Phase 4+)
```

**Module boundary rule:** a controller never touches Mongoose directly — it calls a service. A service never touches `req`/`res`. Providers are accessed only through their interface. This is what makes Phase 8+ tractable.

---

## 9. API surface (v1)

`/api/v1` prefix. Every response: `{ ok, data, meta?, error? }`. Every list endpoint paginated (`?page&limit&sort`), `limit` capped at 100.

```
POST   /auth/otp/request            POST /auth/otp/verify
POST   /auth/refresh                POST /auth/logout           GET /auth/me

GET    /catalog/categories          GET /catalog/categories/:slug
GET    /catalog/brands              GET /catalog/brands/:slug
GET    /catalog/products            (filters: category, brand, vehicle, price, attrs, inStock)
GET    /catalog/products/:slug      GET /catalog/products/:slug/related
GET    /catalog/search              ?q= (normalized) &vehicle=
GET    /catalog/facets              filter counts for the active query

GET    /vehicles/makes              /models?makeId  /generations?modelId  /engines?genId
GET    /fitment/check               ?productId&vehicleKey → { confidence, note }
GET    /fitment/products            ?vehicleKey&category

GET    /cart      POST /cart/items   PATCH /cart/items/:id   DELETE /cart/items/:id
POST   /cart/coupon                  DELETE /cart/coupon
POST   /cart/estimate-shipping

POST   /orders                      GET /orders  GET /orders/:code
POST   /orders/:code/cancel
POST   /payments/initiate           POST /payments/verify      POST /payments/webhook/:provider

GET    /me/profile   PATCH /me/profile
GET    /me/addresses  POST/PATCH/DELETE /me/addresses/:id
GET    /me/garage     POST/DELETE /me/garage/:id   PATCH /me/garage/:id/active
GET    /me/wishlist   POST/DELETE /me/wishlist/:productId
GET    /me/wallet     GET /me/wallet/transactions
GET    /me/tickets    POST /me/tickets   POST /me/tickets/:id/messages

GET    /content/banners  /sliders  /menus  /pages/:key  /posts  /posts/:slug
GET    /geo/provinces    /geo/cities?provinceId
GET    /authenticity/verify/:code

/admin/*   — mirrors the above with write access + RBAC + audit logging
           + /admin/fitment/bulk  /admin/products/import  /admin/reports/*
```

**Every route:** Zod-validated body/query/params via `validate()` middleware. Unvalidated route = rejected step.

---

## 10. Non-functional requirements

### Performance budgets (enforced in CI from P0.S5)

| Metric | Landing | PLP | PDP | Admin |
|---|---|---|---|---|
| LCP (Moto G4, Slow 4G) | ≤ 2.0s | ≤ 2.2s | ≤ 2.2s | ≤ 3.0s |
| INP | ≤ 200ms | ≤ 200ms | ≤ 200ms | ≤ 300ms |
| CLS | ≤ 0.05 | ≤ 0.05 | ≤ 0.05 | ≤ 0.1 |
| Route JS (gz) | ≤ 180KB | ≤ 160KB | ≤ 170KB | ≤ 400KB |
| Lighthouse perf | ≥ 90 | ≥ 90 | ≥ 90 | ≥ 70 |

Rules: Server Components by default — `'use client'` requires a one-line comment justifying it. Every image through `next/image` with explicit `width`/`height`. AVIF + WebP. Above-the-fold images `priority`, everything else lazy. Framer Motion, Swiper, and MUI X are dynamically imported. No barrel-file imports from `@mui/*` or `lucide-react`.

### Accessibility floor (every step)
Keyboard reachable, visible focus ring (`--focus`, 2px offset), semantic landmarks, labelled form controls, live-region errors, ≥ 4.5:1 body contrast, ≥ 44×44px touch targets, `prefers-reduced-motion` honored, RTL screen-reader tested.

### Security
Helmet + CSP · CORS allowlist · rate limits (OTP 5/hr/phone, auth 10/15min/IP, API 100/min/IP) · `express-mongo-sanitize` · httpOnly `SameSite=Lax` `Secure` cookies · argon2id · no secrets in the repo, ever · file uploads: MIME + magic-byte checked, re-encoded through sharp, size-capped · admin writes audit-logged · payment verification is **server-side only**, never trusts the client callback.

### SEO
Per-page Persian metadata · canonical · OG + Twitter · JSON-LD (`Product`+`Offer`+`AggregateRating`, `BreadcrumbList`, `Organization`, `FAQPage`) · dynamic `sitemap.xml` split by type · `robots.txt` · `hreflang` fa/en · Persian slugs kept readable (do not transliterate to ASCII) · `/vehicle/[make]/[model]` pages are the primary organic surface — treat them as products, not filters.

---

## 11. Environments & deployment

**Do not target Vercel.** Access friction for Iranian users makes it a bad fit. Target a Docker-deployable host: **Liara**, **ArvanCloud**, or a self-managed VPS behind Nginx.

Consequences to build for from day one: self-host the `next/image` optimizer (sharp), self-host fonts, S3-compatible object storage (ArvanCloud Object Storage) with a **local-disk driver for dev**, and no reliance on edge-runtime-only APIs.

```
# apps/web
NEXT_PUBLIC_SITE_URL=  NEXT_PUBLIC_API_URL=  NEXT_PUBLIC_DEFAULT_LOCALE=fa
NEXT_PUBLIC_ENAMAD_ID=  REVALIDATE_SECRET=

# apps/api
NODE_ENV=  PORT=  MONGODB_URI=  CORS_ORIGINS=
JWT_ACCESS_SECRET=  JWT_REFRESH_SECRET=  JWT_ACCESS_TTL=15m  JWT_REFRESH_TTL=30d
SMS_PROVIDER=kavenegar|mock   KAVENEGAR_API_KEY=  OTP_TEMPLATE=
PAYMENT_PROVIDER=zarinpal|mock  ZARINPAL_MERCHANT_ID=  ZARINPAL_SANDBOX=true
STORAGE_DRIVER=local|s3  S3_ENDPOINT=  S3_BUCKET=  S3_KEY=  S3_SECRET=
SEARCH_DRIVER=mongo|meili  MEILI_HOST=  MEILI_KEY=
ADMIN_SEED_PHONE=  LOG_LEVEL=info
```

**Adapters, not integrations.** `PaymentProvider`, `SmsProvider`, `StorageProvider`, `SearchProvider` are interfaces with a `mock` implementation shipped first. Real gateways plug in behind them. This lets Phases 2–8 run with zero external accounts.

> **Phase 6 external blocker:** a live Iranian payment gateway requires a registered business, e-Namad (اینماد) approval, and gateway contract. Start that paperwork during Phase 2 — it takes weeks. Development proceeds on `mock` + Zarinpal sandbox regardless.

---

## 12. Git workflow

```
main         protected · release only · never pushed to directly
development  integration branch · every step lands here
feat/*       optional, for steps touching > 15 files
```

**After every step, without being asked:**

```bash
pnpm lint && pnpm test && pnpm build     # must pass before commit
git add -A
git commit -m "feat(web): [P1.S3] self-hosted Persian fonts + type scale"
git push origin development
```

Conventional Commits with a mandatory step tag:
```
<type>(<scope>): [P<phase>.S<step>] <subject in English, imperative>

types:  feat fix refactor perf style docs test chore ci build
scopes: web api schemas ui config repo
```

Commitlint + Husky enforce this (P0.S4). CI on `development` runs lint → test → build → Lighthouse budget. Red CI blocks the next step.

---

## 13. Phases

Each step ends with: lint clean · tests pass · build passes · **committed and pushed to `development`**.

---

### PHASE 0 — Foundation & guardrails
*Goal: a repo where it is easier to do the right thing than the wrong thing.*

| Step | Deliverable | DoD |
|---|---|---|
| **P0.S1** | **Competitor DOM audit.** Manually inspect all 7 reference sites + yadakyar + mashinno. Capture: nav IA, vehicle-finder UX, PLP filters, PDP anatomy, checkout steps, mobile behavior, load metrics. Write `docs/audit.md` with a "what we steal / what we beat" table. | ≥ 7 sites documented; ≥ 15 concrete findings; every finding maps to a section of this plan |
| **P0.S2** | `CLAUDE.md` — always-on agent rules distilled from §0, §6, §7, §10. Repo scaffold: pnpm workspaces, Turborepo, `.nvmrc`, `.gitignore`, `.env.example`, `README.md`. | `pnpm install` clean; `pnpm dev` runs both apps |
| **P0.S3** | Bare `apps/web` (Next 15) + `apps/api` (Express 5) + `packages/schemas` + `packages/config`. Health check `GET /api/v1/health` reachable from web. | Both apps boot; health check green |
| **P0.S4** | Tooling gate: ESLint 9 flat + Prettier + `eslint-plugin-tailwindcss`, **custom rules banning physical direction utilities and raw hex literals**, Husky + lint-staged + commitlint, Vitest + Playwright scaffolds. | A commit using `ml-4` fails. A commit with `#FF0000` in a component fails. A bad commit message fails. |
| **P0.S5** | GitHub Actions CI: install → lint → test → build. `development` branch created and pushed. Branch protection notes in README. | Green CI on `development` |

**GATE 0 → 1:** `docs/audit.md` reviewed by a human. Language decision (§2.2) confirmed. Do not proceed without both.

---

### PHASE 1 — Design system & RTL core
*Goal: a themed, RTL-correct, dual-styling shell with zero product logic.*

| Step | Deliverable | DoD |
|---|---|---|
| **P1.S1** | `styles/tokens.css` — every token from §6 as CSS custom properties, light + dark. | Zero hex outside this file |
| **P1.S2** | `tailwind.config.js` consuming only `var(--…)`. `tailwindcss-logical` installed. `@layer mui, tailwind;` declared. | No hex in the config |
| **P1.S3** | Self-hosted fonts: Morabba, Vazirmatn, JetBrains Mono. Subset, WOFF2, `next/font/local`, preload above-fold weights, **OFL.txt committed per family**. Type scale utilities. | Lighthouse flags no font issues; no CDN font requests; licenses present |
| **P1.S4** | `next-intl` wired. `middleware.js`. `fa.json` + `en.json` with identical key sets. `<html lang dir>` driven by locale. | Switching locale flips `dir`; CI fails on key drift |
| **P1.S5** | `next-themes` + inline anti-flash script. Theme toggle component. | No flash on reload in either theme; `prefers-color-scheme` respected |
| **P1.S6** | `(admin)` route group: emotion RTL cache, MUI theme reading the same CSS vars, `AppRouterCacheProvider` with `enableCssLayer`. A demo admin page with DataGrid + form + chart. | Persian text renders RTL in MUI; **zero style bleed** between `(shop)` and `(admin)`; screenshot proof both themes |
| **P1.S7** | `components/primitives/`: Button (variants: brand, cta, ghost, outline), Input, Select, Textarea, Checkbox, Radio, Badge, Chip, Card, Modal, Drawer, Tabs, Tooltip, Skeleton, Toast, Pagination, Breadcrumb, EmptyState. All RTL + dark + keyboard + reduced-motion correct. | Every primitive on a `/styleguide` page; axe: 0 violations |
| **P1.S8** | `components/motion/`: `Reveal`, `Stagger`, `CountUp`, `Marquee` — each calling `useReducedMotion()`. Motion token constants. | Reduced motion → instant final state, verified |
| **P1.S9** | Layout shell: Header (logo, mega-menu, search, garage chip, cart, account, theme toggle), Footer (mega, e-Namad slot), MobileNav (bottom bar + drawer). | Fully responsive 360→1920; keyboard navigable; RTL correct |

**GATE 1 → 2:** `/styleguide` reviewed. Human sign-off on palette and typography. **This is the cheapest moment to change the visual direction — get sign-off here.**

---

### PHASE 2 — Backend core
*Goal: a running API with auth, RBAC, and seeded reference data.*

| Step | Deliverable |
|---|---|
| **P2.S1** | Express 5 app: helmet, cors, compression, cookie-parser, pino-http, Zod-validated env config, error + 404 middleware, graceful shutdown |
| **P2.S2** | Mongoose connection, base plugins (timestamps, soft-delete, `toJSON` transform), index strategy doc |
| **P2.S3** | `packages/schemas` — Zod schemas + `fa.js` utilities (§7.5), unit-tested against real Persian edge cases |
| **P2.S4** | User model + phone OTP auth: request, verify, refresh rotation, logout, `/auth/me`. `SmsProvider` interface + `MockSmsProvider` + `KavenegarProvider` |
| **P2.S5** | RBAC middleware, staff seeding, audit-log middleware on all admin writes |
| **P2.S6** | Vehicle models + **seed data: full Iranian market** (ایران‌خودرو، سایپا، بهمن، مدیران‌خودرو، ام‌وی‌ام، کرمان‌موتور) + top imported makes, with generations and year ranges |
| **P2.S7** | Geo seed: all 31 Iranian provinces + cities. `/geo/*` endpoints |
| **P2.S8** | `StorageProvider` interface + local-disk driver + sharp pipeline (AVIF/WebP, 4 sizes) |
| **P2.S9** | Rate limiting, mongo-sanitize, request-id, security header audit |

**GATE 2 → 3:** Full auth flow works end-to-end against the mock SMS provider. Vehicle tree browsable via API.

---

### PHASE 3 — Catalog & fitment
*Goal: the data layer that makes this a parts store, not a generic shop.*

| Step | Deliverable |
|---|---|
| **P3.S1** | Category, Brand, Attribute models + admin CRUD API. System codes (`SYS-xx`) assigned. |
| **P3.S2** | Product model with `searchText` (auto-maintained via `normalizeFa()` on save), OEM + cross-ref numbers, authenticity record, indexes |
| **P3.S3** | Fitment model + compound indexes + `/fitment/check` + `/fitment/products` |
| **P3.S4** | `SearchProvider` interface + `MongoSearchProvider` (normalized text + prefix + OEM-number exact match). Faceted filtering with counts. |
| **P3.S5** | Product listing API: filters (category, brand, vehicle, price range, attributes, in-stock), sorting, cursor-safe pagination |
| **P3.S6** | Inventory: stock, movements, reservation with TTL, low-stock alerts |
| **P3.S7** | Seed script: ≥ 300 realistic products across ≥ 8 categories, ≥ 15 brands, with **real fitment data** for top Iranian vehicles. Persian names, plausible Rial prices. |

**GATE 3 → 4:** `/fitment/check` returns correct verdicts for 20 manually verified product↔vehicle pairs.

---

### PHASE 4 — The landing page
*Goal: the thing that wins the room.*

| Step | Deliverable |
|---|---|
| **P4.S1** | Landing route shell, section scaffolding, real fa copy in `fa.json`, SEO metadata + JSON-LD |
| **P4.S2** | **The Exploded View** — SVG assembly, leader lines, system codes, load choreography, hover/tap states, mobile stacked variant, reduced-motion variant |
| **P4.S3** | Vehicle selector inside the hero + Zustand garage store + cookie persistence + `?v=` URL sync |
| **P4.S4** | Sections 02–07 (trust, shop-by-system, best sellers, brand wall, authenticity, deals) |
| **P4.S5** | Sections 08–15 (shop-by-vehicle, symptom finder, numbers, how-it-works, guides, support, newsletter, mega footer) |
| **P4.S6** | Motion pass: orchestrate the load sequence, tune scroll reveals, cut anything that doesn't serve the page. **Remove one accessory.** |
| **P4.S7** | Performance pass: hit every budget in §10. Bundle analysis committed to `docs/`. |
| **P4.S8** | A11y pass: axe clean, keyboard walkthrough, VoiceOver-in-RTL check, reduced-motion check |

**GATE 4 → 5:** Landing page hits all §10 budgets on a throttled mobile profile, in both themes. Human sign-off. **This is the deliverable that justifies the project — do not rush it to reach Phase 5.**

---

### PHASE 5 — Storefront
Category/PLP with faceted filters and a fitment-aware filter bar · PDP (gallery, fitment verdict banner, authenticity panel, specs, OEM cross-reference table, related & alternative parts, Q&A, reviews) · search results with Persian-normalized suggestions · brand pages · vehicle landing pages · compare · wishlist · cart (persistent, guest + auth merge).

### PHASE 6 — Checkout, payments, orders
3-step checkout · address book with province→city cascade · shipping zones & rates · `PaymentProvider` interface + Mock + Zarinpal sandbox · server-side verification · stock reservation & release · order state machine · order confirmation & tracking · SMS notifications · invoice PDF.

> Blocked on the e-Namad + gateway paperwork started in Phase 2. Ship on mock/sandbox regardless.

### PHASE 7 — User dashboard
Overview · orders + timeline tracking · **My Garage** (add/edit/remove/set-active, fitment shortcuts) · addresses · wishlist · wallet · reviews · support tickets · profile · notification preferences.

### PHASE 8 — Admin dashboard (MUI)
KPI overview with MUI X Charts · products CRUD + variants + media manager + CSV/Excel bulk import · categories/brands/attributes · vehicle manager · **Fitment Manager** (§3.7) · inventory · orders with status workflow, refunds, invoices · customers · discounts · payments reconciliation · shipping config · content (banners, sliders, menus, pages, blog) · review & Q&A moderation · tickets · reports & exports · staff RBAC · settings · audit log.

### PHASE 9 — Content, SEO, hardening
Blog + guides (lead with counterfeit-identification content) · full JSON-LD coverage · sitemap splitting · Meilisearch swap behind `SearchProvider` · Redis for rate limiting and token revocation · caching & ISR strategy · error tracking · analytics · load testing · penetration checklist · backup & restore runbook.

### PHASE 10 — Launch
Production infra on Liara/ArvanCloud · live gateway + e-Namad seal · SMS provider live · staging→prod migration · smoke suite · monitoring & alerting · rollback runbook · handover docs.

---

## 14. Definition of Done — applies to every step

- [ ] Requirement met exactly as written; nothing extra invented
- [ ] RTL correct — zero physical direction properties
- [ ] Light **and** dark verified
- [ ] Responsive 360px → 1920px
- [ ] Keyboard reachable, visible focus, axe: 0 violations
- [ ] `prefers-reduced-motion` honored in anything animated
- [ ] All strings in locale files; `fa` and `en` key sets identical
- [ ] All colors/spacing/type from tokens
- [ ] Server Components by default; every `'use client'` justified in a comment
- [ ] API inputs Zod-validated; lists paginated
- [ ] Money as integer Rial; dates UTC + Jalali display formatter
- [ ] `pnpm lint && pnpm test && pnpm build` all pass
- [ ] Performance budget respected for touched routes
- [ ] Committed with the correct tag and **pushed to `development`**
- [ ] STEP COMPLETE block emitted (§0)

---

## 15. Open questions — answer before P0.S2

1. **TypeScript or plain JavaScript?** Plan assumes JS (§2.2). Reversal cost rises sharply after Phase 2.
2. **Brand name and logo** — is it "پارسیان" / ParsianStore, and does a mark exist?
3. **Legal entity + e-Namad status** — started, or not yet? Gates Phase 6.
4. **Catalog source** — supplier CSV, scrape, or manual entry? Determines the Phase 3 import tooling.
5. **Payment gateway preference** — Zarinpal, Zibal, IDPay, or a bank PSP?
6. **SMS provider** — Kavenegar, SMS.ir, or Ghasedak?
7. **Hosting target** — Liara, ArvanCloud, or own VPS? Affects Phase 0 CI.
8. **Do we sell to mechanics at wholesale prices?** If yes, B2B pricing tiers must enter the Product model in Phase 3, not be bolted on later.

---

## 16. Amendment rules

This document changes only by explicit human instruction. When it changes:

1. Bump the version at the top.
2. Log the change in `docs/decisions/` as a dated ADR: context → decision → consequences.
3. Commit as `docs(repo): [PLAN] <what changed>`.

Phases 5–10 will be re-specced in the same depth as Phases 0–4 before they execute. **Do not execute a phase from its summary paragraph alone.**
