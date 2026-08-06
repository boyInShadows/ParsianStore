# ADR 0026 — P5.S4 brand pages

**Date:** 2026-08-06
**Status:** Accepted and shipped

## Decision

Brand pages ship at `/brand/[slug]` as a brand-scoped reuse of the existing
catalog listing machinery. For v1 they expose only the essential facets:
category, price range, and in-stock status, alongside the existing sort and
cursor pagination. Brand and attribute facets are deliberately hidden because
the brand is already fixed by the route and the owner chose a cleaner v1 page.

The header uses only real Brand-model data: Persian/English name, country,
OEM status, optional description, and optional SEO fields. No story copy,
logo, rating, or claim is fabricated when the database does not provide one.

## Implementation notes

- `FilterBar` now supports category radio facets and hiding the brand/attribute
  dimensions without creating a second filter component.
- `ProductGrid` accepts a generic clear-filters URL, allowing category and
  brand listings to share the same empty-state behavior.
- The public brand schema now validates the trust fields already returned by
  the API. Empty Mongoose `seo` subdocuments are normalized to `{}` because
  seeded brands legitimately omit them from JSON.
- Server-side product reads forward the shopper cookie, preserving wholesale
  pricing exactly as the category PLP does.
- Live Zarinpal activation remains Phase 10 work. The owner reconfirmed that no
  production API credentials are available; P5.S4 does not touch payments.

## Verification

- `pnpm lint`
- `pnpm test` — 610/610
- `pnpm build` — `/[locale]/brand/[slug]` at 146 KB First Load JS
- Live Playwright: 360/1440 px, light/dark, axe 0 violations, real category
  filtering, and localized RTL not-found behavior
