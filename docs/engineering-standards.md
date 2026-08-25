# Engineering standards — ParsianStore

Written 2026-08-26. The rules an agent or a person follows when adding to this
codebase, and the reasoning behind each one so a future change can argue with it
rather than guess at it.

This file is **not** a replacement for `masterPlan.md` (the product and phase
plan) or `CLAUDE.md` / `AGENTS.md` (the non-negotiables both AI collaborators
load every session). It is the layer underneath those: *how the web app is built*
— where a piece of state lives, and what "current" means for a 2026 storefront.

Where this document and `CLAUDE.md` disagree, `CLAUDE.md` wins and this file is
wrong and should be fixed.

---

## Part 1 — Where state lives

The single decision that shapes a React codebase is **who owns this data**. Get
it wrong and you spend the rest of the project synchronising two copies of the
same truth. Every option below already exists in this repo; the point of this
section is that the choice stops being ad hoc.

### The decision table

Read top to bottom and stop at the first row that matches.

| # | If the data… | It lives in | Example here |
|---|---|---|---|
| 1 | is owned by the server and the page can render without interaction | **Server Component `fetch`** | catalogue, PDP, brand and vehicle pages, the whole landing page |
| 2 | should survive a copied link, a refresh, or a back button | **URL search params** | `/search?q=`, PLP filters, `/compare?items=` |
| 3 | is owned by the server but a client leaf must read or mutate it | **Zustand store as a *cache*, re-fetched from the API** | `cart-store`, `wishlist-store`, `auth-store` |
| 4 | is owned by the *browser*, and the server has no opinion about it | **Zustand + `persist`** | `garage-store` (the vehicles you saved) |
| 5 | is owned by the browser **and the server must read it to render** | **Zustand + `persist` + a cookie mirror** | `garage-store`'s active vehicle |
| 6 | is a client-side form with server validation | **TanStack Query mutation** or a Server Action | `AddressForm`, `VehicleSelector` |
| 7 | is ephemeral UI that dies with the page | **`useState`**, or Zustand if two distant components share it | open/closed panels; `toast-store` |

### Rule 1 — Server Components are the default, and `'use client'` goes as low as it can

A page is a Server Component that fetches and renders. When one button needs an
`onClick`, that *button* becomes the client leaf — not the page.

This is the single highest-leverage rule in the file. It is why the landing
page's route JS is 190KB rather than several hundred, and why the hero's docked
composite renders correctly with JavaScript disabled.

Every `'use client'` in this repo carries a one-line comment saying what forced
it (`CLAUDE.md` §10). That comment is a debt marker: if the reason stops being
true, the directive should come off. P9.S5 part 2 did exactly that, and part 3
put it back with a new reason.

### Rule 2 — Never copy server state into a client store as the source of truth

`cart-store`, `wishlist-store` and `auth-store` all hold server data, and all
three are **caches** with the same three properties:

- re-fetched from the API on load; never seeded from `localStorage`
- never `persist`ed, so a stale cart cannot outlive a session
- the server's copy wins on every conflict

`auth-store` is the clearest case, and worth reading before writing a new store.
The session's truth is an httpOnly cookie the client cannot see at all. The store
caches *who the user is* for rendering, and `GET /auth/me` re-establishes it on
every load. If the store and the cookie disagree, the store is wrong.

**The anti-pattern this rule exists to prevent:** persisting a cart to
`localStorage` "so it survives a refresh". It already survives — the server has
it, keyed by the `anonId` cookie. A persisted copy only adds a way for the two to
diverge, and puts prices the shop no longer honours in front of a customer.

### Rule 3 — If it belongs in the URL, it goes in the URL

Filters, sort, pagination, the active tab, a search query, the compare set. A
piece of view state in the URL is shareable, bookmarkable, survives a refresh,
works with the back button, and is readable by a Server Component without any
client JavaScript. A `useState` equivalent has none of those properties.

`/compare?items=` is the model to copy.

### Rule 4 — `localStorage` is for browser-owned, non-critical, single-device data

Legitimate: which vehicles are in the Garage, a collapsed sidebar, a theme
override, an unsent draft.

