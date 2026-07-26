# Database index strategy

Companion to `masterPlan.md` §3.2 (data models). That section lists the
required fields per collection; this doc records the *indexing*
conventions every model built from P2.S4 onward must follow, decided once
here rather than re-derived per model.

## Conventions (apply to every collection)

- **Soft delete (`deletedAt`):** `models/plugins.ts`'s `softDeletePlugin`
  already declares `deletedAt` with `index: true`. Every collection query
  filters on it by default (see the plugin's pre-find hook), so an index
  here is load-bearing, not optional — without it, every list/find query
  degrades to a collection scan as data grows.
- **Uniqueness lives on the schema, not just app logic.** Any field
  documented as "unique" in §3.2 (`User.phone`, `Product.slug`,
  `Order.code`, `Category.slug`, `Brand.slug`, `Setting.key`, …) gets
  `unique: true` on the schema path itself. The database is the last line
  of defense against a race condition an app-level check can miss.
- **TTL collections expire via Mongo, not a cron sweep.** `OtpToken`,
  `RefreshToken`, and `Cart` all carry an `expiresAt` field per §3.2 —
  each gets `{ expiresAt: 1 }` with `{ expires: 0 }` (a TTL index that
  expires exactly at the stored timestamp, since the expiry logic already
  computes the absolute time rather than a duration). `node-cron` (§4) is
  reserved for cleanup that TTL indexes can't express — e.g. cart
  *reservation* release, which touches `Product.stock` on expiry, not just
  deleting the `Cart` document.
- **Foreign-key-shaped fields (`*Id` references) are indexed** wherever a
  collection is routinely queried by that reference — e.g. `Fitment.productId`,
  `Review.productId`, `InventoryMove.productId`, `Order.userId`. Mongoose
  does not index `ref` fields automatically; it must be declared.

## Per-collection specifics called out in §3.2

- **`Fitment`**: compound index `(makeId, modelId, genId, yearFrom, yearTo)`
  — §3.2 names this explicitly, since `/fitment/check` (§9) is a hot path
  and a single-field index can't serve that query efficiently.
- **`Product`**: compound index on `(categoryId, brandId, status)` for the
  catalog listing filters (§9 `/catalog/products`); a separate text/normalized
  index on `searchText` lands with the `SearchProvider` in P3.S4, once the
  normalization function (`normalizeFa()`, §8.3) that populates it exists —
  indexing a field before its population logic exists would just index
  garbage.
- **`VehicleModel`/`VehicleGen`/`VehicleEngine`**: index on their parent
  reference (`makeId`, `modelId`, `genId` respectively) — the vehicle tree
  is always walked top-down (`/vehicles/models?makeId`, §9).
- **`City`**: compound index `(provinceId, slug)`, unique — same shape as
  `VehicleModel`'s `(makeId, slug)`. A city's slug only needs to be unique
  within its own province, and `/geo/cities?provinceId` (§9) always walks
  the geo tree top-down too.
- **`Category`**: `parentId` indexed (subcategory listings always filter by
  it, `/catalog/categories?parentId`, §9); `slug` unique per the
  conventions above. `systemCode` is a bounded ~10-value enum
  (`packages/schemas/catalogSystems.ts`), not indexed — filtering by it
  isn't a listed query path, and an index over 10 near-evenly-distributed
  values buys little.
- **`Attribute`**: `key` unique (it's `Product.attributes[].key`'s foreign
  reference in spirit, even though Product stores it by value rather than
  ObjectId — see §3.2's `Product.attributes[{key,value}]`).

## Why this is a doc and not code yet

P2.S2 ships the plugin layer (`deletedAt` indexing is real, applied via
`applyBasePlugins`) but not the models themselves — those land in P2.S4
(User/auth) onward, one phase/step at a time (P2.S4-S9, then P3.S1+). Each
model file declares its own schema-level indexes per the rules above when
it's actually written; this doc is the reference those steps implement
against, so the reasoning is recorded once instead of re-litigated per
collection.
