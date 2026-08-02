# ParsianStore — Remaining Work Checklist

Snapshot as of 2026-07-30. Only what's left — shipped work lives in
`masterPlan.md` §13. Regenerate/update this file rather than letting it
drift; it's a review artifact for the owner, not a second source of truth.

## Blockers / quick wins

- [ ] **`packages/schemas` compiled build-output gap** — `apps/api`'s
      compiled `pnpm start` can't resolve the package's `.ts` source
      without `tsx`. Blocks a real production start; never yet exercised.
- [x] **Seed a superadmin account** — done; `ADMIN_SEED_PHONE` is set in
      `apps/api/.env` and a superadmin exists.
- [ ] **Design-quality pass on shipped Phase 5-7 pages** — owner rated
      recent UI 1/10; flagged backlog, never started as its own
      dedicated pass (`web/design-quality.md` checklist).

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
- [ ] Admin: Vehicle manager + Fitment Manager (§3.7)
- [ ] Admin: KPI overview / dashboard home (MUI X Charts)
- [ ] Admin: Product media manager + variants
- [ ] Admin: CSV/Excel bulk import for products
- [ ] Admin: Refunds + invoices (needs `PaymentProvider.refund()`,
      explicitly deferred at P8.S1)
- [ ] Admin: Customers list/detail
- [ ] Admin: Payments reconciliation view
- [ ] Admin: Shipping zones/rates config UI (today: seed script only)
- [ ] Admin: Content management (banners, sliders, menus, pages, blog)
- [ ] Admin: Review/Q&A moderation queue
- [ ] Admin: Support tickets (staff side)
- [ ] Admin: Reports & exports
- [ ] Admin: Staff RBAC (today: any staff role passes `requireStaff()`,
      no per-role permission granularity)
- [ ] Admin: Settings page
- [ ] Admin: Audit log viewer (writes already happen via `auditLog`
      middleware; no UI reads them back yet)

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
