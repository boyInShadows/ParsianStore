# Database index strategy

Companion to `masterPlan.md` §3.2 (data models). That section lists the
required fields per table; this doc records the *indexing* conventions the
schema follows, decided once here rather than re-derived per model.

Rewritten at P10.S20, when the Mongo removal finished. The conventions
below are the PostgreSQL ones; where the Mongo version said something
different, the difference is called out, because most of them are not
opinions — they are things one database can do and the other cannot.

## Conventions (apply to every table)

- **Soft delete (`deletedAt`):** every soft-deletable model declares
  `@@index([deletedAt])`. It is load-bearing rather than optional, because
  the client extension in `config/prisma.ts` injects `deletedAt: null` into
  every read — the filter is on the hot path of literally every list query
  even though no query says so.
- **Uniqueness lives in the schema, not just app logic.** Anything
  documented as unique in §3.2 (`User.phone`, `Product.slug`, `Order.code`,
  `Category.slug`, `Brand.slug`, …) carries `@unique` or `@@unique`. The
  database is the last line of defence against a race an app-level check
  can miss.
  **With one class of exception, and it is worth understanding:** a plain
  unique counts soft-deleted rows. On a table whose rows are tombstoned
  rather than removed, that means deleting a row can make its own key
  permanently unusable. `ShippingRate` hit exactly this — deleting the
  "0–1000g" band made that band uncreatable forever — so its natural key is
  a plain index and `assertNoOverlap` in the service enforces something
  stricter. "Unique among live rows" is a partial index, which Prisma
  cannot declare and `migrate diff` would fight on every future migration.
- **Expiry is a scheduled sweep, not a database feature.** Mongo expired
  `OtpToken` and `StockReservation` with TTL indexes; PostgreSQL has no
  equivalent, so `jobs/inventoryCron.ts` deletes both on a schedule. The
  difference in stakes is worth knowing: an unswept OTP row is clutter,
  while an unswept reservation keeps stock off the shelf forever, since
  releasing one also restores `Product.stock`. Both `expiresAt` columns are
  indexed because the sweep queries them every minute.
- **Foreign keys are indexed** wherever a table is routinely queried by
  that reference — `Fitment.productId`, `Review.productId`,
  `InventoryMove.productId`, `Order.userId`. PostgreSQL indexes the
  *referenced* side (the primary key) automatically but not the
  referencing column, so this still has to be declared.

## Per-table specifics

- **`Fitment`**: compound index `(makeId, modelId, genId, yearFrom, yearTo)`
  — §3.2 names this explicitly, since `/fitment/check` (§9) is a hot path
  and single-column indexes cannot serve that query well.
- **`Product`**: `searchVector`, a `GENERATED ALWAYS … STORED` tsvector
  derived from `searchText`, with a GIN index. Configured `simple`, not a
  language dictionary: PostgreSQL ships no Persian configuration, and
  `simple` does no stemming, which is the honest behaviour rather than
  stemming Persian with English rules. `oemNumbers` carries its own GIN
  index for the exact-match search leg. `PostgresSearchProvider` runs the
  full-text query, a substring branch (for the prefix and partial-word
  queries full-text cannot do), and the OEM lookup, unioned by product id.
  Also indexed: `brandId`, `categoryId`, `status`.
  `utils/cursorPaginate.ts` keyset-paginates on `(sortField, id)`; the
  supported sorts are `createdAt` and `priceRial`, and adding a compound
  index for each is the next thing to do if the catalogue outgrows the
  planner's current choices.
- **`VehicleModel`/`VehicleGen`/`VehicleEngine`**: indexed on their parent
  reference (`makeId`, `modelId`, `genId`), since the vehicle tree is always
  walked top-down (`/vehicles/models?makeId`, §9). Each also carries the
  seed's natural key as a unique: `(makeId, slug)`, `(modelId, yearFrom)`,
  `(genId, code)`.
- **`City`**: unique `(provinceId, slug)` — a city's slug only needs to be
  unique within its province, and `/geo/cities?provinceId` walks the geo
  tree top-down too.
- **`Category`**: `parentId` indexed (subcategory listings filter by it);
  `slug` unique. `systemCode` is indexed despite being a ~10-value enum,
  because the storefront's system navigation filters by it directly.
- **`Attribute`**: `key` unique. A product's value for one is a
  `ProductAttributeValue` row referencing it, so the "foreign reference in
  spirit" the Mongo version described is now a real foreign key.
- **`Cart`**: `userId` and `anonId` are each unique — exactly one is set,
  and PostgreSQL does not consider two nulls equal, which is the same
  guarantee Mongo's sparse unique index gave. `findOrCreateCart` upserts on
  it, and two carts for one shopper would silently split their items.
- **`StockReservation`**: `expiresAt` indexed for the sweep, `productId`
  per the foreign-key convention.

## What generates the indexes

`prisma/schema.prisma` is the single source, and `prisma migrate` emits the
DDL. Two things in it are hand-written and must stay that way:
`Product.searchVector`'s generated-column definition, and the deliberate
*absence* of the shipping-band unique. Both are commented in the schema,
and `migrate diff` will keep suggesting the searchVector one back — see the
note on that field before applying any generated migration.
