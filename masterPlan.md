# ParsianStore — Master Plan

**Repo:** `https://github.com/boyInShadows/ParsianStore`
**Integration branch:** `development`
**Product:** Persian-first (RTL) e-commerce for car spare parts — Saipa & Iran Khodro vehicles only
**Owner:** Ash Tech Group
**Status:** Phases 0–4 complete (P0.S1–P4.S8). Palette refined to v1.5 (Marigold CTA) per owner review. **GATE 4→5 cleared 2026-07-28.** Phase 5 (storefront) executed incrementally, by the owner's explicit "one piece at a time" choice — **P5.S1 (Category/PLP), P5.S2 (PDP), P5.S3 (search results), P5.S7 (wishlist + `/auth/login`), and P5.S8 (cart) shipped; P5.S4–S6 (brand pages, vehicle landing pages, compare) were deprioritized in favor of cart and remain undone**, per the owner's own ordering, not an oversight — §13's table still carries their draft specs for whenever they're picked up. **GATE 5→6 cleared 2026-07-29.** Phase 6 (checkout/payments/orders) is directionally locked, still to be re-specced when its own turn comes — the owner is running it the same "one piece at a time" way as Phase 5. **P6.S1–P6.S7 are done and shipped — Phase 6 (checkout/payments/orders) is complete.** A real shopper can now go from PDP to a paid, optionally-discounted order end to end: B2B wholesale pricing, address book, `PaymentProvider` (Mock + Zarinpal sandbox), shipping zones & rates, Order + checkout initiation, the real checkout frontend, and coupons. Wallet (Phase 7 dashboard scope, not Phase 6) and pay-on-delivery (deferred at P6.S5's own kickoff) remain open by explicit design, not a gap. **Phase 7 (user dashboard) has now started, run the same "one piece at a time" way — P7.S1 (My Orders) and P7.S2 (address book page — real add/edit/delete) are done and shipped.** See §13's Phase 6/7 entries for the real, shipped detail per step.
**Document version:** 1.17 — Phases 0–4 are locked; Phase 5 is gate-cleared with P5.S4–S6 left as open backlog, not blocking Phase 6. Phase 6 is complete (P6.S1–P6.S7). Phase 7 is underway (P7.S1–P7.S2 shipped), re-specced piece by piece as each one starts. **English (`en`) locale maintenance is suspended as of 2026-07-30 — owner confirmed directly the business won't sell in English; `en.json` parity is no longer part of any step's DoD, deferred to a future, lowest-priority backlog item (§7).** Phases 8–10 remain directionally locked, re-specced only when their turn comes.

**Changelog:**
- 1.1 — Language decision reversed from plain JavaScript to TypeScript (§2.2), mid-Phase-0, before any app code existed. See `docs/decisions/0001-typescript-over-plain-js.md`.
- 1.2 — Morabba (§6.5 Display face) is not OFL-licensed (commercial, fontiran.com) — replaced with Estedad, the document's own already-named fallback. See `docs/decisions/0002-morabba-not-ofl-use-estedad.md`.
- 1.3 — Color palette (§6.1–§6.4) replaced: turquoise + safety-orange → Steel Blue + Racing Red, per owner feedback at GATE 1→2 and automotive-color research (Saipa/Iran Khodro both use blue; racing/tool-brand culture overwhelmingly uses red for excitement). See `docs/decisions/0003-color-palette-steel-and-race.md`.
- 1.4 — Vehicle scope narrowed from "Iranian & imported vehicles" (implicitly ~6 domestic makes + top imports, per the original §1.2 audit framing) to **Saipa and Iran Khodro only**, per explicit owner instruction: "in iran we only use SAIPA and IRANKHODRO cars and our shop gonna aim this category of cars." Affects §5 item 08 and P2.S6/P3.S7 seed-data scope. §1.1's customer table already only named Saipa/IKCO models (Pride, Tiba, Quick / 405, Samand, Dena), so no change was needed there. See `docs/decisions/0004-vehicle-scope-saipa-ikco-only.md`.
- 1.5 — Color palette (§6.2–§6.4) refined again: Racing Red → **Marigold**, per owner feedback reviewing the completed Phase 4 landing page ("sport car" combo, not auto-parts retail). Steel Blue unchanged. See `docs/decisions/0005-color-palette-marigold-cta.md`.
- 1.6 — §13's Phase 5 table expanded from a one-paragraph summary to real per-step rows (P5.S1–S2 backfilled as shipped, P5.S3–S8 drafted for what's left), per owner instruction to review and substantially improve this document now that two real Phase 5 steps exist to learn from. Added §17 (engineering conventions actually established across Phases 2–5, so a future agent reads them once instead of re-deriving them from commit history) and §18 (product ideas under consideration — explicitly not committed scope, per §16). §15's open questions re-audited against real repo state — see the table there for what's actually still open vs. quietly resolved. See `docs/decisions/0006-masterplan-v1.6-review.md`.
- 1.7 — **P5.S8 (Cart) shipped, GATE 5→6 cleared.** §15's three Phase-6-blocking open questions (Q3 e-Namad, Q5 payment gateway, Q8 B2B pricing) answered directly with the owner, per this table's own standing instruction to ask before P5.S8 wraps: e-Namad/legal paperwork confirmed **not started** (real external blocker persists into Phase 6, development still proceeds on mock/Zarinpal-sandbox); payment gateway settled on **Zarinpal**; B2B wholesale pricing tiers confirmed needed, scheduled as a real migration at **P6.S1** rather than bolted on silently (the exact scenario §3.2 originally warned against). P5.S4–S6 (brand pages, vehicle landing pages, compare) remain undone by explicit owner ordering — not required by GATE 5→6's own criteria, left as open Phase-5 backlog rather than blocking Phase 6.
- 1.8 — **P6.S1 (B2B wholesale pricing) shipped**, re-specced at kickoff per §16 rather than guessed at v1.7 time (owner confirmed account-type-based tiers, seed/script-only admin path, no self-service verification flow — see `docs/decisions/0008-...md`). §3.2's `Product` shape gains `wholesalePriceRial?`. A real, load-bearing gap caught only by live browser verification (not the automated suite): PDP/PLP/search are Server Components whose plain server-side `fetch()` never carried the viewer's session cookie to the API, so a real wholesale account would have silently seen retail pricing everywhere except cart — fixed by forwarding `(await cookies()).toString()` explicitly into `lib/fetchers/catalog.ts`'s product-returning functions. Also fixed in passing: a pre-existing `aria-prohibited-attr` violation on Header.tsx's signed-in account icon, surfaced by the same live axe run. See §13's Phase 6 entry for full detail.
- 1.9 — **P6.S2 (address book, backend) shipped** — the owner's chosen first "one piece at a time" slice of Phase 6, same rhythm Phase 5 used. Real `/me/addresses` CRUD, auth-only per an explicit owner decision (checkout drops the original spec's `guestPhone?`, matching Wishlist's own auth-only precedent). `Address.province`/`city` migrated to real `provinceId`/`cityId` refs (owner's choice, safe since no route had ever written an address) — §3.2 updated. Deliberately no frontend page this step, grounded in an actual precedent (Wishlist has no list page either; both "wishlist" and "addresses" are named Phase 7 dashboard scope), not a corner cut. §17 gains no new entries this step (the `$pull`/`modifiedCount` MongoDB lesson is documented in the P6.S2 row itself, not promoted to a standalone convention yet — worth revisiting if it recurs). See `docs/decisions/0009-...md` and §13's Phase 6 entry for full detail.
- 1.10 — **P6.S3 (`PaymentProvider` + Mock + Zarinpal sandbox) shipped** — owner picked this as self-contained, matching §17's own "provider gets a mock first, always" rule (`SmsProvider` is the mirrored precedent). Provider-only scope, deliberately — no `Payment` model, no routes yet, those belong with the future Order/checkout step. Real Zarinpal v4 REST shapes verified against the gateway's own current docs, not assumed. §17 gains a new entry: `z.coerce.boolean()` is a real footgun for a boolean env var (`Boolean("false")` is `true` in JS) — caught before shipping, not after. **Stated plainly, not glossed over**: the plan's own live-sandbox-round-trip verification step could not run — this environment's shell has no outbound internet access at all (confirmed generically, not Zarinpal-specific), so verification rests on doc-cross-referenced request/response shapes plus a full mocked-`fetch` test suite instead, same honesty precedent P4.S8's VoiceOver-on-Windows substitution already set. See `docs/decisions/0010-...md` and §13's Phase 6 entry for full detail.
- 1.11 — **P6.S4 (shipping zones & rates) shipped** — owner chose to build this before checkout initiation so a real order total never ships with a `shippingRial: 0` placeholder. §3.6's exact 5 named couriers modeled; **حضوری (in-person pickup) deliberately excluded** (no real pickup location exists yet — an availability fact, not a business call, same reasoning as P4.S4's best-sellers section). Methods are a static const (`packages/schemas/src/shipping.ts`, mirrors `CATALOG_SYSTEMS`'s precedent); rates are a real seeded `ShippingRate` collection (mirrors `Province`/`City`) since these Rial amounts will need real updates before Phase 8's admin UI exists. Zones resolved from `Province.slug` (`tehran`/`other`) via a plain function, not a new `Province.zone` field. New `POST /cart/estimate-shipping` added to the existing `cartRouter`, `requireAuth` stacked on this one route only. Every seeded `priceRial` is a documented **ESTIMATE** — owner confirmed directly that placeholder-but-flagged rates are fine for now, adjustable via Phase 8's admin UI or a reseed. 375/375 tests (8 new). No `apps/web` changes this step. See `docs/decisions/0011-p6s4-shipping.md` and §13's Phase 6 entry for full detail.
- 1.12 — **P6.S5 (Order + checkout initiation, backend only) shipped** — three real scope calls made with the owner before writing any code: backend only (the real `/checkout` page is a future step), gateway payment only (no wallet model exists, pay-on-delivery left out too), coupons stay out (no admin CRUD exists yet to issue a code, `Order.discountRial` stays `0`). `Order`/`Payment` models added per §3.2, `Order.userId` required and `guestPhone?` dropped (P6.S2's auth-only decision applied, not re-asked). New `POST /checkout/initiate` and `GET /payments/callback` reuse every piece Phase 6 already built — P6.S1's pricing resolution, P6.S2's addresses, P6.S3's `PaymentProvider`, P6.S4's shipping estimate, P3.S6's stock reservations — rather than duplicating any of their logic. `Status=NOK` on the callback short-circuits to a failed outcome without calling `verify()`, both the real Zarinpal convention and the only way to get deterministic test coverage of the failure path against a mock that never simulates failure. See `docs/decisions/0012-p6s5-checkout.md` and §13's Phase 6 entry for full detail.
- 1.13 — **P6.S6 (checkout frontend) shipped** — the real `/checkout` page P6.S5 explicitly deferred. Two real gaps found once the frontend work actually started, not just "connect the UI to existing endpoints": (1) zero address-book UI existed anywhere in `apps/web` (P6.S2 shipped backend-only) — a minimal inline address picker (list + add-new form with a real province→city cascade, mirroring `VehicleSelector.tsx`'s dependent-query pattern) was built into the checkout page itself, no standalone "my addresses" management page, matching the same scope precedent Wishlist/Addresses already set (full CRUD dashboards stay Phase 7); (2) `GET /payments/callback` (P6.S5) was the API's own JSON endpoint, meaning a real gateway redirect would have landed a shopper's browser on raw JSON — fixed by pointing the payment provider's `callbackUrl` at a new `/checkout/result` **web** page instead (reusing `env.CORS_ORIGINS[0]` as "the web app's own origin," no new env var), whose client JS is the one that now calls the unchanged `GET /payments/callback` via fetch. **Two real pre-existing bugs found via live verification, unrelated to this step's own code, fixed anyway**: `Auth.login.codeHelper` and `Cart.stockIssue` both embed a literal `{placeholder}` meant for a manual client-side `.replace()`, not next-intl's own ICU interpolation — calling `t()` for either without supplying the implied argument throws `FORMATTING_ERROR` on a real SSR request (silently never caught before since these routes are normally reached via client-side navigation, not `page.goto()`-style fresh requests) — fixed with ICU single-quote escaping (`'{phone}'`/`'{count}'`), preserving the exact same displayed text. Verified live end to end (Playwright): full happy path (add to cart → new address → shipping selection → place order → mock-gateway round trip → result page shows the real order code → cart cleared), unauthenticated visit redirects to `/auth/login?next=/checkout`, axe 0 violations light/dark/mobile/fa/en, a fresh production build's API-down smoke test still serves graceful 200s on both new routes. 385/385 backend tests unchanged (only `checkout.routes.test.ts`'s own callback-URL assertions updated for the new redirect target); no new backend tests needed since no new API surface was added this step. `/checkout` route: 148KB First Load JS (no established §10 budget for it yet). See `docs/decisions/0013-p6s6-checkout-frontend.md` and §13's Phase 6 entry for full detail.
- 1.14 — **P6.S7 (coupons) shipped — Phase 6 is now complete.** New `Coupon` model (§3.2) and a shared, cart-agnostic `modules/coupons/coupon.service.ts` (validation + discount math) used by both `POST/DELETE /cart/coupon` and checkout initiation, so the discount logic exists in exactly one place. `Cart.couponCode` (declared since P5.S8, unused until now) is re-validated live on every `getCart()` call against the cart's own current subtotal — never trusted as a cached amount — and simply stops applying (with a `couponIssue` hint) rather than being silently cleared if it becomes invalid, so it can self-heal (e.g., the cart crosses a `minSubtotalRial` threshold again). `Order.couponCode` is a snapshot, same `*Snapshot` philosophy as `nameSnapshot`/`skuSnapshot`; `Coupon.usedCount` increments only on genuine payment success (never on a pending or cancelled attempt), keeping it in exact lockstep with the `perUserLimit` check's own redeemed-order-status filter. Coupon creation is a script (`pnpm --filter api create-coupon`), same "no admin CRUD exists yet" precedent P6.S1 already established for wholesale accounts — stays Phase 8 scope. **A real a11y bug caught via live verification, not an oversight**: the discount row's `text-success` green failed WCAG AA at this text size (2.9:1, needs 4.5:1) — the exact same bug class already documented and fixed once in `ProductCard.tsx` (P5.S1) — fixed the same way, dropping the color since the leading minus sign already conveys "discount." 394/394 tests (9 new). `/cart` 136KB, `/checkout` 148KB (both unchanged from P6.S6 within rounding). See `docs/decisions/0014-p6s7-coupons.md` and §13's Phase 6 entry for full detail.
- 1.15 — **P7.S1 (My Orders) shipped — Phase 7 has started.** The owner's first Phase 7 pick (asked directly, over address book/wishlist/garage pages) — the most urgent gap right after Phase 6: a shopper who just paid had no way to ever see that order again. New `GET /me/orders`/`GET /me/orders/:code` (ownership baked into the query filter itself, matching `addresses.service.ts`'s own precedent — a different user's order 404s exactly like a nonexistent code, never leaking which). The real `OrderStatus` enum and list/detail DTOs (deliberately deferred in `packages/schemas` at P6.S5's own kickoff) land here. Both pages are pure Server Components with a **server-side** auth gate — a deliberate departure from `/checkout`'s client-side gate, since this page needs zero interactivity and gained nothing from client JS. The status timeline is a plain evidence-shaped list (hairline connector, logical `border-s-2`), matching the Authenticity panel's own aesthetic rather than inventing a `Timeline`/`Stepper` primitive for one consumer. 401/401 tests (7 new). Route budgets: `/orders` and `/orders/[code]` both 111KB, zero client JS added. See `docs/decisions/0015-p7s1-my-orders.md` and §13's Phase 7 entry for full detail.
- 1.16 — **English locale maintenance suspended, owner's direct instruction.** The business will not sell in English — real translation work is deferred to a future, lowest-priority backlog item, not scheduled into any phase. This is actually a course-correction back toward §7's own original intent ("`fa` is the default and only shipped locale in Phase 1–7, `en` is architected from day one but not translated") — several steps across Phases 5–7 had drifted into fully translating every new string into real English, well beyond what was ever required. Going forward: `messages/en.json` parity is removed from every step's DoD (§14), the `node -e` key-diff habit (§17) is suspended, and no step needs `en`-locale verification. The `next-intl`/`en` routing infrastructure itself is untouched (a bigger, unrequested change) — `en.json` simply stops being actively maintained. This entry itself is documentation-only; the one real code consequence (deleting the now-obsolete `messages/keys.test.ts` key-parity test) surfaced and landed during P7.S2, logged there.
- 1.17 — **P7.S2 (address book page) shipped.** The owner's second Phase-7 pick — the one of address-book/wishlist/My-Garage with genuinely zero standalone UI (checkout's own picker only ever supported list+create). No backend changes — `PATCH`/`DELETE /me/addresses` already existed complete since P6.S2. `AddressForm` (the province→city cascade + fields) was extracted out of `checkout/AddressPicker.tsx` into a shared `components/addresses/AddressForm.tsx` with a `create`/`edit` mode, real duplication resolved once it existed, not speculatively. `/addresses` uses `/checkout`'s own client-side auth gate (this page is inherently interactive, unlike `/orders`' read-only server-gated pages). New `components/account/AccountNav.tsx` (a plain Server Component, zero client JS) gives `/orders`/`/addresses` real cross-navigation now that a second account page justifies one. **A real consequence of v1.16's English-suspension decision surfaced here**: `messages/keys.test.ts` (P1.S4), a genuine automated test enforcing `fa`/`en` key parity, failed on this step's first `fa`-only commit — deleted outright, the policy it tested no longer exists. This step itself ships Persian-only from its first commit. 400/400 backend tests (unchanged, no backend surface added). `/addresses`: 141KB First Load JS. See `docs/decisions/0016-english-locale-suspended.md`, `docs/decisions/0017-p7s2-address-book-page.md`, and §13's Phase 7 entry for full detail.

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
| Language | **TypeScript (strict)** + Zod | 5.x | See §2.2 |
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