Not legitimate: anything the server owns, anything a second device should see,
anything a customer would be hurt by losing, and **anything read during SSR**.

Two mechanical rules whenever it is touched:

1. **Every read and write goes in a `try`/`catch`.** Private windows, cleared
   site data and storage-blocking settings all make the accessor itself throw.
2. **Never read it during render.** It does not exist on the server, so a
   component that reads it while rendering hydrates differently than it
   server-rendered. Read it in an effect, or through Zustand's `persist`
   middleware, which handles the rehydration timing for you.

> **Known outlier, worth fixing:** `components/compare/CompareButton.tsx` talks
> to `localStorage` directly instead of going through a store, so it is the one
> place these guarantees are hand-rolled. It works; it is inconsistent. Fold it
> into a store when that file is next touched for another reason.

### Rule 5 — When the server has to know a client-owned value, mirror it into a cookie

`garage-store` is the worked example: the active vehicle is browser-owned (rule
4), but Server Components filter the catalogue by it, and a Server Component
cannot read `localStorage`. So it is persisted for the client *and* mirrored into
a cookie the server reads.

This is deliberate duplication with a clear owner — the client writes, the server
only reads — and it is the exception, not a licence to duplicate elsewhere.

### Rule 6 — TanStack Query for client-side server interaction; not as a second global store

It is already a dependency and already used for form-driven reads and mutations
(`AddressForm`, `VehicleSelector`). Use it when a client component needs
caching, retry, or mutation-with-invalidation.

Do not use it to hold client-owned state, and do not add a second data-fetching
library. Two caches for one API is how a codebase ends up unable to answer "is
this fresh?".

### Rule 7 — One store per domain, and say why in the file

Every store in `apps/web/stores/` opens with a comment explaining what it owns
and — critically — whether it persists and why. Match that. A reviewer must be
able to tell cache from truth by reading the top of the file.

---

## Part 2 — What "current" means for a 2026 storefront

Standards move. Each item below is either a measured budget this project already
holds itself to, or an external requirement with a source. Re-check the cited
ones yearly; they are the parts most likely to go stale.

### Performance — the numbers that are actually graded

Google's Core Web Vitals thresholds are unchanged for 2026, measured at the
**75th percentile of real visits**:

| Metric | Good | Poor beyond | Measures |
|---|---|---|---|
| **LCP** | ≤ 2.5s | > 4.0s | loading |
| **INP** | ≤ 200ms | > 500ms | responsiveness |
| **CLS** | ≤ 0.1 | > 0.25 | visual stability |

INP replaced FID and is the one most sites fail: it measures the *worst*
interaction, not the first. Long tasks on the main thread are what break it,
which is another argument for rule 1.

This project's own budgets (masterPlan §10) are tighter than the public
thresholds and are enforced per route. The landing page's last measured numbers
live in `docs/performance-landing.md` — **LCP 1.9s, CLS 0.032, TBT 130ms, route
JS 190KB against a 180KB budget** (knowingly over; the gap is the hero's scroll
stage).

Two rules that follow:

- **Every route has a JS budget and it is measured, not estimated.** A step that
  moves it says the old and new number in its commit body.
- **Images and video never cause layout shift.** Explicit `width`/`height` on
  every image, no exceptions. This is most of CLS.

### Accessibility — now a legal requirement, not a quality bar

The European Accessibility Act became enforceable in **June 2025**. The presumed
compliance standard is **EN 301 549, which currently incorporates WCAG 2.1 AA** —
so 2.1 AA is the operative legal benchmark today. **EN 301 549 v4.1.1 is expected
to publish during 2026 and incorporates WCAG 2.2**, adding nine success criteria.

This project already targets **WCAG 2.2 AA**, so the coming update should be a
no-op. Keep it that way.

Non-negotiables, all of which have caught real bugs here:

- **axe reports zero violations** on every page, in **both themes**, at 360 /
  390 / 1440. This is an e2e gate, not a manual check.
- **axe at zero is necessary, not sufficient.** P9.S17 found a WCAG 2.5.3
  (Label in Name) failure that the suite structurally could not see:
  `label-content-name-mismatch` is in axe's *experimental* set and off by default
  in `@axe-core/playwright`, while Lighthouse enables it. Run Lighthouse too.
