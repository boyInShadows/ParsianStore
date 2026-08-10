# ParsianStore — Remaining Work Checklist

Snapshot as of 2026-08-10. Only what's left — shipped work lives in
`masterPlan.md` §13. Regenerate/update this file rather than letting it
drift; it's a review artifact for the owner, not a second source of truth.

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
8. [ ] Validated CSV product bulk import that preserves derived search fields.
9. [ ] Admin payment reconciliation view without live-gateway activation.
10. [ ] Admin reports and exports, followed by the full quality gate and push
        to `development`.

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
- [ ] Admin: CSV/Excel bulk import for products
- [ ] Admin: Refunds + invoices (needs `PaymentProvider.refund()`,
      explicitly deferred at P8.S1)
- [ ] Admin: Payments reconciliation view
- [ ] Admin: Content management (banners, sliders, menus, pages, blog)
- [x] Admin: Review/Q&A moderation queue — shipped 2026-08-10 at
      `/admin/feedback`, with status filters, approve/reject actions, question
      answers, audit logging, and automatic product-rating recalculation.
- [ ] Admin: Support tickets (staff side)
- [ ] Admin: Reports & exports
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