**Reversed in v1.1: TypeScript, strict mode.** The original assumption in
this document was plain JavaScript + JSDoc (see the changelog above). The
owner explicitly reversed that decision during Phase 0, immediately after
P0.S2 (repo scaffold) landed and before P0.S3 wrote a single line of app
code — the cheapest point at which this document itself warned the cost
would still be low. Full context, rationale, and consequences are logged as
an ADR: `docs/decisions/0001-typescript-over-plain-js.md`.

Runtime safety still comes from Zod schemas shared between client and
server (`packages/schemas`); TypeScript adds compile-time safety on top,
inferring types from those same Zod schemas via `z.infer<>` wherever
possible rather than hand-duplicating types.

**File-extension convention, repo-wide:** `.ts` for non-JSX modules, `.tsx`
for JSX/React components. Every `.js`/`.jsx` filename that still appears
elsewhere in this document (the illustrative tree in §8, the `apps/api`
module pattern `*.routes.js`/`*.controller.js`/`*.service.js`/`*.schema.js`,
etc.) should be read as `.ts`/`.tsx` per this amendment — those references
were not individually rewritten; this note is the single source of truth
for the substitution. Tool config files that run directly under Node
(`eslint.config.mjs`, `next.config.mjs`, etc.) are unaffected and stay
`.mjs` — the module-file marker is orthogonal to the language choice.

> **This was the single most expensive decision to reverse — now reversed while it was still cheap.** Any further language reversal after Phase 2 costs roughly a full week; this one cost a docs edit and an unstarted Phase 0 step.

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
                wholesalePriceRial(Int)? (P6.S1, select:false -- never
                sent raw over the wire, only the resolved effective price) ·
                stock · lowStockAt · backorderable · weightGram · dimensions ·
                warranty{months,text} · authenticity{...} (§3.5) ·
                status(draft|active|archived) · rating{avg,count} ·
                searchText(normalized) · seo{}
Fitment         productId · makeId · modelId · genId? · engineId? ·
                yearFrom · yearTo · note{fa} · confidence(exact|likely|check)
                → compound index (makeId, modelId, genId, yearFrom, yearTo)

Cart            userId? · anonId? · items[{productId,qty,priceRialSnapshot}] ·
                couponCode? · expiresAt(TTL idx)
Order           (P6.S5) code(human, e.g. PS-1404-04821) · userId (required --
                auth-only per P6.S2, `guestPhone?` dropped from the
                original spec) ·
                items[{productId, nameSnapshot, skuSnapshot, qty, priceRial}] ·
                subtotalRial · discountRial(0, no Coupon model yet) ·
                shippingRial · taxRial(0, unused) · totalRial ·
                address{} (snapshot, not a live ref) · shippingMethod{} (snapshot) ·
                trackingCode? ·
                status(pending|paid|processing|shipped|delivered|cancelled|refunded) ·
                statusHistory[] · paymentId? · notes?
Payment         (P6.S5) orderId · provider · amountRial · authority? · refId? ·
                status(initiated|success|failed|refunded) · raw{}? · verifiedAt?
Coupon          (P6.S7) code · type(percent|fixed) · value(percent) · minSubtotalRial? ·
                maxDiscountRial? · usageLimit? · usedCount · perUserLimit? ·
                startsAt? · endsAt? · scope?{} (reserved, unpopulated -- no
                category/brand scoping rule is defined or needed yet)
Review          productId · userId · rating · title · body · images[] ·
                isVerifiedPurchase · status(pending|approved|rejected)
Ticket          userId · orderId? · subject · status · priority · messages[]
Address         (embedded) provinceId · cityId (P6.S2, migrated off plain
                province/city strings -- real refs into Province/City) ·
                line · postalCode(10) · plate · unit ·
                receiverName · receiverPhone
