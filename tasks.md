# ParsianStore — Remaining Work Checklist

Snapshot as of 2026-08-06. Only what's left — shipped work lives in
`masterPlan.md` §13. Regenerate/update this file rather than letting it
drift; it's a review artifact for the owner, not a second source of truth.

## Blockers / quick wins

- [x] **`packages/schemas` compiled build-output gap** — fixed 2026-08-04.
      The package now emits `dist/` (`tsconfig.build.json`, NodeNext) and its
      `main`/`types`/`exports` point there; `turbo`'s `dev` task gained
      `dependsOn: ["^build"]`, and vitest keeps resolving `src/` so tests
      never run against a stale artifact. `node dist/server.js` verified
      live against real MongoDB. See `docs/decisions/0024-schemas-build-output.md`.
- [x] **Seed a superadmin account** — done; `ADMIN_SEED_PHONE` is set in
      `apps/api/.env` and a superadmin exists.
- [ ] **Design-quality pass on shipped Phase 5-7 pages** — started 2026-08-06.
      The account-shell slice is shipped: `/orders`, `/orders/[code]`, and
      `/addresses` now use the shared docket primitives and stronger responsive
      hierarchy; the four account routes share a scroll-safe navigation shell.
      Storefront, cart, and checkout pages still need their own pass before this
      backlog item can be marked complete.

## Cross-agent handoff — 2026-08-06

Codex completed the first dedicated design-quality slice from Claude's staged
work. Maintained changes are limited to the account pages/navigation, address
cards, `Sheet` heading semantics, and Persian order-detail labels. Throwaway
seed/session scripts and the ad hoc Playwright verifier were removed after use.
Checks: `pnpm lint` passed; `pnpm test` passed 609/609 against an isolated local
MongoDB; `pnpm build` passed. Continue the design backlog with the storefront,
cart, and checkout as separate reviewable slices; do not redo this account slice.

## Phase 5 — Storefront backlog

- [ ] **P5.S4** Brand pages (`/brand/[slug]`) — reuse PLP filter/grid
      machinery scoped to one brand; decide facet scope for v1.
- [ ] **P5.S5** Vehicle landing pages (`/vehicle/[make]/[model]/[gen]`)
      — real per-vehicle SEO content, not a thin filtered list; decide
      generate-all vs. only-covered-combinations.
- [ ] **P5.S6** Compare (up to 4 parts) — pure frontend, no backend
      work needed; decide URL-encoded state vs. Zustand store.

## Phase 7 — User dashboard (remaining)

- [ ] Dashboard overview/home page (account landing, currently `/orders`
      is the de facto entry point — no real overview exists)
- [ ] Wallet (named Phase 7 scope, no model built yet)
- [ ] Reviews / Q&A (no `Review`/`Question` model exists; `Product.rating`
      is always 0/0 — zero trust signal on any PDP)
- [ ] Support tickets (customer-facing)
- [ ] Profile page (edit name/phone, notification preferences)

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
- [ ] Admin: Product media manager + variants
- [ ] Admin: CSV/Excel bulk import for products
- [ ] Admin: Refunds + invoices (needs `PaymentProvider.refund()`,
      explicitly deferred at P8.S1)
- [ ] Admin: Payments reconciliation view
- [ ] Admin: Content management (banners, sliders, menus, pages, blog)
- [ ] Admin: Review/Q&A moderation queue
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
- [ ] Live payment gateway + e-Namad seal (external legal paperwork not
      yet started — see below)
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