- **Keyboard reachable with a visible focus ring on every stop.** Asserted by
  walking the tab order, not by eye.
- **`prefers-reduced-motion` is honoured and *tested*.** And it means *the
  correct final state*, which is not always "no transform" — see the hero, where
  clearing transforms would scatter the car.
- **Accessible name contains the visible label.** An `aria-label` that replaces
  rather than extends the visible text is a level-A failure.

### RTL — the rule this project breaks hardest if it slips

Persian is the primary locale, not a translation layer.

- **Logical properties only.** `ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`/
  `text-start`/`text-end`/`border-s`/`border-e`. ESLint enforces it; do not
  weaken or suppress the rule.
- **`dir="ltr"` is legitimate for objects, not for text.** The hero stage pins
  itself LTR because a car is a physical object whose parts do not mirror. A
  Latin identifier inside an RTL line needs the same isolation, or bidi reorders
  it — `@boyinshadows` renders as `boyinshadows@` without it. That bug shipped
  twice; both times the fix was `dir="ltr"` on the *value*, not the row.
- **Persian digits for display, Latin for machine-readable codes.** Enforced by
  a test over the whole message catalogue.

### Security

- **Every API input is Zod-validated at the boundary.** Types are inferred from
  the schema (`z.infer<>`), never hand-written alongside it.
- **Sessions in httpOnly cookies.** Never `localStorage` — an XSS then reads
  every session. This is why `auth-store` cannot see the token, and that is the
  design working.
- **A production CSP with per-request nonces**, no `'unsafe-inline'` in
  `script-src`. Plus HSTS, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, and a `Permissions-Policy`
  that switches off what the site does not use.
- **Rate limit credential endpoints, not session reads.** Getting this wrong
  bounced signed-in staff to the login screen (P8.S6): the admin layout reads
  `/me` server-side on every render, so a limiter covering it 429'd the eleventh
  page view. Limit what an attacker would hammer.
- **Never leak internals in an error message.** The envelope carries a
  user-facing Persian string; detail goes to the server log.

### Data and money

- **Money is an integer in Rial**, field names suffixed `Rial`, displayed only
  through `formatToman`. No float arithmetic on currency, ever.
- **Dates stored UTC ISO**, displayed only through `formatJalali`. A Jalali
  string is never persisted.
- **Every list endpoint is paginated**, `limit` capped at 100.
- **Snapshot what a customer agreed to.** Orders freeze price, variant and
  shipping at placement; a later catalogue edit must not rewrite history.

### Delivery hygiene

- **The gate is `lint → typecheck → test → build → clear `.next` → e2e`.**
  `pnpm typecheck` exists because `next build` does *not* type-check test files
  and ESLint does not type-check at all — a real error survived a fully green
  lint, test and build.
- **A commit says what it measured.** Byte counts, test counts, and the numbers
  that moved. "Improved performance" is not a claim, it is a mood.
- **Delete the flag when the reason expires.** Hidden sections carry named flags
  (`SECTION_HIDDEN`, and formerly `POLICY_COLUMN_HIDDEN`) rather than dead links,
  and the flag goes away when the thing it was waiting for arrives.

---

## Sources

Re-check these when the year rolls over.

- Core Web Vitals thresholds — [corewebvitals.io](https://www.corewebvitals.io/core-web-vitals),
  [Core Web Vitals 2026 guide](https://www.digitalapplied.com/blog/core-web-vitals-2026-inp-lcp-cls-optimization-guide)
- European Accessibility Act and EN 301 549 status —
  [Level Access, EU accessibility requirements](https://www.levelaccess.com/blog/eu-accessibility-requirements-and-eaa-compliance/),
  [EAA compliance guide](https://www.accessibilitychecker.org/guides/eaa-compliance/)
- WCAG versions — [W3C WAI, WCAG 2 Overview](https://www.w3.org/WAI/standards-guidelines/wcag/)
- Server vs client state in React 19 / App Router —
  [State Management with Next.js App Router](https://www.pronextjs.dev/tutorials/state-management),
  [Server state vs client state, 2026](https://nextfuture.io.vn/blog/react-server-state-vs-client-state-guide)