ShippingRate    (P6.S4, real seeded collection -- methods themselves are
                a static const, packages/schemas/src/shipping.ts)
                methodCode · zone(tehran|other) · minWeightGram ·
                maxWeightGram? · priceRial (every value a documented
                ESTIMATE pending real courier data, see seed/shipping.ts)
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

# TypeScript (added v1.1, see §2.2 / docs/decisions/0001)
typescript @types/react @types/react-dom @types/node
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

# TypeScript (added v1.1, see §2.2 / docs/decisions/0001)
typescript @types/node @types/express @types/cors @types/compression
@types/cookie-parser tsx   (dev-time TS runner; production runs compiled dist/)
```

### `packages/*`
```
packages/schemas   → zod + typescript only, no build step (consumed as TS source)
packages/config    → eslint + prettier + tailwind preset + typescript
packages/ui        → shared primitives (Phase 4+)
```

### Dev / root
```
turbo
eslint@^9 @eslint/js eslint-plugin-react eslint-plugin-react-hooks
eslint-plugin-tailwindcss eslint-plugin-import
typescript typescript-eslint        (added v1.1, see §2.2 / docs/decisions/0001)
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
| 08 | Shop by vehicle | SEO + navigation | Saipa and Iran Khodro only (ایران‌خودرو، سایپا) — no other makes, no imports. Links to `/vehicle/...` landing pages. |
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

> **v1.3 amendment:** the original turquoise + safety-orange direction below
> is superseded. Replaced with **Steel Blue + Racing Red**, grounded in
> automotive/motorsport color research rather than a Persian-tilework
> reference: blue is the color both Saipa and Iran Khodro (the two domestic
> brands this shop targets, per the owner) use in their own identities, and
> racing red is the universal "speed and excitement" color across
> motorsport and the mechanic/tool trade (Ferrari Rosso Corsa; Snap-on and
> Milwaukee, the tool brands mechanics actually reach for). See
> `docs/decisions/0003-color-palette-steel-and-race.md`. The graphite
> neutral ramp is unchanged — "machined-metal graphite ground" already
> suited the new direction as well as the old one.
>
> **v1.5 amendment:** Racing Red is superseded in turn. On reviewing the
> live landing page, the owner rejected the Steel Blue + Racing Red combo
> as reading like a generic "sport car" palette rather than an auto-parts
> retail one. Steel Blue is kept — it was never the complaint, and stays
> grounded in Saipa/Iran Khodro's own logos — but Racing Red is replaced
> with **Marigold**, a warm gold/amber chosen specifically to avoid both
> red (the actual complaint) and the market's other dominant hue pattern
> (checked against NAPA, AutoZone, and Advance Auto Parts, all
> red/blue/orange-heavy — O'Reilly is the one major chain that broke from
> that pattern, with green). See
> `docs/decisions/0005-color-palette-marigold-cta.md`.

~~Machined-metal graphite ground, Persian turquoise identity, safety-orange commerce.~~ The vernacular is the parts catalog: hairline rules, mono-set reference codes, exploded diagrams. Restraint everywhere except the Exploded View.

~~Turquoise (فیروزه) is the deliberate risk: this market is 90% red/orange/blue, and turquoise is authentically Persian — Isfahan tilework, Neyshabur stone — for a brand called Parsian. It also reads as diagnostic-instrument cyan in an automotive context. Justified twice.~~

### 6.2 Color ramps

**Steel Blue — identity, navigation, system state**
```
50 #EAF1FF   100 #D3E3FF   200 #A8C6FF   300 #7BA6FF   400 #4C86FA
500 #2E6BEF  600 #1E52D6   700 #1A3FA8   800 #16337F   900 #142B63   950 #0A1733
```

**Marigold — money and action ONLY**
```
50 #FDF5E6   100 #FBE8C2   200 #F6D488   300 #EFBC55   400 #E8B032
500 #E2A91D  600 #C28C14   700 #9C6F10   800 #78550C   900 #573D08   950 #362605
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
danger   light #C81E4A  dark #F0527D   (hue ~344°, shifted off Racing Red's ~3-5° on purpose)
info     light #1E52D6  dark #2E6BEF   (aliases the brand ramp directly -- brand is blue now too)
```

### 6.3 The two-accent discipline

| Color | Owns | Never used for |
|---|---|---|
| **Steel Blue** | Links, active nav, focus rings, brand marks, fitment-verified state, selected filters | Any "buy" affordance |
| **Marigold** | Add to cart, checkout, prices, discount badges, low-stock urgency | Navigation, links, decoration |

**Warning rule:** warning chips are *always* outlined + icon-led, never solid fill — so they can never be mistaken for a CTA. This rule now carries more weight than it did under v1.3: `--color-warning` (~40° hue) sits close to Marigold (~42-43° hue), unlike the old red-CTA/amber-warning pair which were never close. Shape (outline vs. solid fill), not hue, is what keeps warning legible as its own thing. **Danger vs. CTA rule:** danger stays shifted toward crimson (~344° hue) — that separation was always from CTA's red, and CTA is no longer red at all, so the two are trivially distinct now.

### 6.4 Contrast-safe pairs (WCAG AA verified)

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#EEF1F4` | `#0E1418` |
| `--surface` | `#FFFFFF` | `#1A222A` |
| `--surface-raised` | `#F7F9FA` | `#242D36` |
| `--text` | `#141B21` | `#E2E7EC` |
| `--text-muted` | `#5C6B78` | `#A8B4BE` |
| `--border` | `#CBD3DA` | `#36414C` |
| `--brand` (text/link) | `#1A3FA8` | `#7BA6FF` |
| `--brand-solid` | `#1E52D6` | `#2E6BEF` |
| `--brand-fg` | `#FFFFFF` | `#FFFFFF` |
| `--cta` | `#E2A91D` | `#E8B032` |
| `--cta-fg` | `#141B21` | `#0E1418` |
| `--focus` | `#2E6BEF` | `#7BA6FF` |

> CTA uses **dark text on Marigold in both themes** (8.21:1 light, 9.45:1 dark) — unlike v1.3's racing red, which was dark enough in light mode for white text (5.31:1) and only needed the dark-text trick after brightening for dark mode, Marigold is bright enough at every step used here that white text fails even in light mode (2.12:1) — verified via real relative-luminance calculation, not eyeballed; see the ADR for the full numbers.

### 6.5 Typography

| Role | Face | License | Used for |
|---|---|---|---|
| **Display** | ~~Morabba~~ **Estedad** | SIL OFL 1.1 | Hero headline, section headings, big numbers |
| **Body / UI** | **Vazirmatn** (variable) | SIL OFL 1.1 | Everything else, Persian + Latin |
| **Data** | **JetBrains Mono** | SIL OFL 1.1 | Part numbers, SKU, OEM codes, VIN, order codes, system codes, admin tables |

> **v1.2 amendment:** Morabba turned out not to be OFL-licensed — it's a
> commercial font owned by fontiran.com, license required. Replaced with
> **Estedad**, which this document's own v1.0 text already named as the
> fallback for a different reason ("if Morabba's weight coverage
> disappoints in testing"). See `docs/decisions/0002-morabba-not-ofl-use-estedad.md`.
> Estedad Black stands in for the old "Morabba 700" slots (display-1,
> display-2); Estedad Bold stands in for the old "Morabba 600" slot (h1),
> preserving the original weight hierarchy (900 > 700, same relation as the
> old 700 > 600).

Verify the OFL file ships in the repo for each face before P1.S3 passes.

**Mono is not decoration.** Part numbers *are* the vernacular of this industry. Setting `MB-0442-K` in mono inside a hairline box is how a real parts catalog behaves.

**Self-host all fonts.** No Google Fonts CDN — it is unreliable from Iran. `next/font/local`, WOFF2, subset to Arabic + Latin + Persian digits, `font-display: swap`, preload only the two weights used above the fold.

**Type scale** (1.25 ratio, `clamp()` for fluid):
```
display-1  clamp(2.5rem, 6vw, 4.5rem)   Estedad 900   line-height 1.1  ls -0.02em
display-2  clamp(2rem, 4.5vw, 3rem)     Estedad 900   1.15
h1         clamp(1.75rem, 3vw, 2.25rem) Estedad 700   1.25
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

> **Reaffirmed directly by the owner, 2026-07-30 (mid-Phase-7):** the business will not sell in English. Real English translation work is deferred to a future, lowest-priority backlog item — not scheduled into any phase (§16). From this point forward, new steps ship **Persian-only**: `messages/en.json` is not required to stay in lockstep with `fa.json`, and no step's own verification needs to check the `en` locale. The `next-intl`/`en` routing infrastructure itself stays in place (removing it would be a bigger, unrequested structural change) — `en.json` simply stops being actively maintained until English support is picked up for real. This corrects course back toward this section's own original intent (`en` was always meant to be scaffolding, not a maintained second locale, in Phase 1–7) — several steps in Phases 5–7 had drifted into fully translating every new string into real English, going beyond what was ever actually required.

### 7.1 Setup
- `next-intl` with `localePrefix: 'as-needed'` — `fa` is unprefixed (`/`), `en` is prefixed (`/en/...`).
- `<html lang="fa" dir="rtl">`, flipped to `lang="en" dir="ltr"` for the `en` locale.
- Messages: `apps/web/messages/fa.json`, `en.json`. Namespaced by route.
- `en.json` exists from P1.S4 with the same key set as of that step (values may be English placeholders). **As of 2026-07-30, `en.json` is no longer required to track new `fa.json` keys** — see the callout above.

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

**Adapters, not integrations.** `PaymentProvider`, `SmsProvider`, `StorageProvider`, `SearchProvider` are interfaces with a `mock` implementation shipped first. Real gateways plug in behind them. This lets Phases 2–8 run with zero external accounts. `PAYMENT_PROVIDER`/`ZARINPAL_MERCHANT_ID`/`ZARINPAL_SANDBOX` above were documented here since early on but only actually parsed by `config/env.ts` as of P6.S3 — same lag `SMS_PROVIDER`'s own Kavenegar keys had between §4's manifest and P2.S4 actually wiring them up.

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
| **P2.S6** | Vehicle models + **seed data: Saipa and Iran Khodro only** (ایران‌خودرو، سایپا) — full model/generation/year-range coverage for both, no other domestic makes, no imports |
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
| **P3.S7** | Seed script: ≥ 300 realistic products across ≥ 8 categories, ≥ 15 brands, with **real fitment data** for Saipa and Iran Khodro vehicles (the shop's only supported makes, per P2.S6). Persian names, plausible Rial prices. |

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
*Goal: every page a shopper actually needs to find, evaluate, and decide to buy a part — cart is the last piece, checkout is Phase 6.*

Executing incrementally (owner's explicit choice at kickoff: "one piece at a time," not a single upfront spec for the whole phase). Each row below is real once its step lands — P5.S1–S2 are backfilled from what actually shipped; P5.S3–S8 are drafted ahead of time so the same "re-spec before execution" discipline (§16) applies to the rest of the phase, but expect these to be adjusted at the start of their own step, same as every prior phase's table turned out to need small corrections once work started.

| Step | Deliverable | DoD / notes |
|---|---|---|
| **P5.S1** ✅ | **Category/PLP** at `/c/[slug]`. Filter bar: brand, price range, in-stock, attribute facets (all with live counts via an "OR-facet" pattern — see §17), subcategory nav, "fits my garage vehicle" toggle (on by default when a vehicle is active, using the existing `vehicle=` hard filter). Sort (newest/price asc/desc). Cursor-paginated grid with "load more." | Real backend extension: `/catalog/facets` grew attribute buckets (deferred in P3, closed here since real attributed products now exist) and category/brand/price/attribute/vehicle scoping shared with the product-list filter via one `productFilter.ts` (previously duplicated). Shipped: commit `a439540`. 306/306 tests, axe 0, 131KB route JS (160KB budget). |
| **P5.S2** ✅ | **PDP** at `/p/[slug]`. Gallery (honest no-photo placeholder — no product media exists in seed data yet), price/stock, fitment banner (client, active garage vehicle → `/fitment/check`), full authenticity panel, specs table, OEM/cross-reference table, related products. | Q&A and reviews (named in this phase's original one-liner) explicitly deferred — no Review/Question model exists (that's Phase 7/8), asked the owner rather than building an empty-state stand-in. Real backend extension: `getProductDetailBySlug` resolves brand/category (Product only stores their ids) and attribute display labels (same gap as P5.S1's facets, same fix). Shipped: commit `b6c8e37`. 311/311 tests, axe 0, 128KB route JS (170KB budget). |
| **P5.S3** ✅ | **Search results** at `/search?q=`. The header's search form already submitted here (`action="/search"`, `name="q"`) and 404'd until this step. Results grid over the existing `GET /catalog/search` (page/limit pagination, plain prev/next links — real progressive enhancement, no client JS needed for pagination or the search box itself), empty state with a real hint (check spelling / try a system name), no-query prompt state. No live autocomplete in this pass, per plan. | **Real, significant pre-existing bug found and fixed, not a new feature bug**: every one of the 320 seeded products had an *empty* `searchText` field — `seed/catalog.ts` upserts via `findOneAndUpdate` (query middleware), which never triggers `Product`'s `pre("save")` hook (document middleware) that computes `searchText`. Both the `$text` and substring-regex legs of `MongoSearchProvider` depend on it, so search against the real catalog has been silently non-functional since P3.S7 — invisible to P3.S4's unit tests (they use `.create()`, which does fire the hook). Fixed at the root (`computeProductSearchText()` extracted and called explicitly in the seed script) plus a real backfill (re-ran `seed:catalog` against the dev DB — "ترمز" went from 0 to 36 real matches) — see §17 for the general Mongoose lesson. Shipped: commit pending. 312+/312+ tests (incl. 2 new regression tests), axe 0, 111KB route JS. |
| **P5.S4** | **Brand pages** at `/brand/[slug]`. Reuses the PLP's filter-bar/grid machinery scoped to one brand instead of one category (`GET /catalog/brands/:slug` already exists; product list already accepts `?brand=`) — this is much closer to "P5.S1 with the fixed dimension swapped" than new surface area. Brand story block (name, country, isOEM badge) using data the Brand model already has. | Decide during this step: does a brand page need its own facet set (category/price/attributes within that brand), or is a simple filtered grid enough for v1? Don't guess — the PLP's facet bar is reusable either way, the question is just how much of it to expose here. |
| **P5.S5** | **Vehicle landing pages** at `/vehicle/[make]/[model]/[gen]`. Per §10 SEO rules, "treat as products, not filters" — real per-vehicle content (which systems have parts today, real part counts, not a bare filtered list), canonical/JSON-LD, and a link into the PLP pre-filtered to that vehicle (`?v=`). This is the primary organic-traffic surface (§10) — worth real content investment, not a thin wrapper. | Needs a decision: generate these pages for every make/model/gen combination in the vehicle tree (2 makes × 23 models × 31 generations = up to 31 static pages today), or only for combinations with real product coverage (avoids a thin/empty SEO page ranking for nothing)? Lean toward the latter — ties to the Fitment Manager's future "coverage report" (§3.7) as the same underlying signal. |
| **P5.S6** | **Compare** (up to 4 parts). Needs a decision on state: URL-encoded product-id list (shareable, no auth needed, consistent with how the Garage's `?v=` already works) vs. a Zustand store (simpler, not shareable). Spec sheet reuses the PDP's `SpecsTable`/`OemTable` components side by side. | No backend work needed — this is pure frontend composition over data every relevant endpoint already returns. |
| **P5.S7** ✅ | **Wishlist** (storefront half — save/unsave on `ProductCard`/PDP) plus, as a real scope expansion decided with the owner at step start, a minimal `/auth/login` page. `Wishlist` is a dedicated Mongoose collection (unique `{userId,productId}` index), not an embedded array on `User` — matches the `Fitment`/`StockReservation` dedicated-collection precedent, not `addresses`/`garage`. `GET/POST/DELETE /me/wishlist` behind `requireAuth`, no `auditLog` (that middleware is an admin-write-only convention, confirmed by reading every real call site — a customer's own save/unsave isn't one). | **Two real decisions made with the owner, not guessed**: (1) **Wishlist is auth-only** — no guest/cookie identity; the Garage's guest-cookie pattern turned out to have zero server-side sync to actually reuse. (2) **A minimal `/auth/login` page ships as part of this step**, not deferred — three parallel research agents confirmed a genuine, previously-unscheduled gap: `/auth/login` was listed in §3.1's route map but never assigned to any phase step, and no client-side "am I signed in" state existed anywhere in `apps/web`, despite P2.S4's phone-OTP backend being complete and idle. Shipping wishlist without it would have meant a feature nobody could actually reach. Backend needed zero changes (P2.S4's `/auth/otp/*`, `/auth/me`, `/auth/refresh`, `/auth/logout` already existed) — this was a frontend-only addition: `stores/auth-store.ts` (in-memory, rehydrated from `GET /auth/me` on load, never persisted — session truth stays server-side in the httpOnly cookies), `components/auth/LoginForm.tsx`, header wiring. This also unblocks Cart's (P5.S8) own auth path and Phase 7's account dashboard. `stores/wishlist-store.ts` mirrors the same "authoritative-server-state, always refetched" approach — one shared `GET /me/wishlist` call seeds every `WishlistButton`'s initial state instead of one fetch per card. Verified live end-to-end with a real OTP round trip (`MockSmsProvider` logs the code — no test-retrieval endpoint exists, reading the log is the actual mechanism): logged-out click → `/auth/login?next=`, verify, toggle, **reload-persists** (proves real server state), sign-out clears it. axe 0 violations (PDP/PLP/login, light/dark/mobile/fa/en). Real API-down smoke test on the production build still serves graceful 200s. 320/320 tests (6 new). Route budgets: PLP 133KB/160KB, PDP 131KB/170KB, new `/auth/login` 136KB (no established budget, stayed lean regardless). Shipped: commit `0905485`. |
| **P5.S8** ✅ | **Cart** (persistent, guest + auth merge, per this phase's own original scope). `Cart` model matches §3.2 exactly: `userId? · anonId? · items[{productId,qty,priceRialSnapshot}] · couponCode? · expiresAt`, dedicated collection (not embedded on `User`, same precedent as `Wishlist`/`Fitment`), sparse-unique on both `userId` and `anonId` (a cart has exactly one, never both/neither), TTL on `expiresAt` refreshed on every mutation. Guest identity reuses P5.S7's cookie pattern directly: a new `optionalAuth` middleware (`middleware/auth.ts`) populates `req.user` when a valid `accessToken` cookie is present but never rejects the request when it's absent/invalid — the first requirement in the codebase for a route that must work for a real guest. `GET/POST /cart`, `PATCH/DELETE /cart/items/:id`, all under `optionalAuth`, no `auditLog` (self-service action, same convention as wishlist). Coupon apply/remove **not built** — `couponCode` field exists per the model spec but no `Coupon` model exists yet (Phase 6 scope); out of scope for this step, not a gap. | **Real correctness work, not just CRUD**: (1) guest→auth merge (`mergeGuestCartIntoUser`) runs lazily on the first authenticated `GET /cart` after login — `findOneAndDelete` on the guest cart makes the read-and-clear atomic, so two concurrent triggers (e.g. two tabs) can't double-count; summing quantities when the same product exists in both carts, not overwriting. (2) `incrementOrPushItem` is one atomic `findOneAndUpdate` either way (increment existing line or push a new one) instead of a load-mutate-save round trip, closing a real race a plan-review pass caught (a just-logged-in client's own concurrent `addItem` could race the merge). (3) **Money/stock discipline honored, not assumed**: every cart total is computed from live `Product.priceRial` at read time, never the stored `priceRialSnapshot` (used only to flag "price changed since you added this" in the UI) — matches §3.6. Live stock re-validation surfaces `stockOk`/`availableQty` in the read-time view only; the stored qty is never silently clamped, the shopper sees the problem and decides. Stock reservation is correctly **not** part of this step (activates at Phase 6 checkout initiation, per this row's original scope). Frontend: `stores/cart-store.ts` (Zustand, always re-fetched from the server, same "authoritative-server-state" philosophy as auth/wishlist, never persisted client-side), `CartSession` mounted once in the `(shop)` layout, `AddToCartForm` on the PDP, a real cart page at `/cart` (qty stepper, remove, stock/price-changed inline warnings, subtotal, "continue to checkout" stub link since Phase 6 doesn't exist yet), and a header badge showing live item count. `LoginForm`/sign-out both force a cart refetch so the badge never shows a stale pre-login or post-logout cart. Verified live (Playwright): full guest add→qty-change→remove→empty-state cycle, axe 0 violations across PDP/cart light/dark/mobile/en/fa, RTL/LTR `dir` attribute correct both locales, guest `anonId` cookie confirmed set. Real API-down smoke test on a fresh production build (`next build && next start` with the API process killed): PDP and cart both still serve a graceful 200, cart degrades to its honest empty state rather than crashing. 329/329 tests (12 new, incl. 2 dedicated guest→auth merge scenarios). Route budgets: PDP unchanged at 133KB/170KB, new `/cart` route 136KB (no established budget for this route, stayed lean regardless). |

**GATE 5 → 6: cleared.** Cart works end-to-end (guest and authenticated, live stock re-validation confirmed); coupon apply/remove correctly deferred to Phase 6 (no `Coupon` model exists yet, not a gap in this step). §15 Q3/Q5/Q8 (e-Namad/legal status, payment gateway choice, B2B pricing tiers) answered with the owner directly — see §15's updated status column and the Phase 6 callout below for what changes as a result.

### PHASE 6 — Checkout, payments, orders
3-step checkout · address book with province→city cascade · shipping zones & rates · `PaymentProvider` interface + Mock + **Zarinpal** sandbox (owner's explicit choice, §15 Q5) · server-side verification · stock reservation & release · order state machine · order confirmation & tracking · SMS notifications · invoice PDF.

> **Phase 6 external blocker, confirmed still open:** e-Namad/legal-entity paperwork has **not been started** (asked the owner directly at the end of P5.S8, per §15 Q3's own instruction to ask before this step wraps). A live Iranian payment gateway cannot go live without it. Development proceeds on `mock` + Zarinpal sandbox regardless — this only blocks flipping a *real* gateway live, not this phase's build-out.

Phase 6's checkout/payments/orders scope above is still directionally locked, to be re-specced when its own turn comes (§16). One step ahead of it is real and shipped:

| Step | Deliverable | DoD / notes |
|---|---|---|
| **P6.S1** ✅ | **B2B wholesale pricing.** Owner-confirmed real miss against §3.2's original Phase-3 requirement (see §15 Q8, `docs/decisions/0007-...md`) — added as a proper schema migration, not a silent bolt-on. Account-type-based (owner's choice, not quantity tiers): a verified wholesale account sees a lower price on every product, always. `User.accountType` (`retail`\|`wholesale`, separate from `role` — a wholesale customer is still `role: "customer"`) embedded in the JWT access-token payload, same pattern `role` already uses. `Product.wholesalePriceRial?` is `select: false` (same defense-in-depth as `User.passwordHash`) — never present on a query result unless explicitly opted into, and never spread into an API response raw. One shared resolution point, `modules/catalog/pricing.ts`'s `resolveEffectivePriceRial`/`toPublicProductJson`, used by every product-serving read path (PLP, PDP, related, search, cart) instead of reimplementing the wholesale/retail branch four times — strips the raw field, overrides `priceRial` with the resolved price, sets a server-computed `isWholesalePrice` flag, and drops `compareAtRial` for wholesale viewers (two unrelated "was" concepts, showing both would read as a real but wrong discount stack). | No admin CRUD UI exists yet for products at all (confirmed — only `seed/catalog.ts` had ever written `priceRial`) — owner's explicit choice: **seed/script only for now**, real admin CRUD stays Phase 8 scope. New `scripts/setAccountType.ts` (`pnpm --filter api set-account-type <phone> retail\|wholesale`) is the sanctioned "admin manually flags an account" mechanism — no self-service wholesale-application flow (owner's choice). **A real, load-bearing bug caught only by live browser verification, not by the automated test suite**: PDP/PLP/search are Server Components using a plain server-side `fetch()` — which has no browser cookie jar to attach automatically, unlike a client-side `fetch` with `credentials:"include"`. Without forwarding the incoming request's own cookies explicitly (`(await cookies()).toString()` from `next/headers`, threaded into `lib/fetchers/catalog.ts`'s product-returning functions), a real signed-in wholesale customer would silently see the retail price on every page except cart (whose client-side fetches already carried cookies correctly) — invisible to integration tests, which hit the API directly with an explicit cookie header, never through a real Next.js SSR request. Caught by an actual Playwright run against the live dev server with a real signed-in session, not just curl. **Also fixed in passing, a real pre-existing a11y bug the same live axe run surfaced**: Header.tsx's signed-in account icon used `aria-label` on a bare `<span>` with no ARIA role (axe: `aria-prohibited-attr`) — added `role="img"`, the same class of fix P4.S2 already established for this exact aria-label/no-role pattern. PLP/search sort-by-price and price-range filters intentionally keep operating on the plain retail `priceRial` field, not a tier-aware computed one — rearchitecting the shared `cursorPaginate`/`buildProductFilter` infrastructure into an aggregation pipeline was judged too much risk to already-tested shared infra for a first pass; documented as an accepted limitation, not asked about (a technical tradeoff, not a business-model question). Verified live: a real wholesale account (flagged via the real script, not a shortcut) sees the resolved wholesale price + badge on PDP/PLP/cart, in both locales/themes/mobile, with 0 axe violations; a retail account and a guest both see retail with no badge; the raw `wholesalePriceRial` field never appears in any response body regardless of viewer (grepped, not assumed). Real API-down smoke test on a fresh production build still serves graceful 200s on every affected route. 345/345 tests (16 new). Route budgets unchanged (PDP 133KB/170KB, `/cart` 136KB). |
| **P6.S2** ✅ | **Address book (backend).** Owner picked this as the first "one piece at a time" slice of Phase 6 — checkout needs a real shipping address, and `User.addresses` had sat as dead schema (`[]` always, zero routes) since it was declared. Real `/me/addresses` CRUD (`GET/POST/PATCH/DELETE`), `requireAuth`-gated (never `optionalAuth` — matches the owner's own "checkout is auth-only, no guest checkout" decision, made explicitly for this step, dropping `Order.guestPhone?` from the original §3.2 spec). `Address.province`/`city` migrated from plain strings to real `provinceId`/`cityId` ObjectId refs (owner's explicit choice) — reuses the existing `/geo/provinces`/`/geo/cities?provinceId` cascade endpoints (P2.S7) directly instead of persisting disconnected display names; safe migration since no route had ever written an address. Hydrates province/city names via a separate query, never `.populate()` (same convention as every other module). `createAddress`/`updateAddress` both validate that `cityId` genuinely belongs to `provinceId` before writing, not just that it's a well-formed ObjectId — a mismatched pair would silently produce a nonsense shipping address otherwise. New `packages/schemas/src/fa.ts`'s `normalizePostalCode` (same §7.5 shape as `normalizePhone`). | **Scope call made by checking an actual precedent, not guessed**: no dedicated frontend page ships this step. Wishlist (P5.S7) has no "my wishlist" list page either — only the save/unsave toggle on product cards — and masterPlan.md already lists both "wishlist" and "addresses" under Phase 7 (User dashboard). `/geo/provinces`/`/geo/cities` (P2.S7) are themselves still zero-consumer API-only infrastructure today, same as `StockReservation` (P3.S6) — this codebase already has an established, comfortable pattern of shipping backend infrastructure ahead of the UI that consumes it later. Verified via a full integration-test suite (list/create/update/delete, the province↔city referential-integrity check, a malformed-postal-code rejection *and* a valid Persian-digit postal code correctly normalizing and succeeding, cross-user 404 isolation, 401s with no session) plus a live `curl` pass against the real running dev API with real seeded geo data. **A real MongoDB behavior caught only by live debugging, not assumed**: `$pull` on an embedded array reports `modifiedCount: 1` even when it matches zero elements (the array path is still "touched") — `deleteAddress`'s not-idempotent 404 check had to move from `modifiedCount` to `matchedCount` on a filter that requires `"addresses._id": addressId`, the same pattern `updateAddress` already used, once a debug script proved the naive check silently returned 200 on a repeat delete. 355/355 tests (10 new — no `apps/web` changes, so no route-budget/axe pass this step). |
| **P6.S3** ✅ | **`PaymentProvider` interface + Mock + Zarinpal sandbox.** Owner picked this as the next Phase 6 piece, explicitly because it's self-contained (doesn't need Order/Shipping to exist first) and matches §17's own "provider interfaces get a mock first, always" rule — `SmsProvider` (P2.S4) is the exact precedent mirrored. Provider-only scope, deliberately: the `Payment` model (§3.2) and real `/payments/*` routes belong with whichever future step builds Order + checkout initiation, since a `Payment` record's whole point is to be attached to a real `Order`. `initiate()`/`verify()` against the real Zarinpal v4 REST API (`POST /pg/v4/payment/request.json`, `POST /pg/v4/payment/verify.json`, redirect via `/pg/StartPay/{authority}`), verified against Zarinpal's own current documentation rather than assumed from memory — `currency: "IRR"` always sent explicitly (never left to the gateway's own default) to protect this codebase's Rial-only money discipline (CLAUDE.md rule 8) from a possible 10x ambiguous-currency error. `code: 101` ("already verified") is treated as a real success alongside `100`, not an error — a legitimate outcome for a duplicate callback/webhook. A business-level decline (HTTP call succeeded, but Zarinpal's own code says the payment failed) returns `{success:false}` rather than throwing — verify is inherently a "check the outcome" call, not a transport operation. `MockPaymentProvider`'s `initiate()` returns a `redirectUrl` pointing straight back at the caller's own callback with a pre-appended successful `Status=OK`, simulating an instant-approve gateway so local dev/tests can exercise the whole round trip with zero network calls — same spirit as `MockSmsProvider` surfacing the OTP code directly instead of sending a real SMS. New `env.ts` entries `PAYMENT_PROVIDER`/`ZARINPAL_MERCHANT_ID`/`ZARINPAL_SANDBOX` (previously documented in `.env.example` only, never actually parsed). | **A real Zod footgun caught before it shipped, not after**: `z.coerce.boolean()` — the naive choice for `ZARINPAL_SANDBOX` — treats `Boolean("false")` as `true` in JavaScript, so it would have silently treated `ZARINPAL_SANDBOX=false` as sandbox-on regardless of the actual env value. Used an explicit `z.enum(["true","false"]).transform(...)` instead — flagged in §17 as a new pattern, not yet an established one, since this file had zero boolean env vars before this step. **A real environment limitation hit during verification, stated plainly rather than faked**: this step's own plan called for one live round trip against Zarinpal's real sandbox (which documents accepting any arbitrary UUID as a test `merchant_id` — a real, sanctioned mechanism, not a workaround) to confirm the coded request/response shapes match the live API today. The Bash tool's shell in this environment has **no outbound internet access at all** — confirmed by `curl https://www.google.com` itself timing out, not something specific to Zarinpal — so no live network call was possible from here. Verification instead rests on: the request/response shapes were independently confirmed against Zarinpal's own current documentation via a separate fetch path (not assumed from training data), plus a full mocked-`fetch` unit-test suite (`vi.stubGlobal`, same pattern `KavenegarProvider.test.ts` already established) asserting the exact request body/headers/URL sent and exact response parsing for every branch (success, already-verified, business decline, transport failure). Matches this project's own established honesty precedent for an unavailable verification tool (P4.S8's VoiceOver-on-Windows substitution) — state the real constraint, use the best available substitute, don't claim a test that didn't happen. 367/367 tests (12 new). No `apps/web` changes, no routes yet — nothing to route/browser-test this step. |
| **P6.S4** ✅ | **Shipping zones & rates.** Owner explicitly chose to build this before checkout initiation (asked directly, not assumed) so a real order total never ships with a `shippingRial: 0` placeholder. §3.6's exact 5 named couriers — **پست پیشتاز · تیپاکس · چاپار · پیک درون‌شهری · حضوری** — "Zone + weight based." `/admin/shipping` ("methods & zones") is named Phase 8 admin scope, the same chicken-and-egg gap P6.S1 already hit and resolved the same way: seed/script for now. **Methods are a static const** (`packages/schemas/src/shipping.ts`'s `SHIPPING_METHODS`), mirroring `CATALOG_SYSTEMS`'s own precedent — a fixed taxonomy, no admin CRUD consumer yet. **"حضوری" (in-person pickup) is deliberately not included as an active method** — no real pickup location exists yet, an availability fact (not a business judgment call), same reasoning P4.S4's best-sellers section used for a similarly missing real signal; add it once a real address exists to list. **Zones are 2** (`tehran`/`other`), resolved from `Province.slug` with a plain function, not a new `Province.zone` field — only Tehran is actually distinct in real Iranian courier pricing, so a schema migration on an already-shipped, already-seeded model wasn't justified. **Rates are a real seeded `ShippingRate` collection** (unlike the static methods) since these Rial amounts will need real updates before Phase 8's admin UI exists — same reasoning `Province`/`City` are real collections while `CATALOG_SYSTEMS` is a fixed const. New `POST /cart/estimate-shipping` (exact path already named in §9) added directly to the *existing* `cartRouter` (one router per mount point, not a second router mounted at the same prefix), with `requireAuth` stacked on this one route specifically (`cartRouter` itself stays `optionalAuth`) since checkout is auth-only and an estimate needs one of the caller's own real addresses (P6.S2) to resolve a zone from. Weight resolved via a separate query against live `Product.weightGram` (not added to Cart's own public DTO — it doesn't need it). | **Real money, asked about directly, not guessed**: shipping rates are real Rial amounts a customer would be charged — the owner confirmed seeding reasonable, clearly-flagged **estimated** rates for now (a live web search for exact current Iranian courier tariff tables didn't return usable precise figures), adjustable later via Phase 8's admin UI or a reseed once real courier contracts/pricing exist — every `priceRial` in `seed/shipping.ts` is commented as an estimate, not presented as real pricing. Verified live: a real Tehran address correctly includes `intracity` and prices the Tehran-zone bracket; a real non-Tehran address correctly excludes `intracity` and prices the "other"-zone bracket; the weight-bracket boundary is picked correctly as cart weight crosses it. 401 with no session, 400 for an empty cart, 400 for an address belonging to a different user. `seed/shipping.ts` is idempotent (same precedent every prior seed script's own test already established). 375/375 tests (8 new). No `apps/web` changes this step — same "backend infra ahead of its UI consumer" pattern as P6.S2/P6.S3; the future checkout UI step is this endpoint's real first consumer. |
| **P6.S5** ✅ | **Order + checkout initiation (backend only).** Owner made three real scope calls before any code was written, not guessed: (1) **backend only** — the real `/checkout` frontend page is a separate future step, same "backend infra ahead of its UI consumer" pattern P6.S2/P6.S3/P6.S4 already established; (2) **gateway payment only** — §3.6 also lists pay-on-delivery and wallet, but wallet has no model anywhere and would be its own real feature, not a checkout-step afterthought; (3) **coupons stay out** — `Cart.couponCode?` is unused, `Order.discountRial` stays `0`, since no admin CRUD exists yet to actually issue a coupon code (the same gap P6.S1 hit for wholesale pricing). `Order`/`Payment` models built per §3.2, with `Order.userId` now required and `guestPhone?` dropped entirely — P6.S2's own auth-only checkout decision applied here, not re-asked. New `POST /checkout/initiate` (`requireAuth`, its own router) validates the live cart (empty-cart and per-line `stockOk` both checked up front), snapshots the caller's chosen address (`addressesService.getOwnAddress`, new) and shipping method (reuses `shippingService.estimateShipping` directly rather than re-deriving zone/weight logic), reserves stock per line via P3.S6's existing `reserveStock`/`releaseReservation` (two new batch helpers, `releaseReservationsByRefId`/`confirmReservationsByRefId`, added to `modules/inventory` so checkout/payments never reach into `StockReservationModel` directly), generates a human order code (`PS-<Jalali year>-<5-digit random>`, uniqueness-checked with a retry loop rather than a dedicated counter collection), and calls the existing `PaymentProvider.initiate()` (P6.S3) — rolling back every reservation plus the just-created Order/Payment rows if the gateway call itself fails. New `GET /payments/callback` (no auth — the gateway's own browser redirect target, not a client-called resource; the Authority token is the real trust boundary, matched against the specific `Payment` row it was issued for) calls `PaymentProvider.verify()` as the one authoritative check, confirms reservations and clears the cart on success, releases them and cancels the order on failure, and is idempotent against a repeat callback for the same payment. | **A real, deliberate design choice worth remembering for future gateway-callback work**: a `Status=NOK` query param (Zarinpal's own "payer explicitly cancelled" signal) short-circuits straight to a failed outcome *without* calling `verify()` — both because that's the documented real-world Zarinpal convention (no legitimate transaction exists yet to verify) and because it's the only way to exercise a real "failed" branch in tests at all: `MockPaymentProvider.verify()` never simulates failure (same simplicity precedent `MockSmsProvider` already set), so a Status-based short-circuit was the honest way to get deterministic coverage of the failure path rather than skipping it or faking a mock failure mode that doesn't reflect the real interface's own established behavior. **A real test-environment seam, not a product bug**: `MockPaymentProvider`'s `redirectUrl` is built from `env.PUBLIC_URL` (correct in production, the API's own real address), but the test server binds an ephemeral port specifically so parallel test files never collide — the test replays the same path+query against its own real `baseUrl` instead of literally fetching the returned URL, a test-harness concern, not something the product code should special-case for. 385/385 tests (10 new). No `apps/web` changes this step. |
| **P6.S6** ✅ | **Checkout frontend.** The real `/checkout` page P6.S5 deferred. Two real gaps surfaced once frontend work actually started, not just wiring a UI to already-built endpoints: (1) **no address-book UI existed anywhere** (`apps/web` had zero consumer of P6.S2's `/me/addresses`) — built a minimal inline `AddressPicker` (radio-select existing addresses + a collapsible add-new form with a real province→city cascade, mirroring `VehicleSelector.tsx`'s TanStack Query dependent-query pattern from P4.S3) directly on the checkout page, deliberately **not** a standalone "my addresses" management page — matches the same scope precedent Wishlist/Addresses already established (full CRUD dashboards stay Phase 7 scope); (2) **`GET /payments/callback` was the API's own JSON endpoint** — a real gateway would have redirected the shopper's actual browser onto raw JSON. Fixed by changing `checkout.service.ts`'s `buildPaymentResultUrl` to point the payment provider's `callbackUrl` at a new `/checkout/result` **web** page instead (reusing `env.CORS_ORIGINS[0]` as "the web app's own origin" — no new env var), whose client JS (`PaymentResultContent.tsx`) is the one that now calls the unchanged `GET /payments/callback` via `fetch` to actually finalize the payment. `ShippingPicker`/`CheckoutSummary` round out the flow; `CheckoutPageContent` orchestrates all three plus a client-side auth gate (redirects to `/auth/login?next=/checkout` off the existing `useAuthStore` status, matching P5.S7's own precedent) and submits via `window.location.href = redirectUrl` (a real cross-origin navigation, not `router.push`). New `packages/schemas/src/geo.ts` — the first real Zod DTOs for `/geo/provinces`/`/geo/cities` (P2.S7), zero-consumer until this step. | **Two real pre-existing bugs found via live verification, unrelated to this step's own code, fixed anyway rather than worked around**: `Auth.login.codeHelper` and `Cart.stockIssue` both embed a literal `{placeholder}` meant for a manual client-side `.replace()` (LoginForm.tsx/CartPageContent.tsx), not next-intl's own ICU interpolation — calling `t()` for either with no argument supplied throws `FORMATTING_ERROR` on a genuine SSR request. Silently never caught before now because both routes are normally reached via client-side `<Link>` navigation (no fresh server render); a Playwright `page.goto()` full navigation is what actually exercises it. Fixed with ICU single-quote escaping (`'{phone}'`/`'{count}'`) — the exact same displayed text, just no longer parsed as an unfilled interpolation site. Grepped the rest of `apps/web` for the same `.replace("{...` pattern to confirm no third instance exists. **A real design decision, not an oversight**: `AddressPicker`'s selected-row markup started as a `<label>` wrapping `Radio`'s own internal `<label>` — caught before shipping (nested `<label>` elements are invalid HTML and an a11y footgun, the same class of issue P4.S2 already hit once with `role="img"` vs. a bare interactive wrapper) — fixed by dropping the outer `<label>` for a plain `<div>` and passing the full row text as `Radio`'s own `label` prop instead. Verified live (Playwright, ad hoc `e2e/_verify-checkout.spec.ts` + a throwaway seed script, both deleted after passing — same established pattern as P5.S8's `_verify-cart.spec.ts`): the full happy path (add to cart → new address → shipping selection → place order → mock-gateway round trip → result page shows the real order code → cart genuinely cleared afterward), an unauthenticated visit correctly redirects to `/auth/login?next=/checkout`, axe 0 violations light/dark/mobile/fa/en, and a fresh production build's API-down smoke test still serves graceful 200s on both new routes. 385/385 backend tests (only `checkout.routes.test.ts`'s own callback-URL assertions updated for the new redirect target — no new backend surface this step, so no new backend tests). `/checkout` route: 148KB First Load JS (no established §10 budget for this route yet). |
| **P6.S7** ✅ | **Coupons — the last piece of Phase 6.** New `Coupon` model (§3.2) and a shared, cart-agnostic `modules/coupons/coupon.service.ts` (`findCouponByCode`, `computeDiscountRial`, `validateCoupon`, `incrementCouponUsage`) — used by both the new `POST/DELETE /cart/coupon` routes and `checkout.service.ts`, so discount validation/math lives in exactly one place, never duplicated. `Cart.couponCode` (declared since P5.S8's own model, unused until now) is re-validated **live** on every `cart.service.ts` `getCart()` call against the cart's own current subtotal — never cached/trusted — and, if it stops applying (expired, exhausted, subtotal dropped below the minimum), stays attached with a soft `couponIssue` hint rather than being auto-cleared, so it can self-heal if conditions change again (e.g., the shopper adds more items). `checkout.service.ts` doesn't re-derive the discount separately — it already gets a freshly re-validated `discountRial`/`couponCode` from its own `cartService.getCart({userId}, ...)` call (real `perUserLimit` enforcement included, since checkout always has a real `userId`), snapshotted onto the `Order` the same way `nameSnapshot`/`skuSnapshot` already are. `Coupon.usedCount` increments only in `modules/payments`' success branch (never for a pending or cancelled attempt) — kept in exact lockstep with `validateCoupon`'s own `perUserLimit` check, which counts the identical set of "real redemption" order statuses. Coupon creation is `pnpm --filter api create-coupon` (a script, same "no admin CRUD UI exists yet" precedent P6.S1 already established for wholesale accounts — stays Phase 8 scope). | **A real a11y bug caught via live verification, not shipped and forgotten**: the discount row's `text-success` green failed WCAG AA at this text size (2.9:1, needs 4.5:1) — the *exact same bug class* already documented and fixed once in `ProductCard.tsx` (P5.S1's in-stock/out-of-stock label). Fixed the identical way: dropped the color entirely rather than hunting for an unverified darker green, since the leading minus sign already conveys "this is a discount" without needing color at all. **A real design call, not asked about (a technical tradeoff, not a business one)**: a fixed-type coupon's discount is capped at the cart's own subtotal (`Math.min(coupon.value, subtotalRial)`) so a discount can never make a cart total go negative; a percent-type coupon is additionally capped by `maxDiscountRial` when set. Verified live (Playwright, ad hoc `e2e/_verify-coupon.spec.ts` + a throwaway seed script, both deleted after passing): applying a real coupon on `/cart` shows the discount immediately, the same discount carries through to `/checkout`'s own summary, removing it restores the original total, an unknown code surfaces a real inline error (not a crash), axe 0 violations light/dark on `/cart` with a coupon applied, and a fresh production build's API-down smoke test still serves graceful 200s on both `/cart` and `/checkout`. 394/394 backend tests (9 new: apply/remove/min-subtotal/expired/percent-capped/fixed-capped/usage-limit/per-user-limit at the cart level, plus checkout-initiate-snapshots-the-discount and usedCount-only-increments-on-real-payment-success at the integration level). No new route budgets (`/cart` 136KB, `/checkout` 148KB, both effectively unchanged from P6.S6). **Phase 6 (checkout/payments/orders) is now complete** — every piece named in its own directional-lock scope has shipped; wallet (confirmed Phase 7 dashboard scope per §1.1's own overview line) and pay-on-delivery (deferred at P6.S5's own kickoff, owner's explicit choice) remain open by design. |

### PHASE 7 — User dashboard
Overview · orders + timeline tracking · **My Garage** (add/edit/remove/set-active, fitment shortcuts) · addresses · wishlist · wallet · reviews · support tickets · profile · notification preferences.

Phase 7's scope above is still directionally locked, to be re-specced when each piece's own turn comes (§16), run the same "one piece at a time" way as Phase 5/6. One step ahead of it is real and shipped:

| Step | Deliverable | DoD / notes |
|---|---|---|
| **P7.S1** ✅ | **My Orders — order history + status timeline.** Owner picked this as the first Phase 7 piece (asked via a scoped question over address book/wishlist/garage pages) — the most urgent gap right after Phase 6: a shopper who just paid through checkout had no way to ever see that order again. New `GET /me/orders` (paginated summary list) and `GET /me/orders/:code` (full detail) — both `requireAuth`, own router mounted at `/me/orders` matching every other `/me/*` resource's style. Ownership is baked directly into each query's own filter (`{userId, code}`), not a separate check — an order belonging to a different user 404s exactly the same as a code that doesn't exist at all, matching `addresses.service.ts`'s own `getOwnAddress` precedent, never leaking whether a given code is real. The real `OrderStatus` enum (deliberately deferred in `packages/schemas` at P6.S5's own kickoff, "belongs with whichever future Phase 7 step builds my orders") lands here, alongside real list/detail DTOs. Both pages (`/orders`, `/orders/[code]`) are pure Server Components with a **server-side** auth gate (`redirect()` to `/auth/login?next=...` off a 401, forwarding the incoming request's own cookies into the fetch — same cookie-forwarding pattern P6.S1 established) rather than `/checkout`'s own client-side gate — a deliberate difference, not an inconsistency: this page needs zero client interactivity (plain prev/next links, same shape `/search` already uses), so there's no reason to ship any client JS just for an auth check the way `/checkout`'s real interactive form justified doing client-side. The header's signed-in account icon (previously a decorative, non-interactive `<span>`) is now a real link into `/orders` — the natural first entry point into the account area now that there's a real page to send it to. | **A real design choice, not an oversight**: the status timeline (`statusHistory`) renders as a plain evidence-shaped list with a hairline connector (`border-s-2`, logical not physical per CLAUDE.md rule 6), matching the Authenticity panel's own established aesthetic (§3.5: "not a glowing badge") rather than a decorative stepper component — this codebase has no `Timeline`/`Stepper` primitive, and inventing one for a single consumer would be premature generality. Verified live (Playwright, ad hoc `e2e/_verify-orders.spec.ts` + a throwaway seed script, both deleted after passing): the list shows both seeded orders newest-first with real status/date/total, the detail page shows items/discount/address/tracking code and a real four-entry timeline, an unauthenticated visit redirects to `/auth/login?next=/orders`, another user's real order code correctly 404s, axe 0 violations light/dark on both pages, and a fresh production build's API-down smoke test serves graceful 200s on both routes. 401/401 backend tests (7 new). Route budgets: `/orders` and `/orders/[code]` both 111KB First Load JS — pure Server Components, no client bundle added, confirming the server-side-gate choice paid off. |
| **P7.S2** ✅ | **Address book page — real add/edit/delete.** Owner's second Phase-7 pick (over wishlist/My-Garage pages) — the one of the three with genuinely zero standalone UI (checkout's own picker, P6.S6, only ever supported list+create; edit and delete existed in the backend since P6.S2 but had no frontend consumer at all). No backend changes this step — `PATCH`/`DELETE /me/addresses` already existed complete; this step is purely `apps/web`. The province→city cascade form was **extracted**, not duplicated: `AddressForm` moved out of `checkout/AddressPicker.tsx` into a shared `components/addresses/AddressForm.tsx` with a `mode: "create" \| "edit"` prop, and `AddressPicker` now imports the shared version (zero behavior change for checkout, confirmed by its own unchanged tests). New `components/addresses/AddressBookContent.tsx` lists every saved address with inline edit (replaces the row with the shared form, pre-filled) and delete (immediate, no confirmation dialog — matches the cart's own established "remove item" precedent, no confirmation-modal pattern exists anywhere else in this codebase to justify inventing one here). Unlike `/orders`' server-side gate, `/addresses` uses the **client-side** gate `/checkout` already established (`useAuthStore` status + `router.push`) — this page is inherently interactive (add/edit/delete), so it gains nothing from being a Server Component the way `/orders`' purely-read-only page did. A new shared `components/account/AccountNav.tsx` (a plain Server Component, no client JS — `active` is passed statically per-page rather than computed via `usePathname()`) gives `/orders` and `/addresses` real cross-navigation, now that a second account page actually exists to link to — P7.S1's own "defer a nav hub until there's more than one page" note explicitly anticipated this moment. | **A real, unrelated policy correction landed mid-step**: the owner confirmed directly that the business won't sell in English — see `docs/decisions/0016-english-locale-suspended.md`, a documentation-only amendment (masterPlan.md §7/§14/§17 updated) that happened to surface a real, forgotten consequence: `apps/web/messages/keys.test.ts` (P1.S4) was a genuine automated test asserting `fa.json`/`en.json` key parity, citing §7.1 by name — it failed on this step's very first `fa`-only commit, the first real proof the suspension decision needed a code change, not just a doc one. Deleted outright (the policy it tested no longer exists), not skipped. This step itself ships Persian-only, no `en.json` keys added, no `en`-locale verification run — matching the new policy from its first real step. Verified live (Playwright, ad hoc `e2e/_verify-addresses.spec.ts` + a throwaway seed script, both deleted after passing): add → edit → delete round-trips correctly end to end, an unauthenticated visit redirects to `/auth/login?next=/addresses`, cross-navigation between `/orders` and `/addresses` works both directions, axe 0 violations light/dark with the add form open. 400/400 backend tests (unchanged — no backend surface added). `/addresses` route: 141KB First Load JS. |

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
- [ ] All strings in `messages/fa.json` (real Persian, never lorem/placeholder). `en.json` parity **not required as of 2026-07-30** — §7's own callout, English deferred to a future phase.
- [ ] All colors/spacing/type from tokens
- [ ] Server Components by default; every `'use client'` justified in a comment
- [ ] API inputs Zod-validated; lists paginated
- [ ] Money as integer Rial; dates UTC + Jalali display formatter
- [ ] `pnpm lint && pnpm test && pnpm build` all pass
- [ ] Performance budget respected for touched routes
- [ ] Committed with the correct tag and **pushed to `development`**
- [ ] STEP COMPLETE block emitted (§0)

---

## 15. Open questions

Re-audited against real repo state for v1.6 (some of these were quietly resolved by later decisions; some are now genuinely urgent, not "someday" — status column added rather than leaving this list to keep drifting).

| # | Question | Status |
|---|---|---|
| 1 | TypeScript or plain JavaScript? | **Resolved v1.1** — TypeScript, strict. See changelog. |
| 2 | Brand name and logo — is it "پارسیان" / ParsianStore, does a mark exist? | **Half-resolved.** Name confirmed, used everywhere. **No logo mark exists** — every rendering is the text wordmark in Estedad, no SVG/image asset anywhere in `apps/web/public`. Not blocking so far (nothing has needed one), but will block anything that needs a square/favicon-shaped mark (PWA icon, social share image, e-Namad seal placement next to a brand mark). Worth asking before Phase 9 (SEO/OG images) at the latest. |
| 3 | Legal entity + e-Namad status — started or not? | **Answered 2026-07-29 (end of P5.S8), per this row's own instruction to ask before this step wraps.** Owner confirmed: **not started.** This remains a real external blocker for Phase 6 going live with a real gateway — development proceeds on `mock` + Zarinpal sandbox regardless (§11), but the paperwork itself needs to start now, off the critical path of engineering work. |
| 4 | Catalog source — supplier CSV, scrape, or manual entry? | **Resolved in practice.** Phase 8's admin scope already commits to "CSV/Excel bulk import"; today's seed data is synthetic (for dev/test), and the real launch catalog path is manual entry + bulk CSV import, not scraping. No document change needed, just confirming this one didn't get lost. |
| 5 | Payment gateway preference — Zarinpal, Zibal, IDPay, or a bank PSP? | **Resolved 2026-07-29 (end of P5.S8).** Owner chose **Zarinpal.** `.env.example` still defaults `PAYMENT_PROVIDER=mock` for now (no code change needed until Phase 6's real integration step); this just settles which gateway Phase 6 builds against. |
| 6 | SMS provider — Kavenegar, SMS.ir, or Ghasedak? | **Partially resolved, still needs a final pick.** `KavenegarProvider` was built alongside `MockSmsProvider` in P2.S4 (the interface has a real, non-mock implementation ready) — but `.env.example` still defaults `SMS_PROVIDER=mock`, so this hasn't been *activated* for real OTP delivery. Low urgency until closer to launch (Phase 10), but Kavenegar is the de facto current answer unless told otherwise. |
| 7 | Hosting target — Liara, ArvanCloud, or own VPS? | **Still open.** Affects Phase 9 (caching/ISR strategy — differs by host) and Phase 10 (deployment runbook) more than anything sooner. Not urgent yet; revisit at the start of Phase 9. |
| 8 | Do we sell to mechanics at wholesale prices (B2B pricing tiers)? | **Resolved 2026-07-29 (end of P5.S8): yes.** Owner confirmed tiers are needed and explicitly chose the honest path — **a real schema migration against the live `Product` model**, not a silent bolt-on. Scheduled as **P6.S1**, the first step of Phase 6, ahead of any checkout/pricing logic that would otherwise assume a single price. See the Phase 6 callout in §13 for the scheduling note; the field shape itself is deliberately not guessed here — re-spec at P6.S1 kickoff per §16. |

**Practical read:** #3, #5, and #8 were the three gating upcoming work (Phase 6) — all three answered directly with the owner at the end of P5.S8, per this table's own instruction. #2 is worth a quick answer whenever convenient — cheap now, expensive if discovered as a surprise later (e.g. at Phase 9's OG-image work). #6 and #7 can wait until their respective phases.

---

## 16. Amendment rules

This document changes only by explicit human instruction. When it changes:

1. Bump the version at the top.
2. Log the change in `docs/decisions/` as a dated ADR: context → decision → consequences.
3. Commit as `docs(repo): [PLAN] <what changed>`.

Phases 6–10 will be re-specced in the same depth as Phases 0–4 (and now Phase 5, §13) before they execute. **Do not execute a phase from its summary paragraph alone.**

---

## 17. Engineering conventions established in practice

Not new rules — these are patterns that emerged solving real problems across Phases 2–5, written down once here instead of staying scattered across commit messages and code comments where the next agent (or the next session) would have to re-derive them from git history. When a new step's problem shape matches one of these, reach for the established pattern before inventing a new one.

**Resolve a Mongoose reference with a separate query, never `.populate()`.** No file in this codebase calls `.populate()` — every cross-collection lookup (`getFittingProductIds`, `hydrateFacetBuckets`, `getProductDetailBySlug`'s brand/category/attribute resolution) is a second explicit query, usually batched with `Promise.all`. Keeps the query shape visible at the call site and avoids populate's schema-coupling and N+1 footguns. Stay consistent with this — don't introduce populate as a "simpler" alternative partway through.

**The tri-state fetch result, not a bare nullable.** Any server-side fetcher whose failure modes need different UI (`lib/fetchers/*.ts`'s `FetchResult<T>`) returns `{ ok: true, data } | { ok: false, reason: "not-found" | "down" }`, never a plain `T | null` — a 404 and an outage are different states with different correct UI (`notFound()` vs. a graceful degraded page), and collapsing them into one falsy value is how P4.S5's real "API-down crash" bug happened in the first place. Fetchers backing secondary/non-critical content (facets, child categories, related products) can still degrade to a bare `[]`/`null` — that distinction (primary content vs. nice-to-have) is the actual decision to make per fetcher, not "always use FetchResult" or "never bother."

**"OR-facet" counts for any faceted filter UI.** When a filter bar shows counts next to each option ("Bosch (12)"), compute each dimension's bucket by excluding *only that dimension's own* currently-applied filter, keeping every other active filter. Otherwise selecting a brand collapses every other brand's count to zero — the exact bug caught and fixed building P5.S1's facets (`MongoSearchProvider.getFacets`).

**Ask before fabricating content, every time, not just for the obvious cases.** Established repeatedly, not once: P4.S4's "best sellers" (no real ranking existed → relabeled honestly rather than invent one), P4.S5's "numbers" section (only real counters shown), P5.S2's Q&A/reviews (no model exists → deferred, asked rather than building an empty shell). The test that's held up every time: if rendering something would require a number, ranking, or claim with no real data source behind it, stop and ask rather than pick the "least fake" placeholder.

**A route's own budget, measured against a real production build.** `pnpm build && pnpm start`, never dev mode — dev mode numbers and Lighthouse's simulated-throttling numbers have both been caught giving misleading readings during this project (P4.S7's investigated LCP discrepancy). `next/dynamic(..., { ssr:false })` only excludes a chunk from the initial bundle when the component's rendering is actually gated on user interaction or a real conditional — a component that renders unconditionally on mount still ships its JS even when wrapped in a bare `dynamic()` without `ssr:false` (P4.S3's react-query lesson, reapplied deliberately in P5.S1's `LoadMoreProductsLazy`). Never import a `dynamic(...,{ssr:false})` component through a shared barrel other unrelated routes also import from — the barrel's module-level evaluation drags the lazy chunk into every consumer (P4.S5's `components/motion` barrel lesson).

**Locale files: identical key sets, verified by diffing the trees, not by eye.** Every step that touched `messages/fa.json`/`en.json` through P7.S1 got a quick `node -e` key-diff check before commit. **Suspended 2026-07-30** per the owner's direct instruction (§7's own callout) — English isn't part of the business plan, so new steps write `fa.json` only and skip this check; `en.json` is left as-is, not actively maintained, until English support is picked up for real as its own future, lowest-priority item.

**`EmptyState`'s `titleAs` prop: `"h1"` only when the component IS the entire page.** Default (`"p"`) is correct when a heading already exists elsewhere on the page (e.g. the PLP's "no results" state, under the category-name `<h1>`). A standalone 404 or API-down page has no other heading — axe's `page-has-heading-one` catches the gap for real if this is missed (found building P5.S1/S2's not-found pages).

**Provider interfaces get a mock first, always.** `PaymentProvider`, `SmsProvider`, `StorageProvider`, `SearchProvider` — every one of them shipped with a working mock/local implementation before (or instead of) a real external integration, per §11's own rule. This is why Phases 2–5 never blocked on an external account. Keep doing this for whatever Phase 6+ needs next.

**A field only some viewers should see: `select: false` on the schema, resolve-and-strip at one shared serialization point, never a second wire-format field.** `User.passwordHash` established this first; P6.S1's `Product.wholesalePriceRial` follows the identical shape: never present on a query result unless a service explicitly opts in with `.select("+field")`, and the raw field is never spread into an API response — `modules/catalog/pricing.ts`'s `toPublicProductJson` strips it and substitutes an already-resolved value (`priceRial` becomes the viewer's effective price, plus a server-computed boolean flag) so the wire contract itself has no way to leak the sensitive number, even if a future call site forgets a check. Reach for this whenever a new field's visibility depends on who's asking, rather than adding an ad hoc `if (isAdmin) ...` branch at each read site.

**A Server Component's own `fetch()` has no browser cookie jar — forward cookies explicitly when the response depends on who's asking.** `credentials: "include"` is what a *client-side* fetch needs for a cross-origin cookie to ride along (already established by cart/auth/wishlist's fetchers); it does nothing for a `fetch()` running server-side during SSR, which has no ambient cookie store at all. P6.S1 hit this for real: PDP/PLP/search are Server Components, and without `(await cookies()).toString()` (from `next/headers`) threaded explicitly into `lib/fetchers/catalog.ts`'s calls, a real signed-in wholesale account would have silently seen the retail price everywhere except cart (whose mutations happen via genuine client-side fetches) — invisible to integration tests, which hit the API directly with an explicit cookie header rather than through a real Next.js SSR request. Caught only by an actual Playwright run against the live dev server with a real session cookie, not by curl or the automated suite. Any future Server Component whose *content itself* (not just an interactive widget) depends on the viewer's auth state needs this same explicit forwarding — don't assume moving the auth-dependent part to a small client component is always the right fix (it was for AddToCartForm/WishlistButton/FitmentBanner because those are small interactive widgets; it would have meant a client-side price flash/layout-shift for something that's core page content).

**`z.coerce.boolean()` is a footgun for a boolean env var — never use it.** `Boolean("false")` is `true` in JavaScript (any non-empty string is truthy), so `z.coerce.boolean()` on `ZARINPAL_SANDBOX=false` would silently parse to `true`. Caught before shipping, at P6.S3 — this file's env schema had zero boolean env vars before that step, so there was no existing wrong example to copy, but the next one to add should reach for an explicit `z.enum(["true","false"]).transform((v) => v === "true")` instead, not the naive coerce.

**Mongoose document middleware (`pre("save")`) does not fire for query-based writes.** `findOneAndUpdate`, `updateOne`, `updateMany`, and `insertMany` are all *query* middleware — a different hook category entirely from `.save()`/`.create()`. A real, significant bug this caused: `seed/catalog.ts` upserts every product via `findOneAndUpdate` (the right choice for idempotent seeding), which silently skipped `Product`'s `pre("save")` hook that computes `searchText` — every one of the 320 seeded products had an **empty** `searchText` field, so both the `$text` and substring-regex legs of `MongoSearchProvider` found nothing against real data. Invisible in P3.S4's unit tests (they use `.create()`, which does trigger the hook) and invisible until P5.S3 actually queried the real seeded catalog through `/catalog/search`. Fixed by extracting the computation into an exported `computeProductSearchText()` and calling it explicitly wherever a query-based write needs it (`seed/catalog.ts` now does). **Apply this checklist to any future query-based bulk write** (Phase 8's admin bulk import is the next place this will matter): does the model have a `pre("save")` hook computing a derived field, and does this write path bypass it?

---

## 18. Ideas under consideration — not committed scope

Per §16, this document changes only by explicit instruction — nothing in this section is scheduled into any phase. These are concrete, market-grounded ideas worth having on record for when there's a real conversation about them, not generic e-commerce filler. Each ties to something already true about this specific product (the two-customer thesis in §1.1, the Authenticity Record in §3.5, the Garage in §3.4) rather than being bolted on from outside.

- **Fitment certificate (PDF).** The Garage + `/fitment/check` + Authenticity Record already produce everything needed for a one-page "این قطعه برای پراید ۱۳۱ شما تأیید شده" PDF a buyer could show a mechanic — directly answers §1.2's identified market gap ("authenticity guarantee is a static image, not evidence") with a physical artifact, not just a webpage badge.
- **A "Pro" density toggle on the PLP/PDP.** §1.1's second customer (The Mechanic) wants raw search speed and visible part numbers, not card-grid browsing. A toggle that swaps the consumer card grid for a dense table (OEM code, brand, stock, price as columns) serves that persona directly without building a second app — same data, different `ProductCard`/table component behind one Zustand-persisted preference.
- **Crowdsourced fitment corrections.** §3.7 already plans a "conflict detector" (same OEM number mapped to incompatible vehicle sets) — a lightweight "این قطعه برای خودروی من مناسب نبود" report button on a completed order feeds that same detector with real signal, rather than only catching conflicts an admin happens to notice.
- **Counterfeit reporting flow.** The Authenticity Record is a named differentiator (§3.5) — a "گزارش مشکوک به تقلبی" flow (photo + order reference) turns the static guarantee into an active trust loop, and doubles as real content for the counterfeit-identification SEO guides §5 item 12 and §9 already call for.
- **Maintenance-interval nudges per saved vehicle.** "My Garage" (§3.4) currently only drives fitment filtering. Attribute data already modeled on `Product` (and category/system data) could support a simple "پراید ۱۳۱ شما — لنت ترمز معمولاً هر ۴۰,۰۰۰ کیلومتر" reminder surface in the Phase 7 dashboard — turns the Garage from a one-time filter into a reason to come back.
- **Repair-job bundles.** A handful of real, common jobs (brake pad replacement = pads + wear sensor + cleaner spray) as curated multi-product bundles — increases average order value using data the catalog already has (category + attributes), no new modeling required.
- **Telegram bot for order status.** Telegram's reach in Iran specifically (beyond generic "add a chatbot" advice) makes an order-status/reorder bot a genuinely higher-leverage channel here than it would be in most markets — complements the phone-first, WhatsApp-support posture §1.2/§5 already commit to, rather than competing with it.
